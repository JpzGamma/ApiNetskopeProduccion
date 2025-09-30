import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ||
    "http://localhost:8001",
  withCredentials: false,
});

// Adjunta Bearer si existe (y asegura que headers exista)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

//Si el token expira, limpia y redirige a login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("access_token");
    }
    return Promise.reject(err);
  }
);

export default api;