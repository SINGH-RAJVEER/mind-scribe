import { useState, useEffect, useRef } from "react";
import {
  FaPaperPlane,
  FaSpinner,
  FaTrash,
  FaPlus,
  FaSignOutAlt,
} from "react-icons/fa";
import {
  useFetchChatHistory,
  useSendMessageStream,
  useDeleteChat,
} from "../hooks/useChat";
import { useLogout } from "../hooks/useLogout";
import useChatStore from "../store/chatStore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Sidebar } from "./ui/sidebar";
import headerImg from "../assets/header.png";
import ThemeToggle from "./ThemeToggle";

function Dashboard() {
  const {
    chatHistory,
    setChatHistory,
    selectedConversation,
    setSelectedConversation,
    loading,
  } = useChatStore();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");

  const { mutate: sendMessage, isPending: isMutationPending } =
    useSendMessageStream();
  const { data: chatHistoryData } = useFetchChatHistory();
  const { mutate: logout } = useLogout();
  const { mutate: deleteChat } = useDeleteChat();

  useEffect(() => {
    if (chatHistoryData) {
      setChatHistory(chatHistoryData);
    }
  }, [chatHistoryData, setChatHistory]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConversation?.messages, streamingMessage]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading || isMutationPending) return;

    const userMsg = prompt;
    setPrompt("");
    setStreamingMessage("");

    sendMessage(
      {
        message: userMsg,
        conversationId: selectedConversation?.id,
        onChunk: (chunk: string) => {
          setStreamingMessage((prev) => prev + chunk);
        },
      },
      {
        onSuccess: () => {
          setStreamingMessage("");
        },
        onError: () => {
          setStreamingMessage("");
        },
      },
    );
  };

  const startNewConversation = () => {
    setSelectedConversation(null);
    setPrompt("");
    setStreamingMessage("");
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    deleteChat(chatId);
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed((prev) => !prev)}
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            {chatHistory?.map((chat) => (
              <div
                key={chat.id}
                className={`p-3 hover:bg-accent cursor-pointer transition-colors duration-150 rounded-md mx-2 my-1 group ${
                  selectedConversation?.id === chat.id ? "bg-accent" : ""
                }`}
                onClick={() => setSelectedConversation(chat)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm flex-1">
                    {chat?.messages[0]?.user_message?.slice(0, 20) ||
                      "New Chat"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                  >
                    <FaTrash className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {!sidebarCollapsed && (
            <Button
              onClick={startNewConversation}
              className="m-3 w-auto flex items-center gap-2"
              size="sm"
            >
              <FaPlus className="h-4 w-4" />
              New Chat
            </Button>
          )}
        </div>
      </Sidebar>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col h-screen">
        {/* Header */}
        <header className="bg-card border-b border-border shadow-sm flex justify-between items-center px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <img
              src={headerImg}
              alt="MindScribe Logo"
              className="h-10 w-auto object-cover"
            />
            <h1 className="text-2xl font-bold text-foreground hidden sm:block">
              MindScribe
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              onClick={() => logout()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <FaSignOutAlt className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        {/* Chat Container */}
        <div className="flex-1 flex flex-col p-4 min-h-0 gap-4">
          {/* Messages Area */}
          <div className="flex-1 rounded-lg bg-card shadow-sm border border-border flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedConversation ? (
                <>
                  {selectedConversation.messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground text-lg">
                        Start the conversation
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedConversation.messages.map((message, idx) => (
                        <div
                          key={message.id || idx}
                          className="flex flex-col gap-3"
                        >
                          {message.user_message && (
                            <div className="flex justify-end">
                              <div className="from-primary to-primary/80 bg-gradient-to-r rounded-2xl px-4 py-2 max-w-xs sm:max-w-md lg:max-w-lg break-words text-primary-foreground shadow-sm">
                                {message.user_message}
                              </div>
                            </div>
                          )}
                          {message.bot_response && (
                            <div className="flex justify-start">
                              <div className="bg-muted rounded-2xl px-4 py-3 max-w-xs sm:max-w-md lg:max-w-lg break-words shadow-sm">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  className="prose prose-sm dark:prose-invert max-w-none text-foreground"
                                >
                                  {message.bot_response}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {streamingMessage && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl px-4 py-3 max-w-xs sm:max-w-md lg:max-w-lg break-words shadow-sm animate-pulse">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          className="prose prose-sm dark:prose-invert max-w-none text-foreground"
                        >
                          {streamingMessage}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {(loading || isMutationPending) && !streamingMessage && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FaSpinner className="animate-spin h-5 w-5" />
                        <span>Generating response...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-foreground mb-2">
                      Welcome to MindScribe
                    </p>
                    <p className="text-muted-foreground">
                      Start a new conversation to connect with support
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSendMessage}
            className="flex gap-3 flex-shrink-0"
          >
            <Input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Share your thoughts..."
              disabled={loading || isMutationPending}
              className="flex-1 rounded-full px-6"
              autoFocus
            />
            <Button
              type="submit"
              disabled={loading || isMutationPending || !prompt.trim()}
              size="lg"
              className="rounded-full px-6 gap-2"
            >
              {loading || isMutationPending ? (
                <FaSpinner className="animate-spin h-5 w-5" />
              ) : (
                <FaPaperPlane className="h-5 w-5" />
              )}
              <span className="hidden sm:inline">Send</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
