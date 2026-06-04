import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { CreateCalculationBody } from "@workspace/api-zod";

type CalculationType = "throughput" | "link-budget";

interface Calculation {
  id: string;
  type: CalculationType;
  title: string;
  summary: string;
  notes?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Per-session in-memory store
//
// Each device generates its own opaque Bearer token (stored in AsyncStorage)
// and sends it on every request. The server uses that token as the session key
// so each caller only ever reads or mutates its own records.
// ---------------------------------------------------------------------------

interface SessionData {
  calculations: Calculation[];
  lastAccessedAt: number;
}

// Caps that bound memory growth regardless of attacker volume.
const MAX_RECORDS_PER_SESSION = 50;
const MAX_SESSIONS = 5_000;

const sessions = new Map<string, SessionData>();

function getOrCreateSession(token: string): SessionData {
  let session = sessions.get(token);

  if (!session) {
    // Evict the least-recently-used session when the global cap is reached
    // so the map stays bounded under sustained abuse.
    if (sessions.size >= MAX_SESSIONS) {
      let lruToken: string | null = null;
      let lruTime = Infinity;
      for (const [t, s] of sessions) {
        if (s.lastAccessedAt < lruTime) {
          lruTime = s.lastAccessedAt;
          lruToken = t;
        }
      }
      if (lruToken) sessions.delete(lruToken);
    }

    session = { calculations: [], lastAccessedAt: Date.now() };
    sessions.set(token, session);
  } else {
    session.lastAccessedAt = Date.now();
  }

  return session;
}

function sortedCalcs(calcs: Calculation[]): Calculation[] {
  return [...calcs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---------------------------------------------------------------------------
// Auth middleware — validates that the request carries a non-empty Bearer
// token. The token is the caller's session identifier; it is not validated
// against a server-side secret, so it carries no global privilege. Each
// unique token gives access only to that token's own data.
// ---------------------------------------------------------------------------

// Accepted token characters: hex, alphanumeric, hyphens, underscores.
const TOKEN_RE = /^[a-zA-Z0-9\-_]+$/;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      sessionToken?: string;
    }
  }
}

function requireSession(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    res.status(401).json({
      title: "Não autorizado",
      detail: "Token de sessão ausente. Inclua um header Authorization: Bearer <token>.",
    });
    return;
  }

  if (token.length > 128 || !TOKEN_RE.test(token)) {
    res.status(401).json({
      title: "Não autorizado",
      detail: "Token de sessão inválido.",
    });
    return;
  }

  req.sessionToken = token;
  next();
}

// ---------------------------------------------------------------------------
// Rate limiter — caps POST /calculations at 30 requests per IP per minute
// to resist write-flood memory-exhaustion attacks.
// ---------------------------------------------------------------------------
const postRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { title: "Muitas requisições", detail: "Tente novamente em alguns instantes." },
});

const router: IRouter = Router();

router.get("/calculations", requireSession, (req, res) => {
  const session = getOrCreateSession(req.sessionToken!);
  res.json(sortedCalcs(session.calculations));
});

router.post("/calculations", requireSession, postRateLimit, (req, res) => {
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

  const session = getOrCreateSession(req.sessionToken!);

  // Evict the oldest record when the per-session cap is reached.
  if (session.calculations.length >= MAX_RECORDS_PER_SESSION) {
    const oldestIndex = session.calculations.reduce(
      (minIdx, calc, idx, arr) =>
        calc.createdAt < arr[minIdx].createdAt ? idx : minIdx,
      0,
    );
    session.calculations.splice(oldestIndex, 1);
  }

  const calculation: Calculation = {
    id: randomUUID(),
    type: type as CalculationType,
    title: trimmedTitle,
    summary: trimmedSummary,
    ...(notes && notes.trim() ? { notes: notes.trim() } : {}),
    createdAt: new Date().toISOString(),
  };

  session.calculations.push(calculation);
  res.status(201).json(calculation);
});

router.delete("/calculations/:id", requireSession, (req, res) => {
  const session = getOrCreateSession(req.sessionToken!);
  const index = session.calculations.findIndex((c) => c.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ title: "Cálculo não encontrado" });
    return;
  }

  session.calculations.splice(index, 1);
  res.status(204).end();
});

export default router;
