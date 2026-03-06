import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
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
    "ChatGPT": "Structure the prompt with clear instructions, context, constraints, and desired output format. Use role-based prompting when appropriate.",
    "Midjourney": "Include detailed visual descriptors, artistic style references, composition details, lighting, mood, color palette, and Midjourney-specific parameters like --ar, --v, --style, --q.",
    "Cursor": "Focus on clear code specifications, programming language, framework requirements, file structure, implementation details, and edge cases to handle.",
    "Replit": "Focus on practical full-stack implementation, framework choices, database design, API structure, and deployment considerations.",
    "Claude": "Emphasize structured reasoning, step-by-step analysis, clear constraints, and XML tags for organization when helpful.",
    "DALL·E": "Include detailed visual descriptions, artistic style, composition, mood, lighting, perspective, and DALL·E-specific formatting.",
    "Sora": "Include cinematic descriptions, camera movements, scene transitions, timing, visual storytelling elements, and video-specific parameters.",
    "Gemini": "Structure with clear objectives, context, multi-modal considerations, and leverage Gemini's strengths in reasoning and analysis.",
  };

  const specific = toolInstructions[targetTool] || toolInstructions["ChatGPT"];

  return `You are Prompt Smith, an expert AI prompt engineer. Your sole job is to take a user's plain-language description and generate an optimized, ready-to-use prompt for ${targetTool}.

CRITICAL RULES:
- Return ONLY the generated prompt text — nothing else
- No preamble, no explanation, no "Here's your prompt:" prefix
- No markdown formatting or code blocks
- The output should be directly copy-pasteable into ${targetTool}
- Make the prompt comprehensive, specific, and optimized for best results

TOOL-SPECIFIC INSTRUCTIONS for ${targetTool}:
${specific}

Generate the most effective prompt possible based on what the user describes.`;
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

  app.post("/api/generate", async (req, res) => {
    try {
      const { input, targetTool: selectedTool } = req.body;
      if (!input) return res.status(400).json({ message: "Input is required" });

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
