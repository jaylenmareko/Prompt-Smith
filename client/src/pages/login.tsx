import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(() =>
    new URLSearchParams(window.location.search).get("mode") === "signup"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (isSignup && password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      if (isSignup) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: isSignup ? "Registration failed" : "Login failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: "44px",
    padding: "0 14px",
    fontSize: "14px",
    borderRadius: "8px",
    border: "1px solid hsl(var(--border))",
    backgroundColor: "hsl(var(--background))",
    color: "hsl(var(--foreground))",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <p
            className="text-2xl font-semibold mb-1"
            style={{ color: "hsl(var(--foreground))" }}
            data-testid="text-logo"
          >
            Prompt Smith
          </p>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            {isSignup ? "Create your account" : "Welcome back"}
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                Email address
              </label>
              <input
                id="email"
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
              <label htmlFor="password" className="block text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                Password
              </label>
              <input
                id="password"
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
                <label htmlFor="confirmPassword" className="block text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
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
              style={{
                width: "100%",
                height: "44px",
                marginTop: "8px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "hsl(var(--foreground))",
                color: "hsl(var(--background))",
                fontSize: "14px",
                fontWeight: 500,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSignup ? "Create account" : "Continue"}
            </button>
          </form>
        </div>

        {/* Toggle */}
        <p className="text-center mt-5 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
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
      </div>
    </div>
  );
}
