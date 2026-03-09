import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "hsl(var(--background))" }}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm mb-10 transition-opacity hover:opacity-70"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-3xl font-semibold mb-2" style={{ color: "hsl(var(--foreground))" }}>
          Terms of Service
        </h1>
        <p className="text-sm mb-10" style={{ color: "hsl(var(--muted-foreground))" }}>
          Last updated: March 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: "hsl(var(--foreground))" }}>
          <section>
            <h2 className="font-semibold text-base mb-2">1. Acceptance of Terms</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              By accessing or using Prompt Smith, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">2. Description of Service</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              Prompt Smith is an AI-powered prompt generation tool that helps users create optimized prompts for various AI platforms including ChatGPT, Midjourney, Claude, and others. The service is provided on a free and paid subscription basis.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">3. User Accounts</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. We reserve the right to terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">4. Acceptable Use</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              You agree not to use Prompt Smith to generate content that is illegal, harmful, abusive, or violates any applicable laws. You may not attempt to reverse engineer, scrape, or abuse the service in any way that disrupts other users.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">5. Payments and Subscriptions</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              Paid plans are billed on a monthly basis. You may cancel at any time through the billing portal. Refunds are handled on a case-by-case basis. We reserve the right to change pricing with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">6. Intellectual Property</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              You retain ownership of the prompts you generate. Prompt Smith retains all rights to its software, design, and underlying technology. You may not reproduce or distribute any part of the service without written permission.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">7. Disclaimer of Warranties</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              Prompt Smith is provided "as is" without warranties of any kind. We do not guarantee that the service will be uninterrupted, error-free, or that AI-generated outputs will meet your expectations.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">8. Limitation of Liability</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              To the fullest extent permitted by law, Prompt Smith shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">9. Changes to Terms</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              We may update these terms from time to time. Continued use of the service after changes constitutes your acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">10. Contact</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              For questions about these terms, contact us at support@prompt-smith.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
