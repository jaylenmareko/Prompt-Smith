import { db } from "./db";
import { profiles, conversations, chatMessages, savedPrompts } from "@shared/schema";
import type { Profile, InsertProfile, Conversation, ChatMessage, SavedPrompt } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

const PLAN_LIMITS: Record<string, { daily: number | null; monthly: number | null }> = {
  free:      { daily: 5,    monthly: null },
  starter:   { daily: null, monthly: 500  },
  unlimited: { daily: null, monthly: null },
};

export interface IStorage {
  getProfile(id: number): Promise<Profile | undefined>;
  getProfileByEmail(email: string): Promise<Profile | undefined>;
  createProfile(email: string, hashedPassword: string): Promise<Profile>;
  updateProfile(id: number, data: Partial<Profile>): Promise<Profile>;
  checkAndIncrementUsage(id: number): Promise<{ allowed: boolean; reason?: "daily" | "monthly"; plan: string }>;
  incrementPromptUsage(id: number): Promise<void>;
  resetDailyUsage(id: number): Promise<void>;
  resetMonthlyUsage(id: number): Promise<void>;

  getConversations(userId: number): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(userId: number, title: string): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  updateConversationTitle(id: number, title: string): Promise<void>;

  getMessages(conversationId: number): Promise<ChatMessage[]>;
  createMessage(conversationId: number, role: string, content: string, targetTool?: string): Promise<ChatMessage>;

  getSavedPrompts(userId: number): Promise<SavedPrompt[]>;
  createSavedPrompt(userId: number, name: string, promptText: string, targetTool: string, userInput: string): Promise<SavedPrompt>;
  deleteSavedPrompt(id: number): Promise<void>;
  deleteProfile(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getProfile(id: number): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    return profile;
  }

  async getProfileByEmail(email: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.email, email));
    return profile;
  }

  async createProfile(email: string, hashedPassword: string): Promise<Profile> {
    const today = new Date().toISOString().split("T")[0];
    const month = today.substring(0, 7);
    const [profile] = await db.insert(profiles).values({
      email,
      password: hashedPassword,
      plan: "free",
      promptsUsedToday: 0,
      promptsUsedMonth: 0,
      lastResetDate: today,
      lastMonthlyReset: month,
    }).returning();
    return profile;
  }

  async updateProfile(id: number, data: Partial<Profile>): Promise<Profile> {
    const [profile] = await db.update(profiles).set(data).where(eq(profiles.id, id)).returning();
    return profile;
  }

  async checkAndIncrementUsage(id: number): Promise<{ allowed: boolean; reason?: "daily" | "monthly"; plan: string }> {
    const profile = await this.getProfile(id);
    if (!profile) return { allowed: false, plan: "free" };

    const today = new Date().toISOString().split("T")[0];
    const currentMonth = today.substring(0, 7);

    let dailyCount = profile.lastResetDate !== today ? 0 : profile.promptsUsedToday;
    let monthlyCount = profile.lastMonthlyReset !== currentMonth ? 0 : profile.promptsUsedMonth;

    const limits = PLAN_LIMITS[profile.plan] ?? PLAN_LIMITS.free;

    if (limits.daily !== null && dailyCount >= limits.daily) {
      return { allowed: false, reason: "daily", plan: profile.plan };
    }
    if (limits.monthly !== null && monthlyCount >= limits.monthly) {
      return { allowed: false, reason: "monthly", plan: profile.plan };
    }

    await db.update(profiles).set({
      promptsUsedToday: dailyCount + 1,
      promptsUsedMonth: monthlyCount + 1,
      lastResetDate: today,
      lastMonthlyReset: currentMonth,
    }).where(eq(profiles.id, id));

    return { allowed: true, plan: profile.plan };
  }

  async incrementPromptUsage(id: number): Promise<void> {
    const profile = await this.getProfile(id);
    if (!profile) return;

    const today = new Date().toISOString().split("T")[0];
    const currentMonth = today.substring(0, 7);

    let dailyCount = profile.promptsUsedToday;
    let monthlyCount = profile.promptsUsedMonth;

    if (profile.lastResetDate !== today) {
      dailyCount = 0;
    }
    if (profile.lastMonthlyReset !== currentMonth) {
      monthlyCount = 0;
    }

    await db.update(profiles).set({
      promptsUsedToday: dailyCount + 1,
      promptsUsedMonth: monthlyCount + 1,
      lastResetDate: today,
      lastMonthlyReset: currentMonth,
    }).where(eq(profiles.id, id));
  }

  async resetDailyUsage(id: number): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    await db.update(profiles).set({
      promptsUsedToday: 0,
      lastResetDate: today,
    }).where(eq(profiles.id, id));
  }

  async resetMonthlyUsage(id: number): Promise<void> {
    const currentMonth = new Date().toISOString().substring(0, 7);
    await db.update(profiles).set({
      promptsUsedMonth: 0,
      lastMonthlyReset: currentMonth,
    }).where(eq(profiles.id, id));
  }

  async getConversations(userId: number): Promise<Conversation[]> {
    return db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.createdAt));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv;
  }

  async createConversation(userId: number, title: string): Promise<Conversation> {
    const [conv] = await db.insert(conversations).values({ userId, title }).returning();
    return conv;
  }

  async deleteConversation(id: number): Promise<void> {
    await db.delete(chatMessages).where(eq(chatMessages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async updateConversationTitle(id: number, title: string): Promise<void> {
    await db.update(conversations).set({ title }).where(eq(conversations.id, id));
  }

  async getMessages(conversationId: number): Promise<ChatMessage[]> {
    return db.select().from(chatMessages).where(eq(chatMessages.conversationId, conversationId)).orderBy(chatMessages.createdAt);
  }

  async createMessage(conversationId: number, role: string, content: string, targetTool?: string): Promise<ChatMessage> {
    const [msg] = await db.insert(chatMessages).values({ conversationId, role, content, targetTool }).returning();
    return msg;
  }

  async getSavedPrompts(userId: number): Promise<SavedPrompt[]> {
    return db.select().from(savedPrompts).where(eq(savedPrompts.userId, userId)).orderBy(desc(savedPrompts.createdAt));
  }

  async createSavedPrompt(userId: number, name: string, promptText: string, targetTool: string, userInput: string): Promise<SavedPrompt> {
    const [prompt] = await db.insert(savedPrompts).values({ userId, name, promptText, targetTool, userInput }).returning();
    return prompt;
  }

  async deleteSavedPrompt(id: number): Promise<void> {
    await db.delete(savedPrompts).where(eq(savedPrompts.id, id));
  }

  async deleteProfile(id: number): Promise<void> {
    const userConvs = await db.select().from(conversations).where(eq(conversations.userId, id));
    for (const conv of userConvs) {
      await db.delete(chatMessages).where(eq(chatMessages.conversationId, conv.id));
    }
    await db.delete(conversations).where(eq(conversations.userId, id));
    await db.delete(savedPrompts).where(eq(savedPrompts.userId, id));
    await db.delete(profiles).where(eq(profiles.id, id));
  }
}

export const storage = new DatabaseStorage();
