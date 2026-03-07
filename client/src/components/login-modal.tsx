import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: "login" | "signup";
}

export function LoginModal({ open, onOpenChange, defaultMode = "login" }: LoginModalProps) {
  const [isSignup, setIsSignup] = useState(defaultMode === "signup");
  const [isForgot, setIsForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setIsSignup(defaultMode === "signup");
      setIsForgot(false);
      setForgotSent(false);
      setForgotEmail("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setIsSubmitting(false);
    }
  }, [open, defaultMode]);

  const reset = () => {
    setEmail(""); setPassword(""); setConfirmPassword(""); setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (isSignup && password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      if (isSignup) { await register(email, password); } else { await login(email, password); }
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: isSignup ? "Registration failed" : "Login failed", description: error.message || "Please try again", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
    } catch {}
    setForgotSent(true);
    setForgotLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", height: "44px", padding: "0 14px", fontSize: "14px",
    borderRadius: "8px", border: "1px solid hsl(var(--border))",
    backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))",
    outline: "none", boxSizing: "border-box",
  };

  const subtitle = isForgot ? "Reset your password" : isSignup ? "Create your account" : "Welcome back";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent
        className="sm:max-w-sm p-0 overflow-hidden"
        style={{ borderRadius: "16px", border: "1px solid hsl(var(--border))" }}
      >
        <div className="px-8 py-10">
          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-2xl font-semibold mb-1" style={{ color: "hsl(var(--foreground))" }}>
              Prompt Smith
            </p>
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{subtitle}</p>
          </div>

          {/* Forgot password — sent confirmation */}
          {isForgot && forgotSent && (
            <div className="text-center space-y-4">
              <p className="text-sm" style={{ color: "hsl(var(--foreground))" }}>
                If that email is registered, a reset link is on its way. Check your inbox.
              </p>
              <button
                onClick={() => { setIsForgot(false); setForgotSent(false); }}
                className="text-sm underline underline-offset-2 hover:opacity-70"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Back to sign in
              </button>
            </div>
          )}

          {/* Forgot password — email form */}
          {isForgot && !forgotSent && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={inputStyle}
                />
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                style={{ width: "100%", height: "44px", borderRadius: "8px", border: "none", backgroundColor: "hsl(var(--foreground))", color: "hsl(var(--background))", fontSize: "14px", fontWeight: 500, cursor: forgotLoading ? "not-allowed" : "pointer", opacity: forgotLoading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send reset link"}
              </button>
              <p className="text-center text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                <button type="button" onClick={() => setIsForgot(false)} className="underline underline-offset-2 hover:opacity-70">
                  Back to sign in
                </button>
              </p>
            </form>
          )}

          {/* Login / signup form */}
          {!isForgot && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    data-testid="input-email"
                    style={inputStyle}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    data-testid="input-password"
                    style={inputStyle}
                  />
                </div>

                {isSignup && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                      Confirm password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      data-testid="input-confirm-password"
                      style={inputStyle}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="button-submit-auth"
                  style={{ width: "100%", height: "44px", marginTop: "4px", borderRadius: "8px", border: "none", backgroundColor: "hsl(var(--foreground))", color: "hsl(var(--background))", fontSize: "14px", fontWeight: 500, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSignup ? "Create account" : "Continue"}
                </button>
              </form>

              {!isSignup && (
                <p className="text-center mt-3 text-sm">
                  <button
                    onClick={() => setIsForgot(true)}
                    className="transition-opacity hover:opacity-70"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >
                    Forgot password?
                  </button>
                </p>
              )}

              <p className="text-center mt-6 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  onClick={() => { setIsSignup(!isSignup); setConfirmPassword(""); }}
                  data-testid="button-toggle-auth-mode"
                  className="font-medium underline underline-offset-2 transition-opacity hover:opacity-70"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  {isSignup ? "Sign in" : "Sign up"}
                </button>
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
