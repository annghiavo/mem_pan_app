import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach token from storage on every request
apiClient.interceptors.request.use((config) => {
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
apiClient.interceptors.response.use(
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
