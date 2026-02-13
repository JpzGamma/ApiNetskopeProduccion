// src/services/api.ts
import axios from "axios";

/**
 * MODOS SOPORTADOS
 * 1) Directo (recomendado si no hay proxy):
 *    .env => VITE_BACKEND_URL=http://10.1.10.195:8001
 *
 * 2) Proxy (Vite / Nginx):
 *    .env => VITE_USE_PROXY=true
 *    Las llamadas irán a baseURL="/api" y el proxy redirige al backend.
 */
const USE_PROXY = import.meta.env.VITE_USE_PROXY === "true";

// Si hay BACKEND_URL la usamos (sin slash final). Si no y hay proxy, usamos "/api".
const DIRECT_URL = import.meta.env.VITE_BACKEND_URL
  ? String(import.meta.env.VITE_BACKEND_URL).replace(/\/+$/, "")
  : undefined;

const baseURL = DIRECT_URL ?? (USE_PROXY ? "/api" : undefined);

// Keys de tokens
export const ACCESS_TOKEN_KEY = "access_token";
export const PENDING_2FA_TOKEN_KEY = "pending_2fa_token";

// Si no definiste ni BACKEND_URL ni proxy, avisamos (evita fallback a localhost).
if (!baseURL) {
  // eslint-disable-next-line no-console
  console.warn(
    "[api] No se encontró VITE_BACKEND_URL ni VITE_USE_PROXY=true. " +
      "Configura uno de los dos en tu .env."
  );
}

// Instancia axios
const api = axios.create({
  baseURL,
  withCredentials: false,
  timeout: 30000,
});

/**
 * Helper: obtiene el token FINAL (solo access_token)
 * - Importante: NO usar pending_2fa_token aquí, porque es temporal y puede romper llamadas protegidas.
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Helper: obtiene el token temporal para 2FA (solo para /auth/verify-2fa)
 */
export function getPending2FAToken(): string | null {
  return localStorage.getItem(PENDING_2FA_TOKEN_KEY);
}

/**
 * Helper: headers con token temporal 2FA
 * Úsalo únicamente cuando vayas a llamar /auth/verify-2fa
 */
export function authHeaderWithPending2FA() {
  const pending = getPending2FAToken();
  if (!pending) return {};
  return { Authorization: `Bearer ${pending}` };
}

/**
 * Helper: limpia tokens de sesión
 */
export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(PENDING_2FA_TOKEN_KEY);
}

/**
 * Request interceptor:
 * Adjunta Bearer SOLO si existe access_token
 */
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor:
 * Si el token expira (401), limpia tokens.
 * (Opcional) redirigir a /login.
 */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;

    if (status === 401) {
      clearAuthTokens();

      // Opcional: redirigir automáticamente al login.
      // Si prefieres manejarlo desde ProtectedRoute, deja esto comentado.
      // window.location.href = "/login";
    }

    return Promise.reject(err);
  }
);

export default api;
