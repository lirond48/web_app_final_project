const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/**
 * Exact paths that must never carry an Authorization header.
 * authService.ts already calls these with raw fetch(), but we guard here too
 * in case any call is accidentally routed through apiFetch.
 */
const PUBLIC_PATHS = ["/auth/login", "/auth/logout", "/auth/refresh", "/users"];

function isPublicEndpoint(url: string): boolean {
  try {
    return PUBLIC_PATHS.some((p) => new URL(url).pathname === p);
  } catch {
    // Relative URL fallback
    return PUBLIC_PATHS.some((p) => url === p);
  }
}

/**
 * Calls POST /auth/refresh with the stored refresh token.
 * On success, stores the rotated tokens and returns the new access token.
 * Returns null if the refresh token is missing, expired, or the server rejects it.
 */
async function attemptTokenRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    return data.accessToken as string;
  } catch {
    return null;
  }
}

/**
 * Authenticated fetch wrapper used by all protected API calls.
 *
 * Behaviour:
 * 1. Public endpoints (login, logout, refresh, register) are forwarded as-is.
 * 2. All other requests receive `Authorization: Bearer <accessToken>` from
 *    localStorage automatically — no need to set it in individual services.
 * 3. On a 401 response, a silent token refresh is attempted once.
 *    – If refresh succeeds the original request is retried with the new token.
 *    – If refresh fails the 401 response is returned to the caller.
 */
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  if (isPublicEndpoint(url)) {
    return fetch(url, init);
  }

  const token = localStorage.getItem("accessToken");
  const authedInit: RequestInit = {
    ...init,
    headers: {
      ...(init.headers as Record<string, string>),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  const response = await fetch(url, authedInit);

  if (response.status !== 401) {
    return response;
  }

  // 401 received — try a silent refresh and retry exactly once
  const newToken = await attemptTokenRefresh();
  if (!newToken) return response;

  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string>),
      Authorization: `Bearer ${newToken}`,
    },
  });
}
