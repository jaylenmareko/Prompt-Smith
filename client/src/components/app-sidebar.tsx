import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Bookmark, LogOut, Trash2, CreditCard, Crown } from "lucide-react";
import type { Conversation, SavedPrompt } from "@shared/schema";

interface AppSidebarProps {
  conversations: Conversation[];
  savedPrompts: SavedPrompt[];
  onSelectConversation: (id: number) => void;
  onSelectSavedPrompt: (prompt: SavedPrompt) => void;
  onNewChat: () => void;
  activeConversationId: number | null;
}

export function AppSidebar({
  conversations,
  savedPrompts,
  onSelectConversation,
  onSelectSavedPrompt,
  onNewChat,
  activeConversationId,
}: AppSidebarProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("saved");

  const deleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest("DELETE", `/api/conversations/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    } catch {}
  };

  const deleteSavedPrompt = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest("DELETE", `/api/saved-prompts/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/saved-prompts"] });
    } catch {}
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const planLabel = (plan: string) => {
    const labels: Record<string, string> = {
      free: "Free",
      starter: "Starter",
      pro: "Pro",
      unlimited: "Unlimited",
    };
    return labels[plan] || "Free";
  };

  return (
    <Sidebar className="border-0" style={{ backgroundColor: "#161616" }}>
      <SidebarHeader className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <h1
            className="text-xs font-semibold tracking-[0.25em] uppercase"
            style={{ color: "#c8a96e" }}
            data-testid="text-sidebar-logo"
          >
            PromptForge
          </h1>
          <Button
            size="icon"
            variant="ghost"
            onClick={onNewChat}
            data-testid="button-new-chat"
            className="w-7 h-7"
            style={{ color: "#f0ece4aa" }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className="w-full grid grid-cols-2 h-8 rounded-lg border-0"
            style={{ backgroundColor: "#1a1a1a" }}
          >
            <TabsTrigger
              value="saved"
              data-testid="tab-saved-prompts"
              className="text-xs rounded-md data-[state=active]:bg-[#252525] data-[state=active]:text-[#f0ece4] data-[state=inactive]:text-[#f0ece466]"
            >
              <Bookmark className="w-3 h-3 mr-1.5" />
              Saved
            </TabsTrigger>
            <TabsTrigger
              value="chats"
              data-testid="tab-chats"
              className="text-xs rounded-md data-[state=active]:bg-[#252525] data-[state=active]:text-[#f0ece4] data-[state=inactive]:text-[#f0ece466]"
            >
              <MessageSquare className="w-3 h-3 mr-1.5" />
              Chats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="saved" className="mt-3">
            <ScrollArea className="h-[calc(100vh-240px)]">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {savedPrompts.length === 0 ? (
                      <div className="px-3 py-8 text-center">
                        <Bookmark className="w-5 h-5 mx-auto mb-2" style={{ color: "#f0ece433" }} />
                        <p className="text-xs" style={{ color: "#f0ece444" }}>
                          No saved prompts yet
                        </p>
                      </div>
                    ) : (
                      savedPrompts.map((prompt) => (
                        <SidebarMenuItem key={prompt.id}>
                          <SidebarMenuButton
                            onClick={() => onSelectSavedPrompt(prompt)}
                            data-testid={`saved-prompt-${prompt.id}`}
                            className="group py-2.5 px-3 rounded-lg"
                          >
                            <div className="flex items-center justify-between w-full gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium truncate" style={{ color: "#f0ece4cc" }}>
                                  {prompt.name}
                                </p>
                                <p className="text-[10px] truncate mt-0.5" style={{ color: "#f0ece444" }}>
                                  {prompt.targetTool}
                                </p>
                              </div>
                              <button
                                onClick={(e) => deleteSavedPrompt(prompt.id, e)}
                                className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
                                data-testid={`delete-saved-${prompt.id}`}
                              >
                                <Trash2 className="w-3 h-3" style={{ color: "#f0ece444" }} />
                              </button>
                            </div>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="chats" className="mt-3">
            <ScrollArea className="h-[calc(100vh-240px)]">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {conversations.length === 0 ? (
                      <div className="px-3 py-8 text-center">
                        <MessageSquare className="w-5 h-5 mx-auto mb-2" style={{ color: "#f0ece433" }} />
                        <p className="text-xs" style={{ color: "#f0ece444" }}>
                          No chats yet
                        </p>
                      </div>
                    ) : (
                      conversations.map((conv) => (
                        <SidebarMenuItem key={conv.id}>
                          <SidebarMenuButton
                            onClick={() => onSelectConversation(conv.id)}
                            data-testid={`conversation-${conv.id}`}
                            className="group py-2.5 px-3 rounded-lg"
                            data-active={activeConversationId === conv.id}
                          >
                            <div className="flex items-center justify-between w-full gap-2">
                              <p
                                className="text-xs truncate flex-1"
                                style={{ color: activeConversationId === conv.id ? "#f0ece4" : "#f0ece4aa" }}
                              >
                                {conv.title}
                              </p>
                              <button
                                onClick={(e) => deleteConversation(conv.id, e)}
                                className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
                                data-testid={`delete-conv-${conv.id}`}
                              >
                                <Trash2 className="w-3 h-3" style={{ color: "#f0ece444" }} />
                              </button>
                            </div>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SidebarContent>

      <SidebarFooter className="px-3 pb-3">
        <button
          onClick={() => setLocation("/pricing")}
          data-testid="button-pricing"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs mb-2 transition-colors"
          style={{ backgroundColor: "#c8a96e11", color: "#c8a96e" }}
        >
          <Crown className="w-3.5 h-3.5" />
          Upgrade Plan
        </button>
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
          style={{ backgroundColor: "#1a1a1a" }}
          data-testid="sidebar-profile"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
            style={{ backgroundColor: "#c8a96e22", color: "#c8a96e" }}
          >
            {user ? getInitials(user.email) : "??"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate" style={{ color: "#f0ece4cc" }}>
              {user?.email}
            </p>
            <p className="text-[10px]" style={{ color: "#c8a96e" }}>
              {user ? planLabel(user.plan) : "Free"}
            </p>
          </div>
          <button
            onClick={logout}
            data-testid="button-logout"
            className="shrink-0"
            style={{ color: "#f0ece444" }}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
