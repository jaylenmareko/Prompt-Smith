import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
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

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0f0f0f" }}>
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-10">
          <h1
            className="text-sm font-semibold tracking-[0.3em] uppercase mb-3"
            style={{ color: "#c8a96e" }}
            data-testid="text-logo"
          >
            PromptForge
          </h1>
          <p className="text-2xl font-light" style={{ color: "#f0ece4" }}>
            {isSignup ? "Create your account" : "Welcome back"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm" style={{ color: "#f0ece4aa" }}>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              data-testid="input-email"
              className="h-11 border-0 text-sm"
              style={{
                backgroundColor: "#1a1a1a",
                color: "#f0ece4",
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm" style={{ color: "#f0ece4aa" }}>
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              data-testid="input-password"
              className="h-11 border-0 text-sm"
              style={{
                backgroundColor: "#1a1a1a",
                color: "#f0ece4",
              }}
            />
          </div>

          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm" style={{ color: "#f0ece4aa" }}>
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={6}
                data-testid="input-confirm-password"
                className="h-11 border-0 text-sm"
                style={{
                  backgroundColor: "#1a1a1a",
                  color: "#f0ece4",
                }}
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            data-testid="button-submit-auth"
            className="w-full h-11 text-sm font-medium border-0"
            style={{
              backgroundColor: "#c8a96e",
              color: "#0f0f0f",
            }}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSignup ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignup(!isSignup);
              setConfirmPassword("");
            }}
            data-testid="button-toggle-auth-mode"
            className="text-sm transition-colors"
            style={{ color: "#c8a96e" }}
          >
            {isSignup ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
