import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError, setAuthToken, setUnauthorizedHandler } from "../api/client";
import type { TokenPair, UserProfile } from "../api/types";

const ACCESS_KEY = "warehouse.admin.access";
const REFRESH_KEY = "warehouse.admin.refresh";

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (login: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTokenRef = useRef<string | null>(null);

  function persistTokens(tokens: TokenPair) {
    localStorage.setItem(ACCESS_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
    refreshTokenRef.current = tokens.refresh_token;
    setAuthToken(tokens.access_token);
    setToken(tokens.access_token);
  }

  function clearTokens() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    refreshTokenRef.current = null;
    setAuthToken(null);
    setToken(null);
  }

  useEffect(() => {
    const storedAccess = localStorage.getItem(ACCESS_KEY);
    const storedRefresh = localStorage.getItem(REFRESH_KEY);
    if (storedAccess && storedRefresh) {
      refreshTokenRef.current = storedRefresh;
      setAuthToken(storedAccess);
      setToken(storedAccess);
    }
    setIsLoading(false);

    setUnauthorizedHandler(async () => {
      if (!refreshTokenRef.current) return null;
      try {
        const tokens = await api.post<TokenPair>("/auth/refresh", {
          refresh_token: refreshTokenRef.current,
        });
        persistTokens(tokens);
        return tokens.access_token;
      } catch {
        clearTokens();
        return null;
      }
    });

    return () => setUnauthorizedHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(login: string, password: string) {
    const tokens = await api.post<TokenPair>("/auth/sign-in", { login, password });
    setAuthToken(tokens.access_token);

    const profile = await api.get<UserProfile>("/users/me").catch(() => null);
    if (!profile || profile.role !== "admin") {
      setAuthToken(null);
      throw new ApiError(403, "У этого аккаунта нет прав администратора");
    }

    persistTokens(tokens);
  }

  function signOut() {
    clearTokens();
  }

  return (
    <AuthContext.Provider
      value={{ token, isAuthenticated: token !== null, isLoading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiError };
