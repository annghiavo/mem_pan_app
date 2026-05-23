import axios, { type AxiosInstance } from "axios";

// Empty string = use Vite dev proxy (same-origin, avoids CORS in dev)
// Set to full URL in production e.g. https://api.example.com
const ADMIN_API_BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL ?? "";
const AUTH_API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL ?? "";

if (ADMIN_API_BASE_URL === undefined || AUTH_API_BASE_URL === undefined) {
  throw new Error("Missing env variables VITE_ADMIN_API_BASE_URL / VITE_AUTH_API_BASE_URL (check your .env file)");
}

// Admin API client pointing to Admin Service
export const adminApi = axios.create({
  baseURL: ADMIN_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Auth API client pointing to Auth Service (for login)
export const authApi = axios.create({
  baseURL: AUTH_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach token from storage on every request to Admin API
adminApi.interceptors.request.use((config) => {
  // We'll read from localStorage since zustand persist stores it there
  const tokenData = localStorage.getItem("admin-auth");
  if (tokenData) {
    try {
      const parsed = JSON.parse(tokenData);
      const token = parsed.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error("Failed to parse admin-auth token", e);
    }
  }
  return config;
});

// Redirect to login on auth errors
adminApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Don't want to rely solely on window.location here as it forces reload,
      // but it's a fallback. Zustand logout is better, handled in App level or login page.
      localStorage.removeItem("admin-auth");
      if (window.location.pathname !== '/login') {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// --- API call logging (dev only) ---
const LOG_API = import.meta.env.DEV;

function redact(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    out[k] = /password|token|secret|authorization/i.test(k) ? "***" : redact(v);
  }
  return out;
}

function attachLogging(instance: AxiosInstance, name: string) {
  if (!LOG_API) return;
  instance.interceptors.request.use((config) => {
    const method = (config.method || "GET").toUpperCase();
    const url = `${config.baseURL || ""}${config.url || ""}`;
    console.log(
      `%c[${name} →] ${method} ${url}`,
      "color:#0a7;font-weight:bold",
      { params: config.params, data: redact(config.data) }
    );
    return config;
  });
  instance.interceptors.response.use(
    (res) => {
      const method = (res.config.method || "GET").toUpperCase();
      const url = `${res.config.baseURL || ""}${res.config.url || ""}`;
      console.log(
        `%c[${name} ←] ${res.status} ${method} ${url}`,
        "color:#06c;font-weight:bold",
        res.data
      );
      return res;
    },
    (error) => {
      const cfg = error.config || {};
      const method = (cfg.method || "GET").toUpperCase();
      const url = `${cfg.baseURL || ""}${cfg.url || ""}`;
      const status = error.response?.status ?? "NETWORK";
      console.error(
        `%c[${name} ✗] ${status} ${method} ${url}`,
        "color:#c33;font-weight:bold",
        error.response?.data ?? error.message
      );
      return Promise.reject(error);
    }
  );
}

attachLogging(adminApi, "AdminAPI");
attachLogging(authApi, "AuthAPI");
