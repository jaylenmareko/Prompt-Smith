import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Bookmark, Trash2, Settings, User, LogIn, LogOut, ChevronRight, Globe, Zap, SquarePen } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { LocalConversation, LocalSavedPrompt } from "@/lib/types";
import type { Profile } from "@shared/schema";

const LANGUAGES = [
  "English", "Español", "Français", "Deutsch",
  "Português", "日本語", "中文", "한국어",
];

const LANG_KEY = "ps_language";

const NAME_KEY = "ps_user_name";

interface AppSidebarProps {
  conversations: LocalConversation[];
  savedPrompts: LocalSavedPrompt[];
  onSelectConversation: (id: string) => void;
  onSelectSavedPrompt: (prompt: LocalSavedPrompt) => void;
  onNewChat: () => void;
  activeConversationId: string | null;
  onDeleteConversation: (id: string) => void;
  onDeleteSavedPrompt: (id: string) => void;
  user: Profile | null | undefined;
}

export function AppSidebar({
  conversations,
  savedPrompts,
  onSelectConversation,
  onSelectSavedPrompt,
  onNewChat,
  activeConversationId,
  onDeleteConversation,
  onDeleteSavedPrompt,
  user,
}: AppSidebarProps) {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem(NAME_KEY) || ""
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [langExpanded, setLangExpanded] = useState(false);
  const [selectedLang, setSelectedLang] = useState(
    () => localStorage.getItem(LANG_KEY) || "English"
  );
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setLangExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const openSettings = () => {
    setNameInput(displayName);
    setMenuOpen(false);
    setLangExpanded(false);
    setSettingsOpen(true);
  };

  const saveSettings = () => {
    const trimmed = nameInput.trim();
    setDisplayName(trimmed);
    localStorage.setItem(NAME_KEY, trimmed);
    setSettingsOpen(false);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    setLangExpanded(false);
    await logout();
    setLocation("/login");
  };

  const selectLanguage = (lang: string) => {
    setSelectedLang(lang);
    localStorage.setItem(LANG_KEY, lang);
    setLangExpanded(false);
  };

  const avatarLetter = user?.email.charAt(0).toUpperCase() ?? "";

  return (
    <>
      {/* Plain div — no shadcn Sidebar so it doesn't inject spacers into the flex layout */}
      <div
        className="flex flex-col h-full relative"
        style={{ backgroundColor: "#ffffff", borderRight: "1px solid #e5e2dd", width: "100%" }}
      >
        {/* Header */}
        <div className="px-3 pt-4 pb-2 flex-shrink-0 flex items-center justify-between">
          <h1
            className="text-sm font-semibold tracking-wide px-1"
            style={{ color: "#18181b" }}
            data-testid="text-sidebar-logo"
          >
            Prompt Smith
          </h1>
          <button
            onClick={onNewChat}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-stone-100"
            style={{ color: "#78716c" }}
            title="New chat"
          >
            <SquarePen className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-2">
          <div className="pb-4">

            {/* Saved Prompts section */}
            <div className="mt-3">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#a8a29e" }}>
                Saved
              </p>
              {savedPrompts.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs" style={{ color: "#a8a29e" }}>No saved prompts yet</p>
                </div>
              ) : (
                savedPrompts.map(prompt => (
                  <button
                    key={prompt.id}
                    onClick={() => onSelectSavedPrompt(prompt)}
                    data-testid={`saved-prompt-${prompt.id}`}
                    className="group w-full text-left py-2 px-3 rounded-lg hover:bg-stone-100 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate" style={{ color: "#18181b" }}>
                          {prompt.name}
                        </p>
                        <p className="text-xs truncate mt-0.5" style={{ color: "#a8a29e" }}>
                          {prompt.targetTool}
                        </p>
                      </div>
                      <span
                        onClick={e => { e.stopPropagation(); onDeleteSavedPrompt(prompt.id); }}
                        className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity cursor-pointer p-1 rounded hover:bg-stone-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ color: "#a8a29e" }} />
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Chats section */}
            <div className="mt-4">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#a8a29e" }}>
                Chats
              </p>
              {conversations.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs" style={{ color: "#a8a29e" }}>No chats yet</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    data-testid={`conversation-${conv.id}`}
                    className="group w-full text-left py-2 px-3 rounded-lg transition-colors"
                    style={{
                      backgroundColor: activeConversationId === conv.id ? "#f0ece8" : "transparent",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className="text-sm truncate flex-1"
                        style={{ color: activeConversationId === conv.id ? "#1c1a17" : "#44403c" }}
                      >
                        {conv.title}
                      </p>
                      <span
                        onClick={e => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                        className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity cursor-pointer p-1 rounded hover:bg-stone-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ color: "#a8a29e" }} />
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

          </div>
        </ScrollArea>

        {/* Footer */}
        <div
          className="flex-shrink-0 px-3 pb-3 pt-2 relative"
          style={{ borderTop: "1px solid #e5e2dd" }}
          ref={menuRef}
        >
          {/* Profile menu popup */}
          {user && menuOpen && (
            <div
              className="absolute left-3 right-3 rounded-xl shadow-lg py-1 z-50"
              style={{
                bottom: "calc(100% + 6px)",
                backgroundColor: "#ffffff",
                border: "1px solid #e5e2dd",
              }}
            >
              {/* Language */}
              <button
                onClick={() => setLangExpanded(o => !o)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-stone-50"
                style={{ color: "#1c1a17" }}
              >
                <Globe className="w-4 h-4 shrink-0" style={{ color: "#78716c" }} />
                <span className="flex-1 text-left">Language</span>
                <span className="text-xs mr-1" style={{ color: "#a8a29e" }}>{selectedLang}</span>
                <ChevronRight
                  className="w-3.5 h-3.5 shrink-0 transition-transform"
                  style={{ color: "#a8a29e", transform: langExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                />
              </button>
              {langExpanded && (
                <div className="pb-1">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang}
                      onClick={() => selectLanguage(lang)}
                      className="w-full flex items-center justify-between px-4 py-1.5 text-xs transition-colors hover:bg-stone-50"
                      style={{ color: selectedLang === lang ? "#1c1a17" : "#78716c", paddingLeft: "44px" }}
                    >
                      {lang}
                      {selectedLang === lang && (
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#1c1a17" }} />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Upgrade plan */}
              <button
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-stone-50"
                style={{ color: "#1c1a17" }}
              >
                <Zap className="w-4 h-4 shrink-0" style={{ color: "#78716c" }} />
                Upgrade plan
              </button>

              <div style={{ height: "1px", backgroundColor: "#e5e2dd", margin: "4px 12px" }} />

              {/* Settings */}
              <button
                onClick={openSettings}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-stone-50"
                style={{ color: "#1c1a17" }}
              >
                <Settings className="w-4 h-4 shrink-0" style={{ color: "#78716c" }} />
                Settings
              </button>

              <div style={{ height: "1px", backgroundColor: "#e5e2dd", margin: "4px 12px" }} />

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-stone-50"
                style={{ color: "#1c1a17" }}
              >
                <LogOut className="w-4 h-4 shrink-0" style={{ color: "#78716c" }} />
                Log out
              </button>
            </div>
          )}

          {user ? (
            <button
              onClick={() => { setMenuOpen(o => !o); setLangExpanded(false); }}
              data-testid="button-profile"
              className="w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-colors hover:bg-stone-100"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold"
                style={{ backgroundColor: "#1c1a17", color: "#ffffff" }}
              >
                {avatarLetter || <User className="w-4 h-4" />}
              </div>
              <p className="flex-1 text-left text-xs truncate" style={{ color: "#44403c" }}>
                {user?.email}
              </p>
            </button>
          ) : (
            <div className="flex flex-col gap-2 px-1">
              <button
                onClick={() => setLocation("/login?mode=signup")}
                className="w-full text-xs py-2 rounded-xl font-medium transition-colors"
                style={{ backgroundColor: "#1c1a17", color: "#ffffff" }}
              >
                Sign up free
              </button>
              <button
                onClick={() => setLocation("/login")}
                className="w-full text-xs py-2 rounded-xl font-medium flex items-center justify-center gap-1.5"
                style={{ color: "#1c1a17", border: "1px solid #e8dcc8" }}
              >
                <LogIn className="w-3 h-3" />
                Log in
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Settings modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Label htmlFor="display-name" className="text-sm font-medium">Display name</Label>
            <Input
              id="display-name"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Enter your name..."
              onKeyDown={e => { if (e.key === "Enter") saveSettings(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button onClick={saveSettings}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
