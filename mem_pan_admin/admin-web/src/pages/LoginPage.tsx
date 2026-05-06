import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { loginUser, extractAccessToken, extractUserRole } from "../api/auth";
import { Lock, Mail, KeyRound, AlertCircle, ShieldCheck, ShieldX, Loader2 } from "lucide-react";

type MessageType = "error" | "warning" | "success";

interface StatusMessage {
  type: MessageType;
  text: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  const setToken = useAuthStore((s) => s.setToken);
  const setRole = useAuthStore((s) => s.setRole);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const data = await loginUser({ email: email.trim(), password });

      const accessToken = extractAccessToken(data);
      if (!accessToken) {
        setMessage({ type: "error", text: "Login succeeded but no token was returned." });
        setLoading(false);
        return;
      }

      // Check the role from the response body
      const role = extractUserRole(data) || "unknown";

      if (role !== "admin") {
        // Not an admin — notify and do NOT store the token
        setMessage({
          type: "warning",
          text: `Access denied. Your account role is "${role}". Only admin accounts can access this panel.`,
        });
        setLoading(false);
        return;
      }

      // Admin role confirmed — store token & role, then navigate
      setToken(accessToken);
      setRole(role);
      setMessage({ type: "success", text: "Welcome, Admin! Redirecting..." });

      setTimeout(() => navigate("/reports"), 600);
    } catch (err: unknown) {
      let errorMsg = "Unable to connect to the server. Please try again.";

      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
        const status = axiosErr.response?.status;
        const serverMsg = axiosErr.response?.data?.message;

        if (status === 401 || status === 403) {
          errorMsg = serverMsg || "Invalid email or password.";
        } else if (status === 404) {
          errorMsg = "Account not found. Please check your email.";
        } else if (serverMsg) {
          errorMsg = serverMsg;
        }
      }

      setMessage({ type: "error", text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  const messageStyles: Record<MessageType, { bg: string; border: string; color: string; icon: React.ReactNode }> = {
    error: {
      bg: "rgba(220, 38, 38, 0.08)",
      border: "rgba(220, 38, 38, 0.25)",
      color: "hsl(350, 70%, 60%)",
      icon: <AlertCircle size={18} />,
    },
    warning: {
      bg: "rgba(245, 158, 11, 0.08)",
      border: "rgba(245, 158, 11, 0.25)",
      color: "hsl(40, 90%, 55%)",
      icon: <ShieldX size={18} />,
    },
    success: {
      bg: "rgba(16, 185, 129, 0.08)",
      border: "rgba(16, 185, 129, 0.25)",
      color: "hsl(150, 60%, 50%)",
      icon: <ShieldCheck size={18} />,
    },
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at top, var(--bg-surface-hover), var(--bg-base) 60%)",
    }}>
      <div className="glass-panel animate-fade-in" style={{
        padding: "3rem",
        width: "100%",
        maxWidth: 420,
        boxShadow: "var(--shadow-lg)",
        textAlign: "center",
      }}>
        {/* Logo */}
        <div style={{
          width: 64, height: 64, borderRadius: "16px",
          background: "linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1.5rem",
          boxShadow: "0 8px 16px rgba(100, 108, 255, 0.4)",
        }}>
          <Lock size={32} color="white" />
        </div>

        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Admin Portal</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem", fontSize: "0.875rem" }}>
          Sign in with your admin account
        </p>

        {/* Status message */}
        {message && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            padding: "0.75rem 1rem",
            marginBottom: "1.25rem",
            borderRadius: "var(--radius-sm)",
            background: messageStyles[message.type].bg,
            border: `1px solid ${messageStyles[message.type].border}`,
            color: messageStyles[message.type].color,
            fontSize: "0.8125rem",
            fontWeight: 500,
            textAlign: "left",
            lineHeight: 1.4,
            animation: "fadeIn 200ms ease-out",
          }}>
            <span style={{ flexShrink: 0 }}>{messageStyles[message.type].icon}</span>
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Email field */}
          <div style={{ textAlign: "left" }}>
            <label style={{
              display: "block", fontSize: "0.8125rem", fontWeight: 500,
              marginBottom: "0.375rem", color: "var(--text-muted)",
            }}>
              Email
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={16}
                style={{
                  position: "absolute", left: "0.75rem", top: "50%",
                  transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none",
                }}
              />
              <input
                id="login-email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", paddingLeft: "2.5rem" }}
                autoFocus
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password field */}
          <div style={{ textAlign: "left" }}>
            <label style={{
              display: "block", fontSize: "0.8125rem", fontWeight: 500,
              marginBottom: "0.375rem", color: "var(--text-muted)",
            }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <KeyRound
                size={16}
                style={{
                  position: "absolute", left: "0.75rem", top: "50%",
                  transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none",
                }}
              />
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", paddingLeft: "2.5rem" }}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={!isFormValid || loading}
            style={{
              width: "100%",
              justifyContent: "center",
              marginTop: "0.5rem",
              padding: "0.75rem 1rem",
              opacity: (!isFormValid || loading) ? 0.6 : 1,
              cursor: (!isFormValid || loading) ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
