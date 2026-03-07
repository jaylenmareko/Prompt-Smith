import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { AppSidebar } from "@/components/app-sidebar";
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
import { Mic, Send, Copy, Bookmark, Loader2, MicOff, Sparkles, User, X } from "lucide-react";
import type { LocalMessage, LocalConversation, LocalSavedPrompt } from "@/lib/types";

const TOOL_PILLS = ["ChatGPT", "Midjourney", "Cursor", "Replit", "Claude", "DALL·E", "Sora", "Gemini"];

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
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(272);
  const [showNudge, setShowNudge] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [currentConvTitle, setCurrentConvTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [detectedTool, setDetectedTool] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  const [conversations, setConversations] = useState<LocalConversation[]>(getStoredConversations);
  const [savedPrompts, setSavedPrompts] = useState<LocalSavedPrompt[]>(getStoredSavedPrompts);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveTarget, setSaveTarget] = useState<{ promptText: string; targetTool: string; userInput: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Once auth resolves: open sidebar for guests, keep closed for logged-in users
  useEffect(() => {
    if (!authLoading) {
      setSidebarOpen(!user);
    }
  }, [authLoading, user]);

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

      // Open sidebar after first prompt for logged-in users
      if (user) setSidebarOpen(true);

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
    recognitionRef.current?.stop();
    setIsListening(false);
    setIsMuted(false);
    isMutedRef.current = false;
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
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      if (isMutedRef.current) return;
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInputValue(prev => {
        const base = prev.replace(/\s*\[listening\.\.\.\]\s*$/, "");
        return base + (base ? " " : "") + transcript;
      });
    };
    recognition.onerror = () => { setIsListening(false); setIsMuted(false); isMutedRef.current = false; };
    recognition.onend = () => { setIsListening(false); setIsMuted(false); isMutedRef.current = false; };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setIsMuted(false);
    isMutedRef.current = false;
  };

  const toggleMute = () => {
    if (!isListening) return;
    const next = !isMuted;
    setIsMuted(next);
    isMutedRef.current = next;
  };

  const hasMessages = messages.length > 0;

  const inputBox = (testIdSuffix: string, disabled = false) => (
    <div
      className="flex items-end gap-2 rounded-2xl px-4 py-3"
      style={{ backgroundColor: "#f0ece8", border: "1px solid #e5e2dd" }}
    >
      <textarea
        ref={inputRef}
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe what you want..."
        rows={1}
        disabled={disabled}
        data-testid={`input-prompt${testIdSuffix}`}
        className="flex-1 bg-transparent border-0 outline-none resize-none text-sm leading-6 placeholder:text-stone-300 disabled:opacity-50"
        style={{ color: "#18181b", minHeight: "24px", maxHeight: "120px" }}
        onInput={e => {
          const el = e.target as HTMLTextAreaElement;
          el.style.height = "auto";
          el.style.height = Math.min(el.scrollHeight, 120) + "px";
        }}
      />
      <button
        onClick={toggleMute}
        data-testid={`button-mic${testIdSuffix}`}
        disabled={!isListening}
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-30"
        style={{ color: isMuted ? "#ef4444" : isListening ? "#1DB954" : "#a8a29e" }}
        title={isListening ? (isMuted ? "Unmute" : "Mute") : "Start mic from the button below"}
      >
        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
      <button
        onClick={handleGenerate}
        disabled={!inputValue.trim() || isGenerating}
        data-testid={`button-send${testIdSuffix}`}
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
        style={{ backgroundColor: inputValue.trim() ? "#1c1a17" : "#d6d3d1", color: "#ffffff" }}
      >
        {isGenerating && testIdSuffix === "-chat" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>
    </div>
  );

  const platformHint = (compact = false) => (
    <p
      className={`text-center ${compact ? "mt-2 text-[11px]" : "mt-3 text-xs"}`}
      style={{ color: "#a8a29e" }}
    >
      Choose your platform — or just mention it in your description
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
            backgroundColor: selectedTool === tool ? "#1c1a17" : "#f0ece8",
            color: selectedTool === tool ? "#ffffff" : "#78716c",
            border: `1px solid ${selectedTool === tool ? "#1c1a17" : "#e5e2dd"}`,
          }}
        >
          {tool}
        </button>
      ))}
    </div>
  );

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: "#faf8f5" }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#78716c" }} />
      </div>
    );
  }

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      style={{
        "--sidebar-width": `${sidebarWidth}px`,
        "--sidebar-width-icon": "3rem",
      } as React.CSSProperties}
    >
      <div className="flex h-screen w-full" style={{ backgroundColor: "#faf8f5" }}>
        {/* Sidebar wrapper — collapses to 0 when closed so content fills the screen */}
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{ width: sidebarOpen ? sidebarWidth : 0, transition: "width 0.2s ease" }}
        >
          <div style={{ width: sidebarWidth, height: "100%" }}>
            <AppSidebar
              conversations={conversations}
              savedPrompts={savedPrompts}
              onSelectConversation={loadConversation}
              onSelectSavedPrompt={loadSavedPrompt}
              onNewChat={startNewChat}
              activeConversationId={currentConvId}
              onDeleteConversation={deleteConversation}
              onDeleteSavedPrompt={deleteSavedPrompt}
              sidebarWidth={sidebarWidth}
              onResize={setSidebarWidth}
              user={user}
            />
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <header
            className="flex items-center gap-2 px-4 h-12 shrink-0"
            style={{ borderBottom: "1px solid #e5e2dd", backgroundColor: "#faf8f5" }}
          >
            <SidebarTrigger className="text-stone-400" />
            {detectedTool && hasMessages && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#f0ece8", color: "#78716c" }}
                data-testid="badge-detected-tool"
              >
                {detectedTool}
              </span>
            )}
            {/* Top-right login/signup — only for guests */}
            {!user && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setLocation("/login")}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                  style={{ color: "#78716c" }}
                >
                  Log in
                </button>
                <button
                  onClick={() => setLocation("/login?mode=signup")}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: "#1c1a17", color: "#ffffff" }}
                >
                  Sign up
                </button>
              </div>
            )}
          </header>

          <main className="flex-1 flex flex-col overflow-hidden">
            {!hasMessages ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6">
                <h2
                  className="text-2xl md:text-3xl font-light text-center mb-10 leading-relaxed max-w-xl"
                  style={{ color: "#18181b" }}
                  data-testid="text-welcome-heading"
                >
                  I'll create the perfect prompt for any AI tool
                </h2>

                <button
                  onClick={toggleVoice}
                  data-testid="button-mic-center"
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-10 transition-all duration-300"
                  style={{
                    backgroundColor: "#1DB954",
                    border: "2px solid #1DB954",
                  }}
                >
                  {isListening
                    ? <MicOff className="w-8 h-8" style={{ color: "#ffffff" }} />
                    : <Mic className="w-8 h-8" style={{ color: "#ffffff" }} />}
                </button>

                <div className="w-full max-w-2xl">
                  {inputBox("")}
                  {platformHint()}
                  {toolPills("welcome")}
                </div>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 px-4 md:px-0">
                  <div className="max-w-2xl mx-auto py-6 space-y-6">
                    {messages.map((msg, index) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                        data-testid={`message-${msg.role}-${index}`}
                      >
                        {/* Avatar */}
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            backgroundColor: msg.role === "user" ? "#1c1a17" : "#f0ece8",
                            color: msg.role === "user" ? "#ffffff" : "#78716c",
                          }}
                        >
                          {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                        </div>

                        {/* Bubble */}
                        <div className={`max-w-[75%] min-w-0 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                          <div
                            className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words"
                            style={msg.role === "user"
                              ? { backgroundColor: "#1c1a17", color: "#ffffff", borderBottomRightRadius: "4px" }
                              : { backgroundColor: "#f0ece8", color: "#18181b", borderBottomLeftRadius: "4px" }
                            }
                          >
                            {msg.isStreaming && !msg.content ? (
                              <span className="flex items-center gap-1.5 py-0.5">
                                <span className="text-xs" style={{ color: "#78716c" }}>Crafting your prompt</span>
                                <span className="flex gap-1">
                                  {[0, 1, 2].map(i => (
                                    <span
                                      key={i}
                                      className="inline-block w-1.5 h-1.5 rounded-full animate-bounce"
                                      style={{ backgroundColor: "#a8a29e", animationDelay: `${i * 0.15}s` }}
                                    />
                                  ))}
                                </span>
                              </span>
                            ) : (
                              <>
                                {msg.content}
                                {msg.isStreaming && (
                                  <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ backgroundColor: "#78716c" }} />
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
                                style={{ color: "#a8a29e" }}
                              >
                                <Copy className="w-3 h-3" /> Copy
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => handleSave(msg)}
                                data-testid={`button-save-${index}`}
                                className="h-6 px-2 text-xs gap-1"
                                style={{ color: "#a8a29e" }}
                              >
                                <Bookmark className="w-3 h-3" /> Save
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="shrink-0 px-4 pb-4 pt-2" style={{ borderTop: "1px solid #e5e2dd" }}>
                  <div className="max-w-2xl mx-auto">
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
          style={{ backgroundColor: "#ffffff", border: "1px solid #e5e2dd" }}
        >
          <button
            onClick={() => setShowNudge(false)}
            className="absolute top-3 right-3 w-5 h-5 flex items-center justify-center rounded-full transition-colors hover:bg-stone-100"
            style={{ color: "#a8a29e" }}
          >
            <X className="w-3 h-3" />
          </button>
          <p className="text-sm font-semibold mb-1 pr-4" style={{ color: "#18181b" }}>
            Save your prompts
          </p>
          <p className="text-xs mb-3" style={{ color: "#71717a" }}>
            Create a free account to keep your history and saved prompts across sessions.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setLocation("/login")}
              className="flex-1 text-xs py-1.5 rounded-lg font-medium border transition-colors"
              style={{ color: "#78716c", borderColor: "#e5e2dd" }}
            >
              Log in
            </button>
            <button
              onClick={() => setLocation("/login?mode=signup")}
              className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: "#1c1a17", color: "#ffffff" }}
            >
              Sign up free
            </button>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
