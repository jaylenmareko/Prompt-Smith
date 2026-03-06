import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Mic, Send, Copy, Bookmark, Loader2, MicOff, Menu, User, Sparkles } from "lucide-react";
import type { Conversation, ChatMessage, SavedPrompt } from "@shared/schema";

const TOOL_PILLS = ["ChatGPT", "Midjourney", "Cursor", "Replit", "Claude", "DALL·E", "Sora", "Gemini"];

interface LocalMessage {
  id: number | string;
  role: string;
  content: string;
  targetTool?: string | null;
  isStreaming?: boolean;
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [inputValue, setInputValue] = useState("");
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [detectedTool, setDetectedTool] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveTarget, setSaveTarget] = useState<{ promptText: string; targetTool: string; userInput: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const { data: conversationsData } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: !!user,
  });

  const { data: savedPromptsData } = useQuery<SavedPrompt[]>({
    queryKey: ["/api/saved-prompts"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
  }, [user, authLoading, setLocation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversation = useCallback(async (convId: number) => {
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, { credentials: "include" });
      if (res.ok) {
        const msgs = await res.json();
        setMessages(msgs);
        setActiveConversationId(convId);
        setDetectedTool(msgs.length > 0 ? msgs[0].targetTool : null);
      }
    } catch {
      toast({ title: "Failed to load conversation", variant: "destructive" });
    }
  }, [toast]);

  const loadSavedPrompt = useCallback((prompt: SavedPrompt) => {
    setInputValue(prompt.userInput);
    setSelectedTool(prompt.targetTool);
    inputRef.current?.focus();
  }, []);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    setDetectedTool(null);
    setInputValue("");
    setSelectedTool(null);
  }, []);

  const handleGenerate = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const userInput = inputValue.trim();
    setInputValue("");
    setIsGenerating(true);

    const userMsg: LocalMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: userInput,
    };
    const assistantMsg: LocalMessage = {
      id: `temp-assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      isStreaming: true,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          input: userInput,
          targetTool: selectedTool,
          conversationId: activeConversationId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      let fullContent = "";
      let convId = activeConversationId;
      let tool = selectedTool;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.conversationId) {
                convId = data.conversationId;
                setActiveConversationId(convId);
              }
              if (data.detectedTool) {
                tool = data.detectedTool;
                setDetectedTool(data.detectedTool);
              }
              if (data.content) {
                fullContent += data.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = { ...last, content: fullContent, targetTool: tool };
                  }
                  return updated;
                });
              }
              if (data.done) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last) {
                    updated[updated.length - 1] = { ...last, isStreaming: false };
                  }
                  return updated;
                });
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (parseErr: any) {
              if (parseErr.message && !parseErr.message.includes("Unexpected")) {
                throw parseErr;
              }
            }
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id));
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
    const userMsg = messages.find(
      (m, i) => m.role === "user" && messages[i + 1]?.id === msg.id
    );
    setSaveTarget({
      promptText: msg.content,
      targetTool: (msg.targetTool as string) || selectedTool || "ChatGPT",
      userInput: userMsg?.content || "",
    });
    setSaveName("");
    setSaveDialogOpen(true);
  };

  const confirmSave = async () => {
    if (!saveName.trim() || !saveTarget) return;
    try {
      await apiRequest("POST", "/api/saved-prompts", {
        name: saveName.trim(),
        ...saveTarget,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-prompts"] });
      toast({ title: "Prompt saved" });
      setSaveDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
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
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInputValue((prev) => {
        const base = prev.replace(/\s*\[listening\.\.\.\]\s*$/, "");
        return base + (base ? " " : "") + transcript;
      });
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: "#0f0f0f" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#c8a96e" }} />
      </div>
    );
  }

  if (!user) return null;

  const hasMessages = messages.length > 0;

  const sidebarStyle = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "0rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full" style={{ backgroundColor: "#0f0f0f" }}>
        <AppSidebar
          conversations={conversationsData || []}
          savedPrompts={savedPromptsData || []}
          onSelectConversation={loadConversation}
          onSelectSavedPrompt={loadSavedPrompt}
          onNewChat={startNewChat}
          activeConversationId={activeConversationId}
        />

        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center gap-2 px-4 h-12 shrink-0" style={{ borderBottom: "1px solid #1e1e1e" }}>
            <SidebarTrigger data-testid="button-sidebar-toggle" className="text-[#f0ece4aa]" />
            {detectedTool && hasMessages && (
              <Badge variant="outline" className="text-xs border-0" style={{ backgroundColor: "#1e1e1e", color: "#c8a96e" }} data-testid="badge-detected-tool">
                Detected: {detectedTool}
              </Badge>
            )}
          </header>

          <main className="flex-1 flex flex-col overflow-hidden">
            {!hasMessages ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6">
                <h2
                  className="text-2xl md:text-3xl font-light text-center mb-10 leading-relaxed max-w-xl"
                  style={{ color: "#f0ece4" }}
                  data-testid="text-welcome-heading"
                >
                  Tell me — what you want in your prompt, and for what app?
                </h2>

                <button
                  onClick={toggleVoice}
                  data-testid="button-mic-center"
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-10 transition-all duration-300"
                  style={{
                    backgroundColor: isListening ? "#c8a96e" : "#1e1e1e",
                    border: `2px solid ${isListening ? "#c8a96e" : "#2a2a2a"}`,
                  }}
                >
                  {isListening ? (
                    <MicOff className="w-8 h-8" style={{ color: "#0f0f0f" }} />
                  ) : (
                    <Mic className="w-8 h-8" style={{ color: "#c8a96e" }} />
                  )}
                </button>

                <div className="w-full max-w-2xl">
                  <div
                    className="flex items-end gap-2 rounded-2xl px-4 py-3"
                    style={{ backgroundColor: "#161616", border: "1px solid #2a2a2a" }}
                  >
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Describe what you want..."
                      rows={1}
                      data-testid="input-prompt"
                      className="flex-1 bg-transparent border-0 outline-none resize-none text-sm leading-6"
                      style={{ color: "#f0ece4", minHeight: "24px", maxHeight: "120px" }}
                      onInput={(e) => {
                        const el = e.target as HTMLTextAreaElement;
                        el.style.height = "auto";
                        el.style.height = Math.min(el.scrollHeight, 120) + "px";
                      }}
                    />
                    <button
                      onClick={toggleVoice}
                      data-testid="button-mic-input"
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                      style={{ color: isListening ? "#c8a96e" : "#f0ece4aa" }}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={handleGenerate}
                      disabled={!inputValue.trim() || isGenerating}
                      data-testid="button-send"
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                      style={{ backgroundColor: inputValue.trim() ? "#c8a96e" : "#2a2a2a", color: "#0f0f0f" }}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    {TOOL_PILLS.map((tool) => (
                      <button
                        key={tool}
                        onClick={() => setSelectedTool(selectedTool === tool ? null : tool)}
                        data-testid={`pill-${tool.toLowerCase().replace(/[·\s]/g, "")}`}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                        style={{
                          backgroundColor: selectedTool === tool ? "#c8a96e22" : "#1a1a1a",
                          color: selectedTool === tool ? "#c8a96e" : "#f0ece4aa",
                          border: `1px solid ${selectedTool === tool ? "#c8a96e44" : "#2a2a2a"}`,
                        }}
                      >
                        {tool}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 px-4 md:px-0">
                  <div className="max-w-2xl mx-auto py-6 space-y-6">
                    {messages.map((msg, index) => (
                      <div key={msg.id} className="flex gap-3" data-testid={`message-${msg.role}-${index}`}>
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: msg.role === "user" ? "#2a2a2a" : "#c8a96e22",
                            color: msg.role === "user" ? "#f0ece4" : "#c8a96e",
                          }}
                        >
                          {msg.role === "user" ? (
                            <User className="w-3.5 h-3.5" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium mb-1.5" style={{ color: "#f0ece4aa" }}>
                            {msg.role === "user" ? "You" : "PromptForge"}
                          </p>
                          <div
                            className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                            style={{ color: "#f0ece4" }}
                          >
                            {msg.content}
                            {msg.isStreaming && (
                              <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ backgroundColor: "#c8a96e" }} />
                            )}
                          </div>

                          {msg.role === "assistant" && !msg.isStreaming && msg.content && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(msg.content)}
                                data-testid={`button-copy-${index}`}
                                className="h-7 px-2.5 text-xs gap-1.5"
                                style={{ color: "#f0ece4aa" }}
                              >
                                <Copy className="w-3 h-3" />
                                Copy
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSave(msg)}
                                data-testid={`button-save-${index}`}
                                className="h-7 px-2.5 text-xs gap-1.5"
                                style={{ color: "#f0ece4aa" }}
                              >
                                <Bookmark className="w-3 h-3" />
                                Save
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="shrink-0 px-4 pb-4 pt-2">
                  <div className="max-w-2xl mx-auto">
                    <div
                      className="flex items-end gap-2 rounded-2xl px-4 py-3"
                      style={{ backgroundColor: "#161616", border: "1px solid #2a2a2a" }}
                    >
                      <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Describe what you want..."
                        rows={1}
                        disabled={isGenerating}
                        data-testid="input-prompt-chat"
                        className="flex-1 bg-transparent border-0 outline-none resize-none text-sm leading-6 disabled:opacity-50"
                        style={{ color: "#f0ece4", minHeight: "24px", maxHeight: "120px" }}
                        onInput={(e) => {
                          const el = e.target as HTMLTextAreaElement;
                          el.style.height = "auto";
                          el.style.height = Math.min(el.scrollHeight, 120) + "px";
                        }}
                      />
                      <button
                        onClick={toggleVoice}
                        data-testid="button-mic-chat"
                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ color: isListening ? "#c8a96e" : "#f0ece4aa" }}
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={handleGenerate}
                        disabled={!inputValue.trim() || isGenerating}
                        data-testid="button-send-chat"
                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                        style={{ backgroundColor: inputValue.trim() ? "#c8a96e" : "#2a2a2a", color: "#0f0f0f" }}
                      >
                        {isGenerating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3 justify-center">
                      {TOOL_PILLS.map((tool) => (
                        <button
                          key={tool}
                          onClick={() => setSelectedTool(selectedTool === tool ? null : tool)}
                          data-testid={`pill-chat-${tool.toLowerCase().replace(/[·\s]/g, "")}`}
                          className="px-2.5 py-1 rounded-full text-xs transition-all"
                          style={{
                            backgroundColor: selectedTool === tool ? "#c8a96e22" : "transparent",
                            color: selectedTool === tool ? "#c8a96e" : "#f0ece466",
                            border: `1px solid ${selectedTool === tool ? "#c8a96e44" : "#2a2a2a"}`,
                          }}
                        >
                          {tool}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent style={{ backgroundColor: "#161616", border: "1px solid #2a2a2a" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#f0ece4" }}>Save Prompt</DialogTitle>
          </DialogHeader>
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Give it a short name..."
            data-testid="input-save-name"
            className="border-0"
            style={{ backgroundColor: "#1a1a1a", color: "#f0ece4" }}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmSave();
            }}
          />
          <DialogFooter>
            <Button
              onClick={confirmSave}
              disabled={!saveName.trim()}
              data-testid="button-confirm-save"
              style={{ backgroundColor: "#c8a96e", color: "#0f0f0f" }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
