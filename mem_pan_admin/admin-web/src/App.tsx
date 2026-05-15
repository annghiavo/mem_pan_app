import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/authStore";

import LoginPage from "./pages/LoginPage";
import ReportsPage from "./pages/ReportsPage";
import UsersPage from "./pages/UsersPage";
import DecksPage from "./pages/DecksPage";
import EmailTemplatesPage from "./pages/EmailTemplatesPage";
import ModeratorsPage from "./pages/ModeratorsPage";

import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.role);

  if (role && role !== "admin") {
    return <Navigate to="/reports" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/reports" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute><UsersPage /></PrivateRoute>} />
          <Route path="/decks" element={<PrivateRoute><DecksPage /></PrivateRoute>} />
          <Route
            path="/email-templates"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <EmailTemplatesPage />
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/moderators"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <ModeratorsPage />
                </AdminRoute>
              </PrivateRoute>
            }
          />

          <Route path="*" element={<Navigate to="/reports" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
