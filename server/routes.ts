import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import passport from "passport";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

const PRICE_IDS: Record<string, string> = {
  starter: "price_1T971XPrOq2GucuYK25dGAX8",
  pro:     "price_1T973APrOq2GucuY2LOLtiJL",
};

const PLAN_FROM_PRICE: Record<string, string> = {
  "price_1T971XPrOq2GucuYK25dGAX8": "starter",
  "price_1T973APrOq2GucuY2LOLtiJL": "pro",
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: "Too many attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

async function sendResetEmail(to: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[Password Reset] No RESEND_API_KEY set. Reset URL: ${resetUrl}`);
    return;
  }
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.RESEND_FROM || "Prompt Smith <onboarding@resend.dev>",
    to,
    subject: "Reset your Prompt Smith password",
    html: `<p>Click below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}

const TOOL_KEYWORDS: Record<string, string[]> = {
  "ChatGPT": ["chatgpt", "chat gpt", "openai"],
  "Midjourney": ["midjourney", "mid journey", "mj"],
  "Cursor": ["cursor"],
  "Replit": ["replit"],
  "Claude": ["claude", "anthropic"],
  "DALL·E": ["dall-e", "dalle", "dall e"],
  "Sora": ["sora"],
  "Gemini": ["gemini", "google ai", "bard"],
};

function detectTool(input: string): string | null {
  const lower = input.toLowerCase();
  for (const [tool, keywords] of Object.entries(TOOL_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) return tool;
    }
  }
  return null;
}

function getSystemPrompt(targetTool: string): string {
  const toolInstructions: Record<string, string> = {
    "ChatGPT":    "Use a clear role, task, and output format. Be direct.",
    "Midjourney": "Comma-separated visual descriptors: subject, style, lighting, mood, color palette, camera angle. End with Midjourney parameters (--ar, --v, --style).",
    "Cursor":     "Specify language, framework, exact behavior, file structure, and edge cases. Be precise.",
    "Replit":     "Specify stack, features, API design, and database needs. Be precise.",
    "Claude":     "State the task clearly with constraints and desired output format. Use step-by-step framing if needed.",
    "DALL·E":     "Comma-separated visual descriptors: subject, art style, lighting, composition, mood, color palette.",
    "Sora":       "Describe the scene, camera movement, pacing, and mood. Cinematic language only.",
    "Gemini":     "State the task, context, and desired output clearly.",
  };

  const specific = toolInstructions[targetTool] || toolInstructions["ChatGPT"];

  const clarifyRules: Record<string, string> = {
    "Replit": `- NEVER assume the tech stack. Instead ask about what the app needs to DO — who uses it, what the main actions are, whether it needs accounts or payments. Then YOU choose a sensible modern stack based on those answers and include it in the prompt.
- Ask about purpose and features, not about frameworks or databases. Users may not be technical.
- If the core purpose is unclear, ask one question about it before generating.`,

    "Cursor": `- NEVER assume the tech stack. Ask about what the feature or app needs to DO — who uses it, what the main actions are. Then YOU choose a sensible stack and include it in the prompt.
- Ask about purpose and features, not frameworks or databases. Not every Cursor user is technical enough to know their stack.
- If the core purpose is unclear, ask one question about it before generating.`,

    "Midjourney": `- If the subject or scene is clear, generate directly — you can assume a style.
- If the mood, tone, or intended use is completely unclear and would drastically change the output, ask one focused question about it (e.g. "Should this feel dark and cinematic or bright and playful?").`,

    "DALL·E": `- If the subject is clear, generate directly.
- Only ask a clarification if the mood or style is so ambiguous that any assumption would likely miss the mark entirely.`,

    "Sora": `- Always clarify the mood and camera style if not mentioned — these are critical for video and cannot be assumed without risking a completely wrong result.
- Ask one question covering the most important missing visual detail (mood, pacing, or camera movement).`,

    "default": `- Only ask for clarification if a truly critical detail is missing and no reasonable assumption can be made.
- For most requests (writing, Q&A, analysis), make sensible assumptions and generate directly.`,
  };

  const clarifyRule = clarifyRules[targetTool] || clarifyRules["default"];

  return `You are Prompt Smith, an expert AI prompt engineer. Your job is to take a user's plain-language description and generate an optimized prompt for ${targetTool}.

FIRST — evaluate the user's input quality:
- If a critical detail is missing that would make the prompt useless or produce the wrong result, do NOT generate. Instead respond with exactly this format and nothing else:
  CLARIFY: [one specific, friendly question a non-technical person can answer]
- Ask only ONE question. Never ask about technical implementation details the user wouldn't know.

CLARIFICATION RULES for ${targetTool}:
${clarifyRule}

WHEN GENERATING A PROMPT — CRITICAL RULES:
- Return ONLY the prompt text — nothing else
- No preamble, no explanation, no "Here's your prompt:" prefix
- No markdown formatting or code blocks
- The output must be directly copy-pasteable into ${targetTool}
- LENGTH: Write exactly as much as the request needs — no more, no less. Never pad, never cut corners.

TOOL-SPECIFIC FORMAT for ${targetTool}:
${specific}

Write the most effective prompt possible. Let the complexity of the request determine the length.`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
      if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
      const existing = await storage.getProfileByEmail(email);
      if (existing) return res.status(400).json({ message: "An account with this email already exists" });
      const hashedPassword = await hashPassword(password);
      const profile = await storage.createProfile(email, hashedPassword);
      req.login(profile, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });
        const { password: _, ...safeProfile } = profile;
        res.status(201).json(safeProfile);
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", authLimiter, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return res.status(500).json({ message: "Authentication error" });
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed" });
        const { password: _, ...safeProfile } = user;
        res.json(safeProfile);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const { password: _, ...safeProfile } = req.user!;
    res.json(safeProfile);
  });

  app.patch("/api/auth/email", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const { newEmail, password } = req.body;
    if (!newEmail || !password) return res.status(400).json({ message: "Email and password are required" });
    try {
      const user = req.user!;
      const valid = await comparePasswords(password, user.password);
      if (!valid) return res.status(401).json({ message: "Incorrect password" });
      const existing = await storage.getProfileByEmail(newEmail);
      if (existing) return res.status(400).json({ message: "Email already in use" });
      await storage.updateProfile(user.id, { email: newEmail });
      res.json({ message: "Email updated" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update email" });
    }
  });

  app.patch("/api/auth/password", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Both passwords are required" });
    if (newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    try {
      const user = req.user!;
      const valid = await comparePasswords(currentPassword, user.password);
      if (!valid) return res.status(401).json({ message: "Incorrect current password" });
      const hashed = await hashPassword(newPassword);
      await storage.updateProfile(user.id, { password: hashed });
      res.json({ message: "Password updated" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update password" });
    }
  });

  app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    try {
      const profile = await storage.getProfileByEmail(email);
      // Always return success to avoid exposing which emails exist
      if (!profile) return res.json({ message: "If that email exists, a reset link has been sent." });
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
      await storage.setResetToken(email, token, expiry);
      const appUrl = process.env.APP_URL || "http://localhost:5000";
      const resetUrl = `${appUrl}/reset-password?token=${token}`;
      await sendResetEmail(email, resetUrl);
      res.json({ message: "If that email exists, a reset link has been sent." });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to send reset email" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: "Token and new password are required" });
    if (newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    try {
      const profile = await storage.getProfileByResetToken(token);
      if (!profile || !profile.passwordResetExpiry) return res.status(400).json({ message: "Invalid or expired reset link" });
      if (new Date() > new Date(profile.passwordResetExpiry)) return res.status(400).json({ message: "Reset link has expired" });
      const hashed = await hashPassword(newPassword);
      await storage.updateProfile(profile.id, { password: hashed });
      await storage.clearResetToken(profile.id);
      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.get("/api/usage", (req, res) => {
    const sess = req.session as any;
    if (req.isAuthenticated()) return res.json(null); // logged-in users read from their profile
    const today = new Date().toISOString().split("T")[0];
    const used = sess.guestLastReset === today ? (sess.guestPromptsToday || 0) : 0;
    res.json({ used, limit: 5 });
  });

  app.delete("/api/auth/account", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: "Password is required" });
    try {
      const user = req.user!;
      const valid = await comparePasswords(password, user.password);
      if (!valid) return res.status(401).json({ message: "Incorrect password" });
      await storage.deleteProfile(user.id);
      req.logout((err) => {
        if (err) return res.status(500).json({ message: "Account deleted but logout failed" });
        res.json({ message: "Account deleted" });
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete account" });
    }
  });

  app.post("/api/generate", async (req, res) => {
    try {
      const { input, targetTool: selectedTool, history = [] } = req.body;
      if (!input) return res.status(400).json({ message: "Input is required" });
      if (typeof input !== "string" || input.length > 2000) return res.status(400).json({ message: "Input must be 2000 characters or less" });

      const GUEST_DAILY_LIMIT = 5;
      const PLAN_LIMITS: Record<string, { daily: number | null; monthly: number | null }> = {
        free:      { daily: 5,    monthly: null },
        starter:   { daily: 30,   monthly: null },
        pro:       { daily: null, monthly: null },
        unlimited: { daily: null, monthly: null },
      };
      const sess = req.session as any;

      // Check limit only — increment happens after generation if not a clarification
      if (req.isAuthenticated()) {
        const profile = await storage.getProfile((req.user as any).id);
        if (!profile) return res.status(401).json({ message: "Not authenticated" });
        const today = new Date().toISOString().split("T")[0];
        const currentMonth = today.substring(0, 7);
        const limits = PLAN_LIMITS[profile.plan] ?? PLAN_LIMITS.free;
        const dailyCount = profile.lastResetDate !== today ? 0 : profile.promptsUsedToday;
        const monthlyCount = profile.lastMonthlyReset !== currentMonth ? 0 : profile.promptsUsedMonth;
        if (limits.daily !== null && dailyCount >= limits.daily) {
          return res.status(429).json({ limitReached: true, reason: "daily", plan: profile.plan });
        }
        if (limits.monthly !== null && monthlyCount >= limits.monthly) {
          return res.status(429).json({ limitReached: true, reason: "monthly", plan: profile.plan });
        }
      } else {
        // Guest: check daily usage in session
        const today = new Date().toISOString().split("T")[0];
        if (sess.guestLastReset !== today) {
          sess.guestPromptsToday = 0;
          sess.guestLastReset = today;
        }
        if ((sess.guestPromptsToday || 0) >= GUEST_DAILY_LIMIT) {
          return res.status(429).json({ limitReached: true, reason: "daily", plan: "guest" });
        }
      }

      const detectedTool = detectTool(input);
      const finalTool = detectedTool || selectedTool || "ChatGPT";

      const anthropic = new Anthropic({
        apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      res.write(`data: ${JSON.stringify({ detectedTool: finalTool })}\n\n`);

      const conversationMessages = [
        ...history
          .filter((m: any) => m.role === "user" || m.role === "assistant")
          .map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: input },
      ];

      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: getSystemPrompt(finalTool),
        messages: conversationMessages,
      });

      let fullText = "";
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          const text = event.delta.text;
          if (text) {
            fullText += text;
            res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
          }
        }
      }

      // Only count usage if the response is a real prompt, not a clarification question
      const isClarification = fullText.trimStart().startsWith("CLARIFY:");
      if (!isClarification) {
        if (req.isAuthenticated()) {
          await storage.incrementPromptUsage((req.user as any).id);
        } else {
          sess.guestPromptsToday = (sess.guestPromptsToday || 0) + 1;
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Generation error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message || "Generation failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: error.message || "Generation failed" });
      }
    }
  });

  // ── Stripe: create checkout session ──────────────────────────────
  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const { plan } = req.body;
    const priceId = PRICE_IDS[plan];
    if (!priceId) return res.status(400).json({ message: "Invalid plan" });

    const user = req.user as any;
    const appUrl = process.env.APP_URL || "http://localhost:5000";

    try {
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({ email: user.email });
        customerId = customer.id;
        await storage.updateProfile(user.id, { stripeCustomerId: customerId });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/?checkout=success`,
        cancel_url: `${appUrl}/pricing`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Stripe: sync subscription → update plan ──────────────────────
  app.post("/api/stripe/sync", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    try {
      if (!user.stripeCustomerId) return res.json({ plan: "free" });
      const subscriptions = await stripe.subscriptions.list({ customer: user.stripeCustomerId, status: "active", limit: 1 });
      const sub = subscriptions.data[0];
      if (!sub) {
        await storage.updateProfile(user.id, { plan: "free" });
        return res.json({ plan: "free" });
      }
      const priceId = sub.items.data[0]?.price.id;
      const plan = PLAN_FROM_PRICE[priceId] || "free";
      await storage.updateProfile(user.id, { plan, stripeSubscriptionId: sub.id });
      res.json({ plan });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Stripe: customer portal ───────────────────────────────────────
  app.post("/api/stripe/create-portal-session", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    const appUrl = process.env.APP_URL || "http://localhost:5000";

    try {
      if (!user.stripeCustomerId) return res.status(400).json({ message: "No active subscription" });
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${appUrl}/`,
      });
      res.json({ url: session.url });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Stripe: webhook ───────────────────────────────────────────────
  app.post("/api/stripe/webhook", async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: Stripe.Event;

    try {
      const rawBody = (req as any).rawBody as Buffer;
      if (webhookSecret && sig) {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } else {
        event = req.body as Stripe.Event;
      }
    } catch (err: any) {
      return res.status(400).send(`Webhook error: ${err.message}`);
    }

    try {
      if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const priceId = sub.items.data[0]?.price.id;
        const plan = PLAN_FROM_PRICE[priceId] || "free";
        const status = sub.status;
        const activePlan = (status === "active" || status === "trialing") ? plan : "free";

        const profiles = await storage.getProfileByStripeCustomerId(customerId);
        if (profiles) {
          await storage.updateProfile(profiles.id, { plan: activePlan, stripeSubscriptionId: sub.id });
        }
      }

      if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const profiles = await storage.getProfileByStripeCustomerId(customerId);
        if (profiles) {
          await storage.updateProfile(profiles.id, { plan: "free", stripeSubscriptionId: null });
        }
      }
    } catch (err) {
      console.error("Webhook handler error:", err);
    }

    res.json({ received: true });
  });

  return httpServer;
}
