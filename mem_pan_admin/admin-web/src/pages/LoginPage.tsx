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

      const role = extractUserRole(data) || "unknown";

      if (role !== "admin") {
        setMessage({
          type: "warning",
          text: `Access denied. Your account role is "${role}". Only admin accounts can access this panel.`,
        });
        setLoading(false);
        return;
      }

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
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Decorative Background Elements */}
      <div style={{
        position: "absolute", top: "10%", left: "20%", width: "40vw", height: "40vw",
        background: "radial-gradient(circle, var(--accent-glow), transparent 70%)", filter: "blur(80px)", opacity: 0.5, pointerEvents: "none", zIndex: 0
      }} />
      <div style={{
        position: "absolute", bottom: "10%", right: "10%", width: "30vw", height: "30vw",
        background: "radial-gradient(circle, hsla(220, 80%, 50%, 0.2), transparent 70%)", filter: "blur(80px)", opacity: 0.5, pointerEvents: "none", zIndex: 0
      }} />

      <div className="glass-panel animate-fade-in" style={{
        padding: "3.5rem",
        width: "100%",
        maxWidth: 440,
        boxShadow: "var(--shadow-lg), 0 0 40px rgba(0,0,0,0.5)",
        textAlign: "center",
        position: "relative",
        zIndex: 1,
        borderRadius: "var(--radius-lg)",
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(15, 15, 20, 0.6)",
      }}>
        {/* Logo */}
        <div style={{
          width: 72, height: 72, borderRadius: "20px",
          background: "linear-gradient(135deg, var(--accent-primary), hsl(var(--primary-hue), 80%, 55%))",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 2rem",
          boxShadow: "var(--glow-primary), inset 0 2px 4px rgba(255,255,255,0.3)",
          position: "relative"
        }}>
          <Lock size={36} color="white" strokeWidth={2.5} />
        </div>

        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>Admin Portal</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2.5rem", fontSize: "0.95rem" }}>
          Sign in to access your dashboard
        </p>

        {/* Status message */}
        {message && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            padding: "0.85rem 1rem",
            marginBottom: "1.5rem",
            borderRadius: "var(--radius-md)",
            background: messageStyles[message.type].bg,
            border: `1px solid ${messageStyles[message.type].border}`,
            color: messageStyles[message.type].color,
            fontSize: "0.85rem",
            fontWeight: 500,
            textAlign: "left",
            lineHeight: 1.4,
            animation: "fadeIn 200ms ease-out",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
          }}>
            <span style={{ flexShrink: 0 }}>{messageStyles[message.type].icon}</span>
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Email field */}
          <div style={{ textAlign: "left" }}>
            <label style={{
              display: "block", fontSize: "0.85rem", fontWeight: 600,
              marginBottom: "0.5rem", color: "var(--text-main)", letterSpacing: "0.02em"
            }}>
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={18}
                style={{
                  position: "absolute", left: "1rem", top: "50%",
                  transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none",
                }}
              />
              <input
                id="login-email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", paddingLeft: "3rem", paddingRight: "1rem", height: "3rem", fontSize: "0.95rem" }}
                autoFocus
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password field */}
          <div style={{ textAlign: "left" }}>
            <label style={{
              display: "block", fontSize: "0.85rem", fontWeight: 600,
              marginBottom: "0.5rem", color: "var(--text-main)", letterSpacing: "0.02em"
            }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <KeyRound
                size={18}
                style={{
                  position: "absolute", left: "1rem", top: "50%",
                  transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none",
                }}
              />
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", paddingLeft: "3rem", paddingRight: "1rem", height: "3rem", fontSize: "0.95rem" }}
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
              marginTop: "1rem",
              padding: "0.85rem",
              fontSize: "1rem",
              opacity: (!isFormValid || loading) ? 0.6 : 1,
              cursor: (!isFormValid || loading) ? "not-allowed" : "pointer",
              borderRadius: "var(--radius-md)",
            }}
          >
            {loading ? (
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
