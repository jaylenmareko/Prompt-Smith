import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trash2, Settings, User, LogIn, LogOut, ChevronRight,
  Zap, Plus, Search, Bookmark, MessageSquare, Sun, Moon, Check,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { queryClient } from "@/lib/queryClient";
import type { LocalConversation, LocalSavedPrompt } from "@/lib/types";
import type { Profile } from "@shared/schema";

const LANGUAGES = [
  "English", "Español", "Français", "Deutsch",
  "Português", "日本語", "中文", "한국어",
];

const LANG_KEY = "ps_language";
const THEME_KEY = "ps_theme";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  max: "Max",
};

type SettingsSection = "general" | "account" | "billing";

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
  const { toast } = useToast();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("general");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPrompts, setSearchPrompts] = useState("");
  const [savedOpen, setSavedOpen] = useState(false);

  const [selectedLang, setSelectedLang] = useState(
    () => localStorage.getItem(LANG_KEY) || "English"
  );
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem(THEME_KEY) as "light" | "dark") || "light"
  );

  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [emailConfirmPass, setEmailConfirmPass] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Password change
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  // Delete account
  const [deletePass, setDeletePass] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const openSettings = (section: SettingsSection = "general") => {
    setMenuOpen(false);
    setSettingsSection(section);
    setNewEmail(""); setEmailConfirmPass("");
    setCurrentPass(""); setNewPass(""); setConfirmPass("");
    setDeletePass(""); setShowDeleteConfirm(false);
    setSettingsOpen(true);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    setLocation("/login");
  };

  const selectLanguage = (lang: string) => {
    setSelectedLang(lang);
    localStorage.setItem(LANG_KEY, lang);
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !emailConfirmPass) return;
    setEmailLoading(true);
    try {
      const res = await fetch("/api/auth/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: newEmail.trim(), password: emailConfirmPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Email updated" });
      setNewEmail(""); setEmailConfirmPass("");
    } catch (err: any) {
      toast({ title: "Failed to update email", description: err.message, variant: "destructive" });
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPass.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setPassLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Password updated" });
      setCurrentPass(""); setNewPass(""); setConfirmPass("");
    } catch (err: any) {
      toast({ title: "Failed to update password", description: err.message, variant: "destructive" });
    } finally {
      setPassLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePass) return;
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSettingsOpen(false);
      await logout();
      setLocation("/login");
    } catch (err: any) {
      toast({ title: "Failed to delete account", description: err.message, variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const avatarLetter = user?.email.charAt(0).toUpperCase() ?? "";
  const planLabel = user ? (PLAN_LABELS[user.plan] ?? user.plan) : "";

  const sectionBtn = (label: string, s: SettingsSection) => (
    <button
      key={s}
      onClick={() => setSettingsSection(s)}
      className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
      style={{
        backgroundColor: settingsSection === s ? "#f0ece8" : "transparent",
        color: settingsSection === s ? "#18181b" : "#78716c",
        fontWeight: settingsSection === s ? 500 : 400,
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div
        className="flex flex-col h-full relative"
        style={{ backgroundColor: "#ffffff", borderRight: "1px solid #e5e2dd", width: "100%" }}
      >
        {/* Header */}
        <div className="px-3 pt-4 pb-1 flex-shrink-0 flex items-center justify-between">
          <button
            onClick={onNewChat}
            className="text-sm font-semibold tracking-wide px-1 hover:opacity-70 transition-opacity"
            style={{ color: "#18181b" }}
            data-testid="text-sidebar-logo"
          >
            Prompt Smith
          </button>
          <SidebarTrigger className="w-8 h-8 text-stone-400 hover:bg-stone-100 rounded-lg" />
        </div>

        {/* New chat + Search */}
        <div className="px-3 pt-1 pb-2 flex-shrink-0 space-y-1">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-stone-100"
            style={{ color: "#44403c" }}
          >
            <Plus className="w-4 h-4 shrink-0" style={{ color: "#78716c" }} />
            New chat
          </button>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "#f5f5f4" }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: "#a8a29e" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search chats"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
              style={{ color: "#18181b" }}
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "#f5f5f4" }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: "#a8a29e" }} />
            <input
              type="text"
              value={searchPrompts}
              onChange={e => setSearchPrompts(e.target.value)}
              placeholder="Search saved prompts"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
              style={{ color: "#18181b" }}
            />
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-2">
          <div className="pb-4">
            {/* Saved Prompts */}
            <div className="mt-3">
              <button
                onClick={() => setSavedOpen(o => !o)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-stone-100"
                style={{ color: "#44403c" }}
              >
                <Bookmark className="w-4 h-4 shrink-0" style={{ color: "#78716c" }} />
                <span className="flex-1 text-left">Saved Prompts</span>
                <ChevronRight
                  className="w-4 h-4 shrink-0 transition-transform"
                  style={{ color: "#a8a29e", transform: savedOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                />
              </button>
              {savedOpen && (() => {
                const filtered = searchPrompts.trim()
                  ? savedPrompts.filter(p =>
                      p.name.toLowerCase().includes(searchPrompts.toLowerCase()) ||
                      p.targetTool.toLowerCase().includes(searchPrompts.toLowerCase()))
                  : savedPrompts;
                return filtered.length === 0 ? (
                  <div className="px-3 py-3 text-center">
                    <p className="text-xs" style={{ color: "#a8a29e" }}>
                      {searchPrompts ? "No matching prompts" : "No saved prompts yet"}
                    </p>
                  </div>
                ) : filtered.map(prompt => (
                  <button
                    key={prompt.id}
                    onClick={() => onSelectSavedPrompt(prompt)}
                    data-testid={`saved-prompt-${prompt.id}`}
                    className="group w-full text-left py-2 px-3 rounded-lg hover:bg-stone-100 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate" style={{ color: "#18181b" }}>{prompt.name}</p>
                        <p className="text-xs truncate mt-0.5" style={{ color: "#a8a29e" }}>{prompt.targetTool}</p>
                      </div>
                      <span
                        onClick={e => { e.stopPropagation(); onDeleteSavedPrompt(prompt.id); }}
                        className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity cursor-pointer p-1 rounded hover:bg-stone-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ color: "#a8a29e" }} />
                      </span>
                    </div>
                  </button>
                ));
              })()}
            </div>

            {/* Chats */}
            <div className="mt-4">
              <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium" style={{ color: "#44403c" }}>
                <MessageSquare className="w-4 h-4 shrink-0" style={{ color: "#78716c" }} />
                Chats
              </div>
              {(() => {
                const filtered = searchQuery.trim()
                  ? conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  : conversations;
                return filtered.length === 0 ? (
                  <div className="px-3 py-4 text-center">
                    <p className="text-xs" style={{ color: "#a8a29e" }}>
                      {searchQuery ? "No matching chats" : "No chats yet"}
                    </p>
                  </div>
                ) : filtered.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    data-testid={`conversation-${conv.id}`}
                    className="group w-full text-left py-2 px-3 rounded-lg transition-colors"
                    style={{ backgroundColor: activeConversationId === conv.id ? "#f0ece8" : "transparent" }}
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
                ));
              })()}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div
          className="flex-shrink-0 px-3 pb-3 pt-2 relative"
          style={{ borderTop: "1px solid #e5e2dd" }}
          ref={menuRef}
        >
          {/* Profile popup */}
          {user && menuOpen && (
            <div
              className="absolute left-3 right-3 rounded-xl shadow-lg py-1 z-50"
              style={{ bottom: "calc(100% + 6px)", backgroundColor: "#ffffff", border: "1px solid #e5e2dd" }}
            >
              <button
                onClick={() => openSettings("general")}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-stone-50"
                style={{ color: "#1c1a17" }}
              >
                <Settings className="w-4 h-4 shrink-0" style={{ color: "#78716c" }} />
                Settings
              </button>

              <div style={{ height: "1px", backgroundColor: "#e5e2dd", margin: "4px 12px" }} />

              <button
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-stone-50"
                style={{ color: "#1c1a17" }}
              >
                <Zap className="w-4 h-4 shrink-0" style={{ color: "#78716c" }} />
                Upgrade plan
              </button>

              <div style={{ height: "1px", backgroundColor: "#e5e2dd", margin: "4px 12px" }} />

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
              onClick={() => setMenuOpen(o => !o)}
              data-testid="button-profile"
              className="w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-colors hover:bg-stone-100"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold"
                style={{ backgroundColor: "#1c1a17", color: "#ffffff" }}
              >
                {avatarLetter || <User className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs truncate" style={{ color: "#44403c" }}>{user?.email}</p>
                <p className="text-[10px] truncate" style={{ color: "#a8a29e" }}>{planLabel}</p>
              </div>
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
        <DialogContent
          className="p-0 gap-0 overflow-hidden"
          style={{ maxWidth: "680px", width: "95vw", height: "600px" }}
        >
          <div className="flex h-full">
            {/* Left nav */}
            <div
              className="flex flex-col flex-shrink-0"
              style={{ width: "176px", borderRight: "1px solid #e5e2dd", backgroundColor: "#fafaf9" }}
            >
              <div className="px-4 pt-5 pb-4">
                <p className="text-sm font-semibold" style={{ color: "#18181b" }}>Settings</p>
              </div>
              <nav className="flex flex-col gap-0.5 px-2">
                {sectionBtn("General", "general")}
                {sectionBtn("Account", "account")}
                {sectionBtn("Billing", "billing")}
              </nav>
            </div>

            {/* Right content */}
            <div className="flex-1 overflow-y-auto">

              {/* ── GENERAL ── */}
              {settingsSection === "general" && (
                <div className="p-6 space-y-8">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#a8a29e" }}>Language</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {LANGUAGES.map(lang => (
                        <button
                          key={lang}
                          onClick={() => selectLanguage(lang)}
                          className="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors"
                          style={{
                            backgroundColor: selectedLang === lang ? "#f0ece8" : "#f5f5f4",
                            color: selectedLang === lang ? "#18181b" : "#78716c",
                          }}
                        >
                          {lang}
                          {selectedLang === lang && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "#78716c" }} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#a8a29e" }}>Appearance</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTheme("light")}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border"
                        style={{
                          backgroundColor: theme === "light" ? "#1c1a17" : "#f5f5f4",
                          color: theme === "light" ? "#ffffff" : "#78716c",
                          borderColor: theme === "light" ? "#1c1a17" : "#e5e2dd",
                        }}
                      >
                        <Sun className="w-4 h-4" />
                        Light
                      </button>
                      <button
                        onClick={() => setTheme("dark")}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border"
                        style={{
                          backgroundColor: theme === "dark" ? "#1c1a17" : "#f5f5f4",
                          color: theme === "dark" ? "#ffffff" : "#78716c",
                          borderColor: theme === "dark" ? "#1c1a17" : "#e5e2dd",
                        }}
                      >
                        <Moon className="w-4 h-4" />
                        Dark
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ACCOUNT ── */}
              {settingsSection === "account" && (
                <div className="p-6 space-y-6">
                  {/* Email */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#a8a29e" }}>Email address</p>
                    <p className="text-sm mb-3" style={{ color: "#44403c" }}>{user?.email}</p>
                    <form onSubmit={handleEmailChange} className="space-y-2">
                      <Input
                        type="email"
                        placeholder="New email address"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        className="h-9 text-sm"
                        style={{ backgroundColor: "#f5f5f4", border: "1px solid #e5e2dd" }}
                      />
                      <Input
                        type="password"
                        placeholder="Current password to confirm"
                        value={emailConfirmPass}
                        onChange={e => setEmailConfirmPass(e.target.value)}
                        className="h-9 text-sm"
                        style={{ backgroundColor: "#f5f5f4", border: "1px solid #e5e2dd" }}
                      />
                      <button
                        type="submit"
                        disabled={emailLoading || !newEmail.trim() || !emailConfirmPass}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                        style={{ backgroundColor: "#1c1a17", color: "#ffffff" }}
                      >
                        {emailLoading ? "Updating…" : "Update email"}
                      </button>
                    </form>
                  </div>

                  <div style={{ height: "1px", backgroundColor: "#e5e2dd" }} />

                  {/* Password */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#a8a29e" }}>Password</p>
                    <form onSubmit={handlePasswordChange} className="space-y-2">
                      <Input
                        type="password"
                        placeholder="Current password"
                        value={currentPass}
                        onChange={e => setCurrentPass(e.target.value)}
                        className="h-9 text-sm"
                        style={{ backgroundColor: "#f5f5f4", border: "1px solid #e5e2dd" }}
                      />
                      <Input
                        type="password"
                        placeholder="New password"
                        value={newPass}
                        onChange={e => setNewPass(e.target.value)}
                        className="h-9 text-sm"
                        style={{ backgroundColor: "#f5f5f4", border: "1px solid #e5e2dd" }}
                      />
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPass}
                        onChange={e => setConfirmPass(e.target.value)}
                        className="h-9 text-sm"
                        style={{ backgroundColor: "#f5f5f4", border: "1px solid #e5e2dd" }}
                      />
                      <button
                        type="submit"
                        disabled={passLoading || !currentPass || !newPass || !confirmPass}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                        style={{ backgroundColor: "#1c1a17", color: "#ffffff" }}
                      >
                        {passLoading ? "Updating…" : "Update password"}
                      </button>
                    </form>
                  </div>

                  <div style={{ height: "1px", backgroundColor: "#e5e2dd" }} />

                  {/* Log out of all devices */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#a8a29e" }}>Sessions</p>
                    <p className="text-xs mb-3" style={{ color: "#78716c" }}>Ends your current session on all devices.</p>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
                      style={{ color: "#18181b", borderColor: "#e5e2dd", backgroundColor: "#ffffff" }}
                    >
                      Log out of all devices
                    </button>
                  </div>

                  <div style={{ height: "1px", backgroundColor: "#e5e2dd" }} />

                  {/* Delete account */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#dc2626" }}>Danger zone</p>
                    <p className="text-xs mb-3" style={{ color: "#78716c" }}>
                      Permanently deletes your account and all data. This cannot be undone.
                    </p>
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
                        style={{ color: "#dc2626", borderColor: "#fecaca", backgroundColor: "#fff5f5" }}
                      >
                        Delete account
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          type="password"
                          placeholder="Enter your password to confirm"
                          value={deletePass}
                          onChange={e => setDeletePass(e.target.value)}
                          className="h-9 text-sm"
                          style={{ backgroundColor: "#f5f5f4", border: "1px solid #fecaca" }}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleDeleteAccount}
                            disabled={deleteLoading || !deletePass}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                            style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
                          >
                            {deleteLoading ? "Deleting…" : "Confirm delete"}
                          </button>
                          <button
                            onClick={() => { setShowDeleteConfirm(false); setDeletePass(""); }}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{ color: "#78716c", backgroundColor: "#f5f5f4" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── BILLING ── */}
              {settingsSection === "billing" && (
                <div className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#a8a29e" }}>Subscription</p>
                  <div
                    className="rounded-xl p-4 border mb-4"
                    style={{ borderColor: "#e5e2dd", backgroundColor: "#fafaf9" }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#18181b" }}>Current plan</p>
                        <p className="text-xs mt-0.5" style={{ color: "#a8a29e" }}>{planLabel || "Free"}</p>
                      </div>
                      <button
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ backgroundColor: "#1c1a17", color: "#ffffff" }}
                      >
                        Upgrade
                      </button>
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: "#a8a29e" }}>
                    Billing management coming soon.
                  </p>
                </div>
              )}

            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
