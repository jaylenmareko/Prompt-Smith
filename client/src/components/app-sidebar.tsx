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
import { useLanguage } from "@/lib/language-context";
import { queryClient } from "@/lib/queryClient";
import type { LocalConversation, LocalSavedPrompt } from "@/lib/types";
import type { Profile } from "@shared/schema";

const LANGUAGES = [
  "English", "Español", "Français", "Deutsch",
  "Português", "日本語", "中文", "한국어",
];

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
  const { lang, setLang, t } = useLanguage();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("general");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPrompts, setSearchPrompts] = useState("");
  const [savedOpen, setSavedOpen] = useState(false);

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
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setTheme("dark");
    }
  }, []);

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

  const BG     = "hsl(var(--background))";
  const CARD   = "hsl(var(--card))";
  const FG     = "hsl(var(--foreground))";
  const MUT    = "hsl(var(--muted))";
  const MUTFG  = "hsl(var(--muted-foreground))";
  const BORDER = "hsl(var(--border))";
  const SEC    = "hsl(var(--secondary))";

  const sectionBtn = (label: string, s: SettingsSection) => (
    <button
      key={s}
      onClick={() => setSettingsSection(s)}
      className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
      style={{
        backgroundColor: settingsSection === s ? SEC : "transparent",
        color: settingsSection === s ? FG : MUTFG,
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
        style={{ backgroundColor: BG, borderRight: `1px solid ${BORDER}`, width: "100%" }}
      >
        {/* Header */}
        <div className="px-3 pt-4 pb-1 flex-shrink-0 flex items-center justify-between">
          <button
            onClick={onNewChat}
            className="text-sm font-semibold tracking-wide px-1 hover:opacity-70 transition-opacity"
            style={{ color: FG }}
            data-testid="text-sidebar-logo"
          >
            Prompt Smith
          </button>
          <SidebarTrigger className="w-8 h-8 rounded-lg" style={{ color: MUTFG } as any} />
        </div>

        {/* New chat + Search */}
        <div className="px-3 pt-1 pb-2 flex-shrink-0 space-y-1">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ color: FG }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = SEC)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Plus className="w-4 h-4 shrink-0" style={{ color: MUTFG }} />
            {t.newChat}
          </button>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: MUT }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: MUTFG }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t.searchChats}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
              style={{ color: FG }}
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: MUT }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: MUTFG }} />
            <input
              type="text"
              value={searchPrompts}
              onChange={e => setSearchPrompts(e.target.value)}
              placeholder={t.searchSavedPrompts}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
              style={{ color: FG }}
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
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: FG }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = SEC)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <Bookmark className="w-4 h-4 shrink-0" style={{ color: MUTFG }} />
                <span className="flex-1 text-left">{t.savedPrompts}</span>
                <ChevronRight
                  className="w-4 h-4 shrink-0 transition-transform"
                  style={{ color: MUTFG, transform: savedOpen ? "rotate(90deg)" : "rotate(0deg)" }}
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
                    <p className="text-xs" style={{ color: MUTFG }}>
                      {searchPrompts ? t.noMatchingPrompts : t.noSavedPromptsYet}
                    </p>
                  </div>
                ) : filtered.map(prompt => (
                  <button
                    key={prompt.id}
                    onClick={() => onSelectSavedPrompt(prompt)}
                    data-testid={`saved-prompt-${prompt.id}`}
                    className="group w-full text-left py-2 px-3 rounded-lg transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = SEC)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate" style={{ color: FG }}>{prompt.name}</p>
                        <p className="text-xs truncate mt-0.5" style={{ color: MUTFG }}>{prompt.targetTool}</p>
                      </div>
                      <span
                        onClick={e => { e.stopPropagation(); onDeleteSavedPrompt(prompt.id); }}
                        className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity cursor-pointer p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ color: MUTFG }} />
                      </span>
                    </div>
                  </button>
                ));
              })()}
            </div>

            {/* Chats */}
            <div className="mt-4">
              <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium" style={{ color: FG }}>
                <MessageSquare className="w-4 h-4 shrink-0" style={{ color: MUTFG }} />
                {t.chats}
              </div>
              {(() => {
                const filtered = searchQuery.trim()
                  ? conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  : conversations;
                return filtered.length === 0 ? (
                  <div className="px-3 py-4 text-center">
                    <p className="text-xs" style={{ color: MUTFG }}>
                      {searchQuery ? t.noMatchingChats : t.noChatsYet}
                    </p>
                  </div>
                ) : filtered.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    data-testid={`conversation-${conv.id}`}
                    className="group w-full text-left py-2 px-3 rounded-lg transition-colors"
                    style={{ backgroundColor: activeConversationId === conv.id ? SEC : "transparent" }}
                    onMouseEnter={e => { if (activeConversationId !== conv.id) e.currentTarget.style.backgroundColor = SEC; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = activeConversationId === conv.id ? SEC : "transparent"; }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm truncate flex-1" style={{ color: FG }}>{conv.title}</p>
                      <span
                        onClick={e => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                        className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity cursor-pointer p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ color: MUTFG }} />
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
          style={{ borderTop: `1px solid ${BORDER}` }}
          ref={menuRef}
        >
          {user && menuOpen && (
            <div
              className="absolute left-3 right-3 rounded-xl shadow-lg py-1 z-50"
              style={{ bottom: "calc(100% + 6px)", backgroundColor: BG, border: `1px solid ${BORDER}` }}
            >
              <button
                onClick={() => openSettings("general")}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors"
                style={{ color: FG }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = SEC)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <Settings className="w-4 h-4 shrink-0" style={{ color: MUTFG }} />
                {t.settings}
              </button>

              <div style={{ height: "1px", backgroundColor: BORDER, margin: "4px 12px" }} />

              <button
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors"
                style={{ color: FG }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = SEC)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <Zap className="w-4 h-4 shrink-0" style={{ color: MUTFG }} />
                {t.upgradePlan}
              </button>

              <div style={{ height: "1px", backgroundColor: BORDER, margin: "4px 12px" }} />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors"
                style={{ color: FG }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = SEC)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <LogOut className="w-4 h-4 shrink-0" style={{ color: MUTFG }} />
                {t.logOut}
              </button>
            </div>
          )}

          {user ? (
            <button
              onClick={() => setMenuOpen(o => !o)}
              data-testid="button-profile"
              className="w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-colors"
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = SEC)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold"
                style={{ backgroundColor: FG, color: BG }}
              >
                {avatarLetter || <User className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs truncate" style={{ color: FG }}>{user?.email}</p>
                <p className="text-[10px] truncate" style={{ color: MUTFG }}>{planLabel}</p>
              </div>
            </button>
          ) : (
            <div className="flex flex-col gap-2 px-1">
              <button
                onClick={() => setLocation("/login?mode=signup")}
                className="w-full text-xs py-2 rounded-xl font-medium transition-colors"
                style={{ backgroundColor: FG, color: BG }}
              >
                {t.signUpFree}
              </button>
              <button
                onClick={() => setLocation("/login")}
                className="w-full text-xs py-2 rounded-xl font-medium flex items-center justify-center gap-1.5"
                style={{ color: FG, border: `1px solid ${BORDER}` }}
              >
                <LogIn className="w-3 h-3" />
                {t.logIn}
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
          <div className="flex h-full" style={{ backgroundColor: BG }}>
            {/* Left nav */}
            <div
              className="flex flex-col flex-shrink-0"
              style={{ width: "176px", borderRight: `1px solid ${BORDER}`, backgroundColor: CARD }}
            >
              <div className="px-4 pt-5 pb-4">
                <p className="text-sm font-semibold" style={{ color: FG }}>{t.settings}</p>
              </div>
              <nav className="flex flex-col gap-0.5 px-2">
                {sectionBtn(t.general, "general")}
                {sectionBtn(t.account, "account")}
                {sectionBtn(t.billing, "billing")}
              </nav>
            </div>

            {/* Right content */}
            <div className="flex-1 overflow-y-auto" style={{ backgroundColor: BG }}>

              {/* ── GENERAL ── */}
              {settingsSection === "general" && (
                <div className="p-6 space-y-8">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: MUTFG }}>{t.language}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {LANGUAGES.map(l => (
                        <button
                          key={l}
                          onClick={() => setLang(l)}
                          className="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors"
                          style={{
                            backgroundColor: lang === l ? SEC : MUT,
                            color: lang === l ? FG : MUTFG,
                          }}
                        >
                          {l}
                          {lang === l && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: MUTFG }} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: MUTFG }}>{t.appearance}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTheme("light")}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border"
                        style={{
                          backgroundColor: theme === "light" ? FG : MUT,
                          color: theme === "light" ? BG : MUTFG,
                          borderColor: theme === "light" ? FG : BORDER,
                        }}
                      >
                        <Sun className="w-4 h-4" />
                        {t.light}
                      </button>
                      <button
                        onClick={() => setTheme("dark")}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border"
                        style={{
                          backgroundColor: theme === "dark" ? FG : MUT,
                          color: theme === "dark" ? BG : MUTFG,
                          borderColor: theme === "dark" ? FG : BORDER,
                        }}
                      >
                        <Moon className="w-4 h-4" />
                        {t.dark}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ACCOUNT ── */}
              {settingsSection === "account" && (
                <div className="p-6 space-y-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: MUTFG }}>{t.emailAddress}</p>
                    <p className="text-sm mb-3" style={{ color: FG }}>{user?.email}</p>
                    <form onSubmit={handleEmailChange} className="space-y-2">
                      <Input type="email" placeholder={t.newEmailAddress} value={newEmail} onChange={e => setNewEmail(e.target.value)} className="h-9 text-sm" />
                      <Input type="password" placeholder={t.emailConfirmPass} value={emailConfirmPass} onChange={e => setEmailConfirmPass(e.target.value)} className="h-9 text-sm" />
                      <button
                        type="submit"
                        disabled={emailLoading || !newEmail.trim() || !emailConfirmPass}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                        style={{ backgroundColor: FG, color: BG }}
                      >
                        {emailLoading ? t.updating : t.updateEmail}
                      </button>
                    </form>
                  </div>

                  <div style={{ height: "1px", backgroundColor: BORDER }} />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: MUTFG }}>{t.password}</p>
                    <form onSubmit={handlePasswordChange} className="space-y-2">
                      <Input type="password" placeholder={t.currentPassword} value={currentPass} onChange={e => setCurrentPass(e.target.value)} className="h-9 text-sm" />
                      <Input type="password" placeholder={t.newPassword} value={newPass} onChange={e => setNewPass(e.target.value)} className="h-9 text-sm" />
                      <Input type="password" placeholder={t.confirmNewPassword} value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="h-9 text-sm" />
                      <button
                        type="submit"
                        disabled={passLoading || !currentPass || !newPass || !confirmPass}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                        style={{ backgroundColor: FG, color: BG }}
                      >
                        {passLoading ? t.updating : t.updatePassword}
                      </button>
                    </form>
                  </div>

                  <div style={{ height: "1px", backgroundColor: BORDER }} />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: MUTFG }}>{t.sessions}</p>
                    <p className="text-xs mb-3" style={{ color: MUTFG }}>{t.endsSession}</p>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
                      style={{ color: FG, borderColor: BORDER, backgroundColor: "transparent" }}
                    >
                      {t.logOutAllDevices}
                    </button>
                  </div>

                  <div style={{ height: "1px", backgroundColor: BORDER }} />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "hsl(var(--destructive))" }}>{t.dangerZone}</p>
                    <p className="text-xs mb-3" style={{ color: MUTFG }}>{t.cantBeUndone}</p>
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
                        style={{ color: "hsl(var(--destructive))", borderColor: "hsl(var(--destructive))", backgroundColor: "transparent" }}
                      >
                        {t.deleteAccount}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <Input type="password" placeholder={t.enterPasswordConfirm} value={deletePass} onChange={e => setDeletePass(e.target.value)} className="h-9 text-sm" />
                        <div className="flex gap-2">
                          <button
                            onClick={handleDeleteAccount}
                            disabled={deleteLoading || !deletePass}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                            style={{ backgroundColor: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" }}
                          >
                            {deleteLoading ? t.deleting : t.confirmDelete}
                          </button>
                          <button
                            onClick={() => { setShowDeleteConfirm(false); setDeletePass(""); }}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{ color: MUTFG, backgroundColor: MUT }}
                          >
                            {t.cancel}
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
                  <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: MUTFG }}>{t.subscription}</p>
                  <div className="rounded-xl p-4 border mb-4" style={{ borderColor: BORDER, backgroundColor: MUT }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: FG }}>{t.currentPlan}</p>
                        <p className="text-xs mt-0.5" style={{ color: MUTFG }}>{planLabel || "Free"}</p>
                      </div>
                      <button
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ backgroundColor: FG, color: BG }}
                      >
                        {t.upgrade}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: MUTFG }}>{t.billingComingSoon}</p>
                </div>
              )}

            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
