import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Bookmark, Trash2 } from "lucide-react";
import type { LocalConversation, LocalSavedPrompt } from "@/lib/types";

interface AppSidebarProps {
  conversations: LocalConversation[];
  savedPrompts: LocalSavedPrompt[];
  onSelectConversation: (id: string) => void;
  onSelectSavedPrompt: (prompt: LocalSavedPrompt) => void;
  onNewChat: () => void;
  activeConversationId: string | null;
  onDeleteConversation: (id: string) => void;
  onDeleteSavedPrompt: (id: string) => void;
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
}: AppSidebarProps) {
  const [activeTab, setActiveTab] = useState("saved");

  return (
    <Sidebar className="border-r-0" style={{ backgroundColor: "#f8f8f8", borderRight: "1px solid #e4e4e7" }}>
      <SidebarHeader className="px-4 pt-5 pb-3" style={{ backgroundColor: "#f8f8f8" }}>
        <div className="flex items-center justify-between">
          <h1
            className="text-sm font-semibold tracking-wide"
            style={{ color: "#18181b" }}
            data-testid="text-sidebar-logo"
          >
            Prompt Smith
          </h1>
          <Button
            size="icon"
            variant="ghost"
            onClick={onNewChat}
            data-testid="button-new-chat"
            className="w-7 h-7"
            style={{ color: "#71717a" }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2" style={{ backgroundColor: "#f8f8f8" }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className="w-full grid grid-cols-2 h-8 rounded-lg border-0"
            style={{ backgroundColor: "#ececec" }}
          >
            <TabsTrigger
              value="saved"
              data-testid="tab-saved-prompts"
              className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=inactive]:text-zinc-400"
            >
              <Bookmark className="w-3 h-3 mr-1.5" />
              Saved
            </TabsTrigger>
            <TabsTrigger
              value="chats"
              data-testid="tab-chats"
              className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=inactive]:text-zinc-400"
            >
              <MessageSquare className="w-3 h-3 mr-1.5" />
              Chats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="saved" className="mt-3">
            <ScrollArea className="h-[calc(100vh-120px)]">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {savedPrompts.length === 0 ? (
                      <div className="px-3 py-8 text-center">
                        <Bookmark className="w-5 h-5 mx-auto mb-2 text-zinc-300" />
                        <p className="text-xs text-zinc-400">No saved prompts yet</p>
                      </div>
                    ) : (
                      savedPrompts.map(prompt => (
                        <SidebarMenuItem key={prompt.id}>
                          <SidebarMenuButton
                            onClick={() => onSelectSavedPrompt(prompt)}
                            data-testid={`saved-prompt-${prompt.id}`}
                            className="group py-2.5 px-3 rounded-lg hover:bg-zinc-100"
                          >
                            <div className="flex items-center justify-between w-full gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium truncate" style={{ color: "#18181b" }}>
                                  {prompt.name}
                                </p>
                                <p className="text-[10px] truncate mt-0.5" style={{ color: "#6366f1" }}>
                                  {prompt.targetTool}
                                </p>
                              </div>
                              <button
                                onClick={e => { e.stopPropagation(); onDeleteSavedPrompt(prompt.id); }}
                                className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
                                data-testid={`delete-saved-${prompt.id}`}
                              >
                                <Trash2 className="w-3 h-3 text-zinc-400" />
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
            <ScrollArea className="h-[calc(100vh-120px)]">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {conversations.length === 0 ? (
                      <div className="px-3 py-8 text-center">
                        <MessageSquare className="w-5 h-5 mx-auto mb-2 text-zinc-300" />
                        <p className="text-xs text-zinc-400">No chats yet</p>
                      </div>
                    ) : (
                      conversations.map(conv => (
                        <SidebarMenuItem key={conv.id}>
                          <SidebarMenuButton
                            onClick={() => onSelectConversation(conv.id)}
                            data-testid={`conversation-${conv.id}`}
                            className="group py-2.5 px-3 rounded-lg hover:bg-zinc-100"
                            style={{
                              backgroundColor: activeConversationId === conv.id ? "#eef2ff" : "transparent",
                            }}
                          >
                            <div className="flex items-center justify-between w-full gap-2">
                              <p
                                className="text-xs truncate flex-1"
                                style={{ color: activeConversationId === conv.id ? "#6366f1" : "#18181b" }}
                              >
                                {conv.title}
                              </p>
                              <button
                                onClick={e => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                                className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
                                data-testid={`delete-conv-${conv.id}`}
                              >
                                <Trash2 className="w-3 h-3 text-zinc-400" />
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
    </Sidebar>
  );
}
