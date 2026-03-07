import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const inputStyle: React.CSSProperties = {
    width: "100%", height: "44px", padding: "0 14px", fontSize: "14px",
    borderRadius: "8px", border: "1px solid hsl(var(--border))",
    backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))",
    outline: "none", boxSizing: "border-box",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setDone(true);
    } catch (err: any) {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "hsl(var(--background))" }}>
        <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Invalid reset link.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "hsl(var(--background))" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-2xl font-semibold mb-1" style={{ color: "hsl(var(--foreground))" }}>Prompt Smith</p>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            {done ? "Password updated" : "Choose a new password"}
          </p>
        </div>

        <div className="rounded-2xl p-8" style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          {done ? (
            <div className="text-center space-y-4">
              <p className="text-sm" style={{ color: "hsl(var(--foreground))" }}>
                Your password has been reset. You can now sign in.
              </p>
              <button
                onClick={() => setLocation("/")}
                style={{ width: "100%", height: "44px", borderRadius: "8px", border: "none", backgroundColor: "hsl(var(--foreground))", color: "hsl(var(--background))", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}
              >
                Go to app
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>New password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} style={inputStyle} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>Confirm password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" required minLength={6} style={inputStyle} />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{ width: "100%", height: "44px", marginTop: "4px", borderRadius: "8px", border: "none", backgroundColor: "hsl(var(--foreground))", color: "hsl(var(--background))", fontSize: "14px", fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Reset password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
