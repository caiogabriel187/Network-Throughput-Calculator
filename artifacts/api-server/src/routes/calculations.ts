import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import { and, desc, eq } from "drizzle-orm";
import { db, calculationsTable, type CalculationRow } from "@workspace/db";
import { CreateCalculationBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

// ---------------------------------------------------------------------------
// Saved 5G NR calculations, persisted in PostgreSQL and scoped to the
// authenticated user. Every handler runs behind `requireAuth`, so a caller can
// only ever read or mutate rows whose `user_id` matches their session.
// ---------------------------------------------------------------------------

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toApi(row: CalculationRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    summary: row.summary,
    ...(row.notes ? { notes: row.notes } : {}),
    createdAt: row.createdAt.toISOString(),
  };
}

// Caps POST /calculations at 30 requests per IP per minute to resist
// write-flood abuse.
const postRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    title: "Muitas requisições",
    detail: "Tente novamente em alguns instantes.",
  },
});

const router: IRouter = Router();

router.get("/calculations", requireAuth, async (req, res) => {
  const rows = await db
    .select()
    .from(calculationsTable)
    .where(eq(calculationsTable.userId, req.user!.id))
    .orderBy(desc(calculationsTable.createdAt));
  res.json(rows.map(toApi));
});

router.post("/calculations", requireAuth, postRateLimit, async (req, res) => {
  const parsed = CreateCalculationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      title: "Dados inválidos",
      detail: parsed.error.issues.map((i) => i.message).join("; "),
    });
    return;
  }

  const { type, title, summary, notes } = parsed.data;

  // The generated schema only checks length before trimming, so reject
  // whitespace-only values to keep server validation in lockstep with the UI.
  const trimmedTitle = title.trim();
  const trimmedSummary = summary.trim();
  if (!trimmedTitle || !trimmedSummary) {
    res.status(400).json({
      title: "Dados inválidos",
      detail: "Título e resultado não podem ficar em branco.",
    });
    return;
  }

  const trimmedNotes = notes?.trim();
  const inserted = await db
    .insert(calculationsTable)
    .values({
      userId: req.user!.id,
      type,
      title: trimmedTitle,
      summary: trimmedSummary,
      ...(trimmedNotes ? { notes: trimmedNotes } : {}),
    })
    .returning();

  res.status(201).json(toApi(inserted[0]));
});

router.delete("/calculations/:id", requireAuth, async (req, res) => {
  const id = typeof req.params.id === "string" ? req.params.id : "";

  // A non-UUID id can never match a row; short-circuit to 404 and avoid a
  // Postgres "invalid input syntax for type uuid" error.
  if (!UUID_RE.test(id)) {
    res.status(404).json({ title: "Cálculo não encontrado" });
    return;
  }

  const deleted = await db
    .delete(calculationsTable)
    .where(
      and(
        eq(calculationsTable.id, id),
        eq(calculationsTable.userId, req.user!.id),
      ),
    )
    .returning({ id: calculationsTable.id });

  if (!deleted.length) {
    res.status(404).json({ title: "Cálculo não encontrado" });
    return;
  }

  res.status(204).end();
});

export default router;
