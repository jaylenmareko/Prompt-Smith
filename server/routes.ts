import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import passport from "passport";
import Anthropic from "@anthropic-ai/sdk";

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

  return `You are Prompt Smith, an expert AI prompt engineer. Your job is to take a user's plain-language description and generate an optimized prompt for ${targetTool}.

CRITICAL RULES:
- Return ONLY the prompt text — nothing else
- No preamble, no explanation, no "Here's your prompt:" prefix
- No markdown formatting or code blocks
- The output must be directly copy-pasteable into ${targetTool}
- LENGTH: Write exactly as much as the request needs — no more, no less. A simple request deserves a short prompt. A complex request deserves a detailed one. Never pad, never cut corners.

TOOL-SPECIFIC FORMAT for ${targetTool}:
${specific}

Write the most effective prompt possible. Let the complexity of the request determine the length.`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  app.post("/api/auth/register", async (req, res) => {
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

  app.post("/api/auth/login", (req, res, next) => {
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
      const { input, targetTool: selectedTool } = req.body;
      if (!input) return res.status(400).json({ message: "Input is required" });

      const GUEST_DAILY_LIMIT = 5;
      const sess = req.session as any;

      if (req.isAuthenticated()) {
        const result = await storage.checkAndIncrementUsage((req.user as any).id);
        if (!result.allowed) {
          return res.status(429).json({ limitReached: true, reason: result.reason, plan: result.plan });
        }
      } else {
        // Guest: track daily usage in session
        const today = new Date().toISOString().split("T")[0];
        if (sess.guestLastReset !== today) {
          sess.guestPromptsToday = 0;
          sess.guestLastReset = today;
        }
        if ((sess.guestPromptsToday || 0) >= GUEST_DAILY_LIMIT) {
          return res.status(429).json({ limitReached: true, reason: "daily", plan: "guest" });
        }
        sess.guestPromptsToday = (sess.guestPromptsToday || 0) + 1;
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

      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: getSystemPrompt(finalTool),
        messages: [{ role: "user", content: input }],
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          const text = event.delta.text;
          if (text) res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
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

  return httpServer;
}
