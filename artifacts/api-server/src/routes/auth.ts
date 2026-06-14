import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import { eq } from "drizzle-orm";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  SESSION_TTL_MS,
  DUMMY_PASSWORD_HASH,
} from "../lib/auth";
import { requireAuth } from "../middlewares/auth";

// Caps brute-force / enumeration attempts on the credential endpoints.
const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    title: "Muitas tentativas",
    detail: "Aguarde um momento e tente novamente.",
  },
});

/**
 * Detects a Postgres unique-violation (SQLSTATE 23505). Drizzle wraps the
 * driver error in a DrizzleQueryError, so we walk the `cause` chain to find
 * the original pg error code.
 */
function isUniqueViolation(err: unknown): boolean {
  let current: unknown = err;
  while (current && typeof current === "object") {
    if ((current as { code?: string }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

function publicUser(user: { id: string; email: string; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

/** Creates a session row and returns the raw token to send to the client. */
async function issueSession(userId: string): Promise<string> {
  const token = generateToken();
  await db.insert(sessionsTable).values({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return token;
}

const router: IRouter = Router();

router.post("/auth/register", authRateLimit, async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      title: "Dados inválidos",
      detail: parsed.error.issues.map((i) => i.message).join("; "),
    });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const passwordHash = await hashPassword(parsed.data.password);

  try {
    const inserted = await db
      .insert(usersTable)
      .values({ email, passwordHash })
      .returning();
    const user = inserted[0];
    const token = await issueSession(user.id);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    // unique_violation (email already registered), including the race where two
    // concurrent registrations both pass any pre-check.
    if (isUniqueViolation(err)) {
      res.status(409).json({
        title: "E-mail já cadastrado",
        detail: "Use outro e-mail ou faça login.",
      });
      return;
    }
    throw err;
  }
});

router.post("/auth/login", authRateLimit, async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      title: "Dados inválidos",
      detail: "Informe e-mail e senha.",
    });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  const user = rows[0];

  // Always run scrypt — against the real hash, or a dummy one when the e-mail
  // is unknown — so the response time does not reveal whether the account
  // exists. Combined with the generic error below, this blocks account
  // enumeration through either the message or the timing.
  const ok = await verifyPassword(
    parsed.data.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );
  if (!user || !ok) {
    res.status(401).json({
      title: "Credenciais inválidas",
      detail: "E-mail ou senha incorretos.",
    });
    return;
  }

  const token = await issueSession(user.id);
  res.json({ token, user: publicUser(user) });
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  if (req.sessionTokenHash) {
    await db
      .delete(sessionsTable)
      .where(eq(sessionsTable.tokenHash, req.sessionTokenHash));
  }
  res.status(204).end();
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json(publicUser(req.user!));
});

export default router;
