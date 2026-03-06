import { useState } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Bookmark, Trash2, Settings, User, LogIn } from "lucide-react";
import type { LocalConversation, LocalSavedPrompt } from "@/lib/types";
import type { Profile } from "@shared/schema";

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
  sidebarWidth: number;
  onResize: (width: number) => void;
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
  sidebarWidth,
  onResize,
  user,
}: AppSidebarProps) {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("saved");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem(NAME_KEY) || ""
  );

  const openSettings = () => {
    setNameInput(displayName);
    setSettingsOpen(true);
  };

  const saveSettings = () => {
    const trimmed = nameInput.trim();
    setDisplayName(trimmed);
    localStorage.setItem(NAME_KEY, trimmed);
    setSettingsOpen(false);
  };

  const profileName = user ? (displayName || user.email.split("@")[0]) : null;
  const avatarLetter = profileName?.charAt(0).toUpperCase() ?? "";

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      onResize(Math.max(180, Math.min(480, startWidth + (ev.clientX - startX))));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <>
      {/* Plain div — no shadcn Sidebar so it doesn't inject spacers into the flex layout */}
      <div
        className="flex flex-col h-full relative"
        style={{ backgroundColor: "#f5f0e8", borderRight: "1px solid #e8dcc8", width: "100%" }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3 flex-shrink-0">
          <h1
            className="text-sm font-semibold tracking-wide"
            style={{ color: "#18181b" }}
            data-testid="text-sidebar-logo"
          >
            Prompt Smith
          </h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden px-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList
              className="w-full grid grid-cols-2 h-8 rounded-lg border-0"
              style={{ backgroundColor: "#eddfc8" }}
            >
              <TabsTrigger
                value="saved"
                data-testid="tab-saved-prompts"
                className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:text-stone-800 data-[state=inactive]:text-stone-400"
              >
                <Bookmark className="w-3 h-3 mr-1.5" />
                Saved
              </TabsTrigger>
              <TabsTrigger
                value="chats"
                data-testid="tab-chats"
                className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:text-stone-800 data-[state=inactive]:text-stone-400"
              >
                <MessageSquare className="w-3 h-3 mr-1.5" />
                Chats
              </TabsTrigger>
            </TabsList>

            <TabsContent value="saved" className="mt-3">
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="space-y-0.5">
                  {savedPrompts.length === 0 ? (
                    <div className="px-3 py-8 text-center">
                      <Bookmark className="w-5 h-5 mx-auto mb-2" style={{ color: "#e8dcc8" }} />
                      <p className="text-xs" style={{ color: "#a8a29e" }}>No saved prompts yet</p>
                    </div>
                  ) : (
                    savedPrompts.map(prompt => (
                      <button
                        key={prompt.id}
                        onClick={() => onSelectSavedPrompt(prompt)}
                        data-testid={`saved-prompt-${prompt.id}`}
                        className="group w-full text-left py-2.5 px-3 rounded-lg hover:bg-stone-100 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate" style={{ color: "#18181b" }}>
                              {prompt.name}
                            </p>
                            <p className="text-[10px] truncate mt-0.5" style={{ color: "#1c1a17" }}>
                              {prompt.targetTool}
                            </p>
                          </div>
                          <span
                            onClick={e => { e.stopPropagation(); onDeleteSavedPrompt(prompt.id); }}
                            className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" style={{ color: "#a8a29e" }} />
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="chats" className="mt-3">
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="space-y-0.5">
                  {conversations.length === 0 ? (
                    <div className="px-3 py-8 text-center">
                      <MessageSquare className="w-5 h-5 mx-auto mb-2" style={{ color: "#e8dcc8" }} />
                      <p className="text-xs" style={{ color: "#a8a29e" }}>No chats yet</p>
                    </div>
                  ) : (
                    conversations.map(conv => (
                      <button
                        key={conv.id}
                        onClick={() => onSelectConversation(conv.id)}
                        data-testid={`conversation-${conv.id}`}
                        className="group w-full text-left py-2.5 px-3 rounded-lg transition-colors"
                        style={{
                          backgroundColor: activeConversationId === conv.id ? "#e5e2dd" : "transparent",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className="text-xs truncate flex-1"
                            style={{ color: activeConversationId === conv.id ? "#1c1a17" : "#44403c" }}
                          >
                            {conv.title}
                          </p>
                          <span
                            onClick={e => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                            className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" style={{ color: "#a8a29e" }} />
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 px-3 pb-3 pt-2"
          style={{ borderTop: "1px solid #e8dcc8" }}
        >
          {user ? (
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold"
                style={{ backgroundColor: "#1c1a17", color: "#ffffff" }}
              >
                {avatarLetter || <User className="w-4 h-4" />}
              </div>
              <p className="flex-1 text-sm font-medium truncate" style={{ color: "#18181b" }}>
                {profileName}
              </p>
              <button
                onClick={openSettings}
                data-testid="button-settings"
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-stone-100"
                style={{ color: "#78716c" }}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
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

        {/* Drag-to-resize handle */}
        <div
          onMouseDown={startResize}
          className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize z-10 transition-colors hover:bg-stone-300"
          style={{ backgroundColor: "#e8dcc8" }}
        />
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
