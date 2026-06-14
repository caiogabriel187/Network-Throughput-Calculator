import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { hashToken } from "../lib/auth";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string; createdAt: Date };
      sessionTokenHash?: string;
    }
  }
}

/**
 * Authenticates a request from its `Authorization: Bearer <token>` header.
 * The token is hashed and looked up in the sessions table; on success the
 * resolved user is attached to `req.user`. Expired sessions are deleted and
 * rejected.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    res.status(401).json({
      title: "Não autorizado",
      detail: "Faça login para continuar.",
    });
    return;
  }

  const tokenHash = hashToken(token);
  const rows = await db
    .select({
      userId: usersTable.id,
      email: usersTable.email,
      createdAt: usersTable.createdAt,
      expiresAt: sessionsTable.expiresAt,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(eq(sessionsTable.tokenHash, tokenHash))
    .limit(1);

  const row = rows[0];
  if (!row) {
    res.status(401).json({
      title: "Não autorizado",
      detail: "Sessão inválida. Faça login novamente.",
    });
    return;
  }

  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, tokenHash));
    res.status(401).json({
      title: "Sessão expirada",
      detail: "Faça login novamente.",
    });
    return;
  }

  // Best-effort refresh of last_used_at; failures here must not block the request.
  void db
    .update(sessionsTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(sessionsTable.tokenHash, tokenHash))
    .catch(() => {});

  req.user = { id: row.userId, email: row.email, createdAt: row.createdAt };
  req.sessionTokenHash = tokenHash;
  next();
}
