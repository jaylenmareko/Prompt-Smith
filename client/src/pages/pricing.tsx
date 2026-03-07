import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Check, ArrowLeft, Zap } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    limit: "5 prompts per day",
    features: ["5 prompts/day", "All AI tools", "Voice input", "Copy & paste"],
    key: "free",
    popular: false,
  },
  {
    name: "Starter",
    price: "$2",
    period: "/month",
    limit: "500 prompts per month",
    features: ["500 prompts/month", "All AI tools", "Voice input", "Save prompts", "No daily cap"],
    key: "starter",
    popular: false,
  },
  {
    name: "Unlimited",
    price: "$8",
    period: "/month",
    limit: "Unlimited prompts",
    features: ["Unlimited prompts", "All AI tools", "Voice input", "Save prompts", "No daily cap", "Early access to features"],
    key: "unlimited",
    popular: true,
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "hsl(var(--background))" }}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={() => setLocation("/")}
          data-testid="button-back"
          className="flex items-center gap-2 text-sm mb-10 transition-opacity hover:opacity-70"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold mb-2" style={{ color: "hsl(var(--foreground))" }}>
            Choose your plan
          </h1>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            Unlock more prompts and features
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrentPlan = user?.plan === plan.key;
            return (
              <div
                key={plan.key}
                data-testid={`plan-card-${plan.key}`}
                className="relative rounded-2xl p-6"
                style={{
                  backgroundColor: "hsl(var(--card))",
                  border: plan.popular
                    ? "2px solid hsl(var(--foreground))"
                    : "1px solid hsl(var(--border))",
                }}
              >
                {plan.popular && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                    style={{ backgroundColor: "hsl(var(--foreground))", color: "hsl(var(--background))" }}
                  >
                    Most popular
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    {plan.key !== "free" && (
                      <Zap className="w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
                    )}
                    <h3 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                      {plan.name}
                    </h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-2" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {plan.limit}
                  </p>
                </div>

                <div className="space-y-2.5 mb-6">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--foreground))" }} />
                      <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  disabled={isCurrentPlan}
                  data-testid={`button-select-${plan.key}`}
                  className="w-full h-10 rounded-xl text-sm font-medium transition-opacity disabled:opacity-40"
                  style={
                    plan.popular
                      ? { backgroundColor: "hsl(var(--foreground))", color: "hsl(var(--background))" }
                      : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))" }
                  }
                >
                  {isCurrentPlan ? "Current plan" : plan.key === "free" ? "Get started" : "Upgrade"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
