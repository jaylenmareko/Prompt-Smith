export interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  targetTool?: string | null;
  isStreaming?: boolean;
  isClarification?: boolean;
}

export interface LocalConversation {
  id: string;
  title: string;
  messages: LocalMessage[];
  createdAt: string;
}

export interface LocalSavedPrompt {
  id: string;
  name: string;
  promptText: string;
  targetTool: string;
  userInput: string;
  createdAt: string;
}
