import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-sm mb-10" style={{ color: "hsl(var(--muted-foreground))" }}>
          Last updated: March 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: "hsl(var(--foreground))" }}>
          <section>
            <h2 className="font-semibold text-base mb-2">1. Information We Collect</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              We collect the email address and password you provide when creating an account. We also collect usage data such as the number of prompts generated and your subscription plan. We do not collect or store the content of your prompts beyond what is needed to display your conversation history.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">2. How We Use Your Information</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              Your information is used to operate and improve Prompt Smith, process payments, send transactional emails (such as password resets), and enforce usage limits based on your plan. We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">3. Payments</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              Payments are processed by Stripe. We do not store your credit card information. Stripe's privacy policy governs how your payment data is handled. You can review it at stripe.com/privacy.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">4. Data Storage</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              Your account data is stored in a secure PostgreSQL database. Conversation history is stored locally in your browser and is not sent to our servers unless you are logged in and actively generating a prompt.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">5. Cookies and Local Storage</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              We use session cookies to keep you logged in. We use localStorage to save your conversation history and preferences locally on your device. We do not use third-party tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">6. Third-Party Services</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              Prompt Smith uses Anthropic's Claude API to generate prompts and Resend to deliver transactional emails. These services may process your data in accordance with their own privacy policies.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">7. Data Deletion</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              You can delete your account at any time from your account settings. Deleting your account permanently removes your email, password, and all associated data from our servers.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">8. Children's Privacy</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              Prompt Smith is not intended for users under the age of 13. We do not knowingly collect data from children.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">9. Changes to This Policy</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              We may update this policy from time to time. We will notify users of significant changes via email or a notice on the app.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">10. Contact</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              For privacy-related questions, contact us at support@promptsmith.app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
