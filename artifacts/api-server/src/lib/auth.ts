import {
  randomBytes,
  scrypt as scryptCb,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

// scrypt cost parameters. N is the CPU/memory cost; 2^14 keeps hashing fast
// enough for an API while staying within Node's default 32 MB scrypt budget
// (128 * N * r = 16 MB here).
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

// Sessions live for 30 days, after which the client must log in again.
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Hashes a plaintext password with scrypt and a fresh random salt. The result
 * is a self-describing string `scrypt$N$r$p$salt$key` (all hex), so the cost
 * parameters travel with the hash and can be tuned later without breaking old
 * accounts.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scrypt(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString(
    "hex",
  )}$${derived.toString("hex")}`;
}

/**
 * A precomputed scrypt hash of a throwaway random password. Login verifies the
 * candidate password against this when the e-mail is unknown, so an unknown
 * account costs the same scrypt work as a known one. This closes the
 * timing-based account-enumeration channel. Computed once at startup.
 */
export const DUMMY_PASSWORD_HASH: string = (() => {
  const salt = randomBytes(SALT_BYTES);
  const derived = scryptSync(
    randomBytes(32).toString("hex"),
    salt,
    SCRYPT_KEYLEN,
    { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P },
  );
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString(
    "hex",
  )}$${derived.toString("hex")}`;
})();

/**
 * Verifies a plaintext password against a stored scrypt hash using a
 * constant-time comparison to avoid leaking information through timing. The
 * cost parameters are bounded so a malformed stored hash can never trigger
 * unbounded CPU/memory use (or throw) inside scrypt.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (
    !Number.isInteger(N) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    N < 2 ||
    N > 1 << 20 ||
    r < 1 ||
    r > 32 ||
    p < 1 ||
    p > 16
  ) {
    return false;
  }

  const salt = Buffer.from(parts[4], "hex");
  const expected = Buffer.from(parts[5], "hex");
  if (expected.length === 0 || expected.length > 256) return false;

  try {
    const derived = await scrypt(password, salt, expected.length, { N, r, p });
    return (
      derived.length === expected.length && timingSafeEqual(derived, expected)
    );
  } catch {
    return false;
  }
}

/** Generates an opaque, URL-safe session token to hand to the client. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Returns the SHA-256 hex digest of a token. Only this digest is persisted, so
 * a database leak never exposes a usable session credential.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
