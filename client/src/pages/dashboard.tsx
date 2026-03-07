import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { queryClient } from "@/lib/queryClient";
import { AppSidebar } from "@/components/app-sidebar";
import { LoginModal } from "@/components/login-modal";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Mic, Send, Copy, Bookmark, Loader2, Sparkles, User, X } from "lucide-react";
import type { LocalMessage, LocalConversation, LocalSavedPrompt } from "@/lib/types";

const TOOL_PILLS = ["ChatGPT", "Midjourney", "Cursor", "Replit", "Claude", "DALL·E", "Sora", "Gemini"];

const LANG_CODES: Record<string, string> = {
  "English":   "en-US",
  "Español":   "es-ES",
  "Français":  "fr-FR",
  "Deutsch":   "de-DE",
  "Português": "pt-BR",
  "日本語":    "ja-JP",
  "中文":      "zh-CN",
  "한국어":    "ko-KR",
};

const STORAGE_KEYS = {
  conversations: "ps_conversations",
  savedPrompts: "ps_saved_prompts",
};

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getStoredConversations(): LocalConversation[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.conversations) || "[]"); }
  catch { return []; }
}

function getStoredSavedPrompts(): LocalSavedPrompt[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.savedPrompts) || "[]"); }
  catch { return []; }
}

export default function DashboardPage() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { t, lang } = useLanguage();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<"login" | "signup">("login");

  const openLogin = (mode: "login" | "signup" = "login") => {
    setLoginModalMode(mode);
    setLoginModalOpen(true);
  };
  const SIDEBAR_WIDTH = 260;
  const [showNudge, setShowNudge] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [currentConvTitle, setCurrentConvTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [detectedTool, setDetectedTool] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const committedRef = useRef("");
  const shouldListenRef = useRef(false);
  const [conversations, setConversations] = useState<LocalConversation[]>(getStoredConversations);
  const [savedPrompts, setSavedPrompts] = useState<LocalSavedPrompt[]>(getStoredSavedPrompts);
  const [guestUsage, setGuestUsage] = useState<{ used: number; limit: number } | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveTarget, setSaveTarget] = useState<{ promptText: string; targetTool: string; userInput: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-focus input on mount and when returning to empty state
  useEffect(() => {
    if (!authLoading && !isGenerating) {
      inputRef.current?.focus();
    }
  }, [authLoading, isGenerating]);

  // Auto-resize textarea whenever inputValue changes (covers voice input too)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 320) + "px";
  }, [inputValue]);


  const fetchGuestUsage = useCallback(async () => {
    if (user) return;
    try {
      const res = await fetch("/api/usage");
      if (res.ok) setGuestUsage(await res.json());
    } catch {}
  }, [user]);

  useEffect(() => { fetchGuestUsage(); }, [fetchGuestUsage]);

  // Show login nudge after 3 seconds if not logged in
  useEffect(() => {
    if (authLoading) return;
    if (user) return;
    const t = setTimeout(() => setShowNudge(true), 3000);
    return () => clearTimeout(t);
  }, [authLoading, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const persistConversation = (convId: string, title: string, finalMessages: LocalMessage[]) => {
    setConversations(prev => {
      const existing = prev.findIndex(c => c.id === convId);
      const conv: LocalConversation = {
        id: convId,
        title,
        messages: finalMessages,
        createdAt: existing >= 0 ? prev[existing].createdAt : new Date().toISOString(),
      };
      const updated = existing >= 0
        ? prev.map(c => c.id === convId ? conv : c)
        : [conv, ...prev].slice(0, 50);
      localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(updated));
      return updated;
    });
  };

  const loadConversation = useCallback((id: string) => {
    const conv = getStoredConversations().find(c => c.id === id);
    if (conv) {
      setMessages(conv.messages);
      setCurrentConvId(conv.id);
      setCurrentConvTitle(conv.title);
      setDetectedTool(conv.messages.find(m => m.role === "assistant")?.targetTool || null);
    }
  }, []);

  const loadSavedPrompt = useCallback((prompt: LocalSavedPrompt) => {
    setInputValue(prompt.userInput);
    setSelectedTool(prompt.targetTool);
    inputRef.current?.focus();
  }, []);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setCurrentConvId(null);
    setCurrentConvTitle("");
    setDetectedTool(null);
    setInputValue("");
    setSelectedTool(null);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(updated));
      return updated;
    });
    if (currentConvId === id) startNewChat();
  }, [currentConvId, startNewChat]);

  const deleteSavedPrompt = useCallback((id: string) => {
    setSavedPrompts(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.savedPrompts, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleGenerate = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const userInput = inputValue.trim();
    setInputValue("");
    setIsGenerating(true);

    let convId = currentConvId;
    let title = currentConvTitle;
    if (!convId) {
      convId = genId();
      title = userInput.length > 50 ? userInput.substring(0, 50) + "..." : userInput;
      setCurrentConvId(convId);
      setCurrentConvTitle(title);
    }

    const priorMessages = [...messages];
    const userMsg: LocalMessage = { id: genId(), role: "user", content: userInput };
    const assistantMsgId = genId();
    const assistantMsg: LocalMessage = { id: assistantMsgId, role: "assistant", content: "", isStreaming: true };
    setMessages(prev => [...prev, userMsg, assistantMsg]);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: userInput, targetTool: selectedTool }),
      });

      if (res.status === 429) {
        const err = await res.json();
        const isGuest = !user;
        const isMonthly = err.reason === "monthly";
        let wallText = "";
        if (isGuest) {
          wallText = "You've used your 5 free prompts for today. Sign up for free to keep your history, or come back tomorrow.";
        } else if (isMonthly) {
          wallText = "You've used all your prompts for this month. Upgrade to Unlimited to keep going, or check back next month.";
        } else {
          wallText = "You've used all 5 prompts for today. Upgrade for more, or check back tomorrow.";
        }
        setMessages(prev => prev.filter(m => m.id !== assistantMsgId));
        setMessages(prev => [...prev, {
          id: genId(),
          role: "wall" as any,
          content: wallText,
          isGuest,
        }]);
        fetchGuestUsage();
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response stream");

      let fullContent = "";
      let tool = selectedTool;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.detectedTool) { tool = data.detectedTool; setDetectedTool(data.detectedTool); }
            if (data.content) {
              fullContent += data.content;
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: fullContent, targetTool: tool };
                }
                return updated;
              });
            }
            if (data.done) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last) updated[updated.length - 1] = { ...last, isStreaming: false };
                return updated;
              });
            }
            if (data.error) throw new Error(data.error);
          } catch (e: any) {
            if (e.message && !e.message.includes("Unexpected")) throw e;
          }
        }
      }

      const finalMessages: LocalMessage[] = [
        ...priorMessages,
        userMsg,
        { id: assistantMsgId, role: "assistant", content: fullContent, targetTool: tool, isStreaming: false },
      ];
      persistConversation(convId, title, finalMessages);
      if (user) queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      else fetchGuestUsage();


    } catch (error: any) {
      toast({ title: "Generation failed", description: error.message || "Please try again", variant: "destructive" });
      setMessages(prev => prev.filter(m => m.id !== assistantMsgId));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const handleSave = (msg: LocalMessage) => {
    const userMsgIndex = messages.findIndex((m, i) => m.role === "user" && messages[i + 1]?.id === msg.id);
    setSaveTarget({
      promptText: msg.content,
      targetTool: msg.targetTool || selectedTool || "ChatGPT",
      userInput: userMsgIndex >= 0 ? messages[userMsgIndex].content : "",
    });
    setSaveName("");
    setSaveDialogOpen(true);
  };

  const confirmSave = () => {
    if (!saveName.trim() || !saveTarget) return;
    const prompt: LocalSavedPrompt = {
      id: genId(),
      name: saveName.trim(),
      ...saveTarget,
      createdAt: new Date().toISOString(),
    };
    setSavedPrompts(prev => {
      const updated = [prompt, ...prev];
      localStorage.setItem(STORAGE_KEYS.savedPrompts, JSON.stringify(updated));
      return updated;
    });
    toast({ title: "Prompt saved" });
    setSaveDialogOpen(false);
  };

  const stopVoice = () => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const startRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = LANG_CODES[lang] ?? "en-US";
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          committedRef.current += (committedRef.current ? " " : "") + result[0].transcript.trim();
        } else {
          interim += result[0].transcript;
        }
      }
      setInputValue(committedRef.current + (interim ? (committedRef.current ? " " : "") + interim : ""));
    };
    recognition.onerror = (event: any) => {
      // Don't stop on no-speech errors — just let onend restart it
      if (event.error === "aborted") {
        shouldListenRef.current = false;
        setIsListening(false);
      }
    };
    recognition.onend = () => {
      // If user hasn't manually stopped, restart immediately
      if (shouldListenRef.current) {
        try { recognition.start(); } catch {}
      } else {
        setIsListening(false);
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const toggleVoice = () => {
    if (isListening) {
      stopVoice();
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Voice not supported", description: "Use Chrome for voice input", variant: "destructive" });
      return;
    }
    committedRef.current = inputRef.current?.value.trim() ?? "";
    shouldListenRef.current = true;
    setIsListening(true);
    startRecognition();
  };


  const hasMessages = messages.length > 0;

  const inputBox = (testIdSuffix: string, disabled = false) => (
    <div
      className="flex items-end gap-2 rounded-2xl px-4 py-3"
      style={{ backgroundColor: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
    >
      <textarea
        ref={inputRef}
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t.inputPlaceholder}
        rows={1}
        disabled={disabled}
        data-testid={`input-prompt${testIdSuffix}`}
        className="flex-1 bg-transparent border-0 outline-none resize-none text-sm leading-6 placeholder:text-stone-400 disabled:opacity-50"
        style={{ color: "hsl(var(--foreground))", minHeight: "24px", maxHeight: "320px" }}
      />
      <button
        onClick={handleGenerate}
        disabled={!inputValue.trim() || isGenerating}
        data-testid={`button-send${testIdSuffix}`}
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
        style={{ backgroundColor: inputValue.trim() ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))", color: "hsl(var(--background))" }}
      >
        {isGenerating && testIdSuffix === "-chat" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>
    </div>
  );

  const usageWarning = () => {
    let text: string | null = null;
    if (!user && guestUsage && guestUsage.used >= 3) {
      const remaining = Math.max(0, guestUsage.limit - guestUsage.used);
      text = remaining === 0 ? "No prompts left today" : `${remaining} prompt${remaining === 1 ? "" : "s"} left today`;
    } else if (user) {
      const today = new Date().toISOString().split("T")[0];
      const thisMonth = new Date().toISOString().substring(0, 7);
      const dailyUsed = user.lastResetDate === today ? user.promptsUsedToday : 0;
      const monthlyUsed = user.lastMonthlyReset === thisMonth ? user.promptsUsedMonth : 0;
      if (user.plan === "free" && dailyUsed >= 3) {
        const remaining = Math.max(0, 5 - dailyUsed);
        text = remaining === 0 ? "No prompts left today" : `${remaining} prompt${remaining === 1 ? "" : "s"} left today`;
      } else if (user.plan === "starter" && monthlyUsed >= 450) {
        const remaining = Math.max(0, 500 - monthlyUsed);
        text = remaining === 0 ? "No prompts left this month" : `${remaining} prompt${remaining === 1 ? "" : "s"} left this month`;
      }
    }
    if (!text) return null;
    return (
      <p className="text-center text-[11px] mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
        {text}
      </p>
    );
  };

  const platformHint = (compact = false) => (
    <p
      className={`text-center ${compact ? "mt-2 text-[11px]" : "mt-3 text-xs"}`}
      style={{ color: "hsl(var(--muted-foreground))" }}
    >
      {t.platformHint}
    </p>
  );

  const toolPills = (testPrefix: string, compact = false) => (
    <div className={`flex flex-wrap gap-2 ${compact ? "mt-2" : "mt-3"} justify-center`}>
      {TOOL_PILLS.map(tool => (
        <button
          key={tool}
          onClick={() => setSelectedTool(selectedTool === tool ? null : tool)}
          data-testid={`pill-${testPrefix}-${tool.toLowerCase().replace(/[·\s]/g, "")}`}
          className="rounded-full text-xs font-medium transition-all"
          style={{
            padding: compact ? "4px 10px" : "6px 12px",
            backgroundColor: selectedTool === tool ? "hsl(var(--foreground))" : "hsl(var(--muted))",
            color: selectedTool === tool ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
            border: `1px solid ${selectedTool === tool ? "hsl(var(--foreground))" : "hsl(var(--border))"}`,
          }}
        >
          {tool}
        </button>
      ))}
    </div>
  );

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
      </div>
    );
  }

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      style={{
        "--sidebar-width": `${SIDEBAR_WIDTH}px`,
        "--sidebar-width-icon": "3rem",
      } as React.CSSProperties}
    >
      <div className="flex h-screen w-full bg-background">
        {/* Sidebar wrapper — collapses to 0 when closed so content fills the screen */}
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{ width: sidebarOpen ? SIDEBAR_WIDTH : 0, transition: "width 0.2s ease" }}
        >
          <div style={{ width: SIDEBAR_WIDTH, height: "100%" }}>
            <AppSidebar
              conversations={conversations}
              savedPrompts={savedPrompts}
              onSelectConversation={loadConversation}
              onSelectSavedPrompt={loadSavedPrompt}
              onNewChat={startNewChat}
              activeConversationId={currentConvId}
              onDeleteConversation={deleteConversation}
              onDeleteSavedPrompt={deleteSavedPrompt}
              onOpenLogin={openLogin}
              user={user}
            />
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <header
            className="flex items-center gap-2 px-4 h-12 shrink-0"
            style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
          >
            {!sidebarOpen && <SidebarTrigger className="text-stone-400" />}
            {detectedTool && hasMessages && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
                data-testid="badge-detected-tool"
              >
                {detectedTool}
              </span>
            )}
            {/* Top-right login/signup — only for guests */}
            {!user && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => openLogin("login")}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {t.logIn}
                </button>
                <button
                  onClick={() => openLogin("signup")}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: "hsl(var(--foreground))", color: "hsl(var(--background))" }}
                >
                  {t.signUpFree}
                </button>
              </div>
            )}
          </header>

          <main className="flex-1 flex flex-col overflow-hidden">
            {!hasMessages ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
                <h2
                  className="text-2xl md:text-3xl font-light text-center mb-10 leading-relaxed max-w-xl"
                  style={{ color: "hsl(var(--foreground))" }}
                  data-testid="text-welcome-heading"
                >
                  {t.welcomeHeading}
                </h2>

                <div className="relative flex items-center justify-center mb-10">
                  {/* Pulsing ring — only when listening */}
                  {isListening && (
                    <>
                      <span
                        className="absolute rounded-full animate-ping"
                        style={{ width: "70px", height: "70px", backgroundColor: "#1DB954", opacity: 0.25 }}
                      />
                      <span
                        className="absolute rounded-full animate-ping"
                        style={{ width: "84px", height: "84px", backgroundColor: "#1DB954", opacity: 0.12, animationDelay: "0.4s" }}
                      />
                    </>
                  )}
                  <button
                    onClick={toggleVoice}
                    data-testid="button-mic-center"
                    className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 select-none"
                    style={{
                      backgroundColor: "#ffffff",
                      border: "2px solid #e5e5e5",
                      boxShadow: isListening
                        ? "0 0 0 4px rgba(29,185,84,0.3), 0 4px 16px rgba(29,185,84,0.4)"
                        : "0 2px 8px rgba(0,0,0,0.12)",
                    }}
                  >
                    <Mic className="w-6 h-6" style={{ color: "#1DB954" }} />
                  </button>

                  {/* Speak hint — floats to the right of the mic */}
                  <button
                    onClick={toggleVoice}
                    className={`absolute text-xs transition-colors ${!isListening ? "animate-flicker" : ""}`}
                    style={{
                      left: "calc(50% + 40px)",
                      color: isListening ? "#1DB954" : "#c4c0bb",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isListening ? t.listening : t.clickToSpeak}
                  </button>
                </div>

                <div className="w-full max-w-2xl">
                  {usageWarning()}
                  {inputBox("")}
                  {platformHint()}
                  {toolPills("welcome")}
                </div>

                {/* Powered by Claude — bottom-left of landing page */}
                <div className="absolute bottom-4 left-4 flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "hsl(var(--muted-foreground))" }} />
                  </svg>
                  <span className="text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Powered by <span className="font-medium">Claude</span>
                  </span>
                </div>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 px-4 md:px-0">
                  <div className="max-w-2xl mx-auto py-6 space-y-6">
                    {messages.map((msg, index) => msg.role === ("wall" as any) ? (
                      <div key={msg.id} className="flex justify-center">
                        <div
                          className="rounded-2xl px-5 py-4 text-sm text-center max-w-sm"
                          style={{ backgroundColor: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
                        >
                          <p className="mb-3 leading-relaxed" style={{ color: "hsl(var(--foreground))" }}>
                            {msg.content}
                          </p>
                          {(msg as any).isGuest ? (
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => openLogin("signup")}
                                className="text-xs px-4 py-2 rounded-lg font-medium"
                                style={{ backgroundColor: "hsl(var(--foreground))", color: "hsl(var(--background))" }}
                              >
                                Sign up free
                              </button>
                              <button
                                onClick={() => openLogin("login")}
                                className="text-xs px-4 py-2 rounded-lg font-medium border"
                                style={{ color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }}
                              >
                                Log in
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setSidebarOpen(true)}
                              className="text-xs px-4 py-2 rounded-lg font-medium"
                              style={{ backgroundColor: "hsl(var(--foreground))", color: "hsl(var(--background))" }}
                            >
                              View plans
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                        data-testid={`message-${msg.role}-${index}`}
                      >
                        {/* Avatar */}
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            backgroundColor: msg.role === "user" ? "hsl(var(--foreground))" : "hsl(var(--muted))",
                            color: msg.role === "user" ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
                          }}
                        >
                          {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                        </div>

                        {/* Bubble */}
                        <div className={`max-w-[75%] min-w-0 flex flex-col ${msg.role === "user" ? "items-end ml-auto" : "items-start mr-auto"}`}>
                          <div
                            className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words"
                            style={msg.role === "user"
                              ? { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))", borderBottomRightRadius: "4px" }
                              : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))", borderBottomLeftRadius: "4px" }
                            }
                          >
                            {msg.isStreaming && !msg.content ? (
                              <span className="flex items-center gap-1.5 py-0.5">
                                <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{t.craftingPrompt}</span>
                                <span className="flex gap-1">
                                  {[0, 1, 2].map(i => (
                                    <span
                                      key={i}
                                      className="inline-block w-1.5 h-1.5 rounded-full animate-bounce"
                                      style={{ backgroundColor: "hsl(var(--muted-foreground))", animationDelay: `${i * 0.15}s` }}
                                    />
                                  ))}
                                </span>
                              </span>
                            ) : (
                              <>
                                {msg.content}
                                {msg.isStreaming && (
                                  <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ backgroundColor: "hsl(var(--muted-foreground))" }} />
                                )}
                              </>
                            )}
                          </div>
                          {msg.role === "assistant" && !msg.isStreaming && msg.content && (
                            <div className="flex gap-1 mt-1.5">
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => copyToClipboard(msg.content)}
                                data-testid={`button-copy-${index}`}
                                className="h-6 px-2 text-xs gap-1"
                                style={{ color: "hsl(var(--muted-foreground))" }}
                              >
                                <Copy className="w-3 h-3" /> {t.copy}
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => handleSave(msg)}
                                data-testid={`button-save-${index}`}
                                className="h-6 px-2 text-xs gap-1"
                                style={{ color: "hsl(var(--muted-foreground))" }}
                              >
                                <Bookmark className="w-3 h-3" /> {t.save}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="shrink-0 px-4 pb-4 pt-2" style={{ borderTop: "1px solid hsl(var(--border))" }}>
                  <div className="max-w-2xl mx-auto">
                    {usageWarning()}
                    {inputBox("-chat", isGenerating)}
                    {platformHint(true)}
                    {toolPills("chat", true)}
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {/* Login modal */}
      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        defaultMode={loginModalMode}
      />

      {/* Save dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save Prompt</DialogTitle></DialogHeader>
          <Input
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            placeholder="Give it a short name..."
            data-testid="input-save-name"
            onKeyDown={e => { if (e.key === "Enter") confirmSave(); }}
          />
          <DialogFooter>
            <Button onClick={confirmSave} disabled={!saveName.trim()} data-testid="button-confirm-save">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Login nudge — appears after 3 seconds for guests */}
      {showNudge && !user && (
        <div
          className="fixed bottom-6 right-6 z-50 rounded-2xl p-4 max-w-xs shadow-lg"
          style={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--popover-border))" }}
        >
          <button
            onClick={() => setShowNudge(false)}
            className="absolute top-3 right-3 w-5 h-5 flex items-center justify-center rounded-full transition-colors hover:bg-muted"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <X className="w-3 h-3" />
          </button>
          <p className="text-sm font-semibold mb-1 pr-4" style={{ color: "hsl(var(--foreground))" }}>
            {t.savePrompts}
          </p>
          <p className="text-xs mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
            {t.createFreeAccount}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowNudge(false); openLogin("login"); }}
              className="flex-1 text-xs py-1.5 rounded-lg font-medium border transition-colors"
              style={{ color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }}
            >
              {t.logIn}
            </button>
            <button
              onClick={() => { setShowNudge(false); openLogin("signup"); }}
              className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: "hsl(var(--foreground))", color: "hsl(var(--background))" }}
            >
              {t.signUpFree}
            </button>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
