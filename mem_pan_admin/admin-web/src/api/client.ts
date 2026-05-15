import axios from "axios";

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
