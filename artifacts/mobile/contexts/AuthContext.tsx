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
        const me = await getCurrentUser();
        if (!active) return;
        setUser(me);
        setStatus("authenticated");
      } catch {
        // Token missing / expired / invalid → start from a clean slate.
        currentToken = null;
        await AsyncStorage.removeItem(TOKEN_KEY);
        if (active) setStatus("unauthenticated");
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
