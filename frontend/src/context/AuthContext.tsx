import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, setAuthToken } from "../api/client";
import type { TokenPair } from "../api/types";

const STORAGE_KEY = "warehouse.auth.token";

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setAuthToken(stored);
      setToken(stored);
    }
    setIsLoading(false);
  }, []);

  async function signIn(email: string, password: string) {
    const tokens = await api.post<TokenPair>("/auth/sign-in", { email, password });
    localStorage.setItem(STORAGE_KEY, tokens.access_token);
    setAuthToken(tokens.access_token);
    setToken(tokens.access_token);
  }

  function signOut() {
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setToken(null);
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
