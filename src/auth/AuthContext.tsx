import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { authService, LoginCredentials } from "../services/authService";

type User = { username: string; email: string; user_id: string };

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  user: User | null;
};

type AuthContextValue = AuthState & {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean }>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ✅ חשוב: init סינכרוני מ-localStorage (כדי ש-Feed לא יעשה redirect לפני שהספקנו לטעון)
function getInitialAuthState(): AuthState {
  const accessToken = localStorage.getItem("accessToken");
  const user_id = localStorage.getItem("user_id");
  const username = localStorage.getItem("username");
  const email = localStorage.getItem("email");

  if (accessToken && user_id && username) {
    return {
      isAuthenticated: true,
      isLoading: false,
      error: null,
      user: { user_id: user_id, username, email: email ?? "" },
    };
  }

  return { isAuthenticated: false, isLoading: false, error: null, user: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(() => getInitialAuthState());

  const login = useCallback(async (credentials: LoginCredentials) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authService.login(credentials);

      if (response.accessToken && response.user_id && response.username) {
        localStorage.setItem("accessToken", response.accessToken);
        localStorage.setItem("refreshToken", response.refreshToken);
        localStorage.setItem("user_id", response.user_id.toString());
        localStorage.setItem("username", response.username);
        localStorage.setItem("email", response.email);

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          user: { 
            username: response.username, 
            email: response.email, 
            user_id: response.user_id.toString() 
          },
        });

        return { success: true };
      }

      const msg = response.message || "Login failed";
      setAuthState((prev) => ({ ...prev, isLoading: false, error: msg }));
      return { success: false, error: msg };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "An unexpected error occurred";
      setAuthState((prev) => ({ ...prev, isLoading: false, error: msg }));
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user_id");
      localStorage.removeItem("username");
      localStorage.removeItem("email");

      setAuthState({ isAuthenticated: false, isLoading: false, error: null, user: null });
    }

    return { success: true };
  }, []);

  const clearError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  const value = useMemo(
    () => ({ ...authState, login, logout, clearError }),
    [authState, login, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
