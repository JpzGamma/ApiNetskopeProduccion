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

// Si no definiste ni BACKEND_URL ni proxy, avisamos (evita fallback a localhost).
if (!baseURL) {
  // eslint-disable-next-line no-console
  console.warn(
    "[api] No se encontró VITE_BACKEND_URL ni VITE_USE_PROXY=true. " +
      "Configura uno de los dos en tu .env."
  );
}

const api = axios.create({
  baseURL,
  withCredentials: false,
  timeout: 30000,
});

// Adjunta Bearer si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el token expira (401), limpia y deja que el caller maneje la redirección
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("access_token");
      // aquí podrías redirigir a /login si lo deseas
      // window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;