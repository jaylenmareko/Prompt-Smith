import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Crown } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    limit: "10 prompts per day",
    features: ["10 prompts/day", "All AI tools", "Voice input", "Copy & paste"],
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
    <div className="min-h-screen" style={{ backgroundColor: "#0f0f0f" }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <button
          onClick={() => setLocation(user ? "/dashboard" : "/login")}
          data-testid="button-back"
          className="flex items-center gap-2 text-sm mb-10 transition-colors"
          style={{ color: "#f0ece4aa" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="text-center mb-12">
          <h1
            className="text-xs font-semibold tracking-[0.3em] uppercase mb-4"
            style={{ color: "#c8a96e" }}
          >
            PromptForge
          </h1>
          <h2 className="text-3xl font-light mb-3" style={{ color: "#f0ece4" }}>
            Choose your plan
          </h2>
          <p className="text-sm" style={{ color: "#f0ece4aa" }}>
            Unlock more prompts and features
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrentPlan = user?.plan === plan.key;
            return (
              <div
                key={plan.key}
                data-testid={`plan-card-${plan.key}`}
                className="relative rounded-xl p-5 transition-all"
                style={{
                  backgroundColor: "#161616",
                  border: plan.popular ? "1px solid #c8a96e44" : "1px solid #1e1e1e",
                }}
              >
                {plan.popular && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider"
                    style={{ backgroundColor: "#c8a96e", color: "#0f0f0f" }}
                  >
                    Popular
                  </div>
                )}

                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    {plan.key !== "free" && (
                      <Crown className="w-3.5 h-3.5" style={{ color: "#c8a96e" }} />
                    )}
                    <h3 className="text-sm font-medium" style={{ color: "#f0ece4" }}>
                      {plan.name}
                    </h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-light" style={{ color: "#f0ece4" }}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-xs" style={{ color: "#f0ece4aa" }}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-2" style={{ color: "#f0ece466" }}>
                    {plan.limit}
                  </p>
                </div>

                <div className="space-y-2.5 mb-6">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "#c8a96e" }} />
                      <span className="text-xs" style={{ color: "#f0ece4aa" }}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full text-xs h-9 border-0"
                  disabled={isCurrentPlan}
                  data-testid={`button-select-${plan.key}`}
                  style={
                    isCurrentPlan
                      ? { backgroundColor: "#1e1e1e", color: "#f0ece466" }
                      : plan.popular
                        ? { backgroundColor: "#c8a96e", color: "#0f0f0f" }
                        : { backgroundColor: "#1e1e1e", color: "#f0ece4cc" }
                  }
                >
                  {isCurrentPlan ? "Current Plan" : plan.key === "free" ? "Get Started" : "Subscribe"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
