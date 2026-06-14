import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  setAuthTokenGetter,
  type AuthResponse,
  type User,
} from "@workspace/api-client-react";

const TOKEN_KEY = "@5gnr/auth_token";

// Cap how long the startup session check may block the app. If the API is slow
// or unreachable, we fall back to the logged-out state (calculators still work)
// instead of leaving the user stuck on the loading screen indefinitely.
const SESSION_RESTORE_TIMEOUT_MS = 8000;
const TIMEOUT_MARKER = "AUTH_RESTORE_TIMEOUT";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(TIMEOUT_MARKER)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// ---------------------------------------------------------------------------
// Token store
//
// The API client reads the bearer token synchronously before every request via
// the getter registered below. We keep the current token in a module-level
// variable (not React state) so the getter always sees the latest value,
// independent of React's render cycle. The token is persisted in AsyncStorage
// so the session survives app restarts; only the *server* stores a hash of it.
// ---------------------------------------------------------------------------
let currentToken: string | null = null;
setAuthTokenGetter(() => currentToken);

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  // Restore a persisted session on startup and validate it against the server.
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(TOKEN_KEY);
        if (!stored) {
          if (active) setStatus("unauthenticated");
          return;
        }
        currentToken = stored;
        const me = await withTimeout(
          getCurrentUser(),
          SESSION_RESTORE_TIMEOUT_MS,
        );
        if (!active) return;
        setUser(me);
        setStatus("authenticated");
      } catch (error) {
        if (!active) return;
        const timedOut =
          error instanceof Error && error.message === TIMEOUT_MARKER;
        // Always drop the in-memory token so no stale bearer is attached to
        // requests during this run. On a real auth failure the token is
        // missing/expired/invalid, so also drop the persisted copy. On a
        // timeout (slow/unreachable API) keep the persisted token so the
        // session can recover on the next launch.
        currentToken = null;
        if (!timedOut) {
          await AsyncStorage.removeItem(TOKEN_KEY);
        }
        setUser(null);
        setStatus("unauthenticated");
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function applyAuth(res: AuthResponse) {
    currentToken = res.token;
    await AsyncStorage.setItem(TOKEN_KEY, res.token);
    // Drop any cached data belonging to a previous session.
    queryClient.clear();
    setUser(res.user);
    setStatus("authenticated");
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signIn: async (email, password) => {
        const res = await loginRequest({ email, password });
        await applyAuth(res);
      },
      signUp: async (email, password) => {
        const res = await registerRequest({ email, password });
        await applyAuth(res);
      },
      signOut: async () => {
        try {
          await logoutRequest();
        } catch {
          // Best effort — clear the local session regardless of the result.
        }
        currentToken = null;
        await AsyncStorage.removeItem(TOKEN_KEY);
        queryClient.clear();
        setUser(null);
        setStatus("unauthenticated");
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  }
  return ctx;
}
