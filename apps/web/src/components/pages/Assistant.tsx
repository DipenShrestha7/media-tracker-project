import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import {
  Send,
  Sparkles,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "USER" | "AI";
  text: string;
  isStreaming?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

const API_BASE_URL = "http://localhost:8001/api";

const createSessionId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const createNewSession = (title = "New chat"): ChatSession => ({
  id: createSessionId(),
  title,
  updatedAt: Date.now(),
  messages: [],
});

export default function Assistant() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const storedSessions = localStorage.getItem("nexus-ai-sessions");

    if (!storedSessions) {
      return [createNewSession("New chat")];
    }

    try {
      const parsed = JSON.parse(storedSessions) as ChatSession[];
      return parsed.length > 0 ? parsed : [createNewSession("New chat")];
    } catch {
      return [createNewSession("New chat")];
    }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    const storedSessions = localStorage.getItem("nexus-ai-sessions");

    if (!storedSessions) {
      return "";
    }

    try {
      const parsed = JSON.parse(storedSessions) as ChatSession[];
      return parsed[0]?.id ?? "";
    } catch {
      return "";
    }
  });
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ??
    sessions[0] ??
    null;
  const messages = activeSession?.messages ?? [];
  const isEmpty = messages.length === 0;

  useEffect(() => {
    localStorage.setItem("nexus-ai-sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }

    if (
      activeSessionId &&
      !sessions.some((session) => session.id === activeSessionId)
    ) {
      setActiveSessionId(sessions[0]?.id ?? null);
    }
  }, [activeSessionId, sessions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      const clickedMenuButton = target.closest("[data-menu-button]");
      const clickedMenuPanel = target.closest("[data-menu-panel]");

      if (!clickedMenuButton && !clickedMenuPanel) {
        setMenuSessionId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createSession = (title = "New chat") => {
    const newSession = createNewSession(title);
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setMenuSessionId(null);
    return newSession.id;
  };

  const readStreamResponse = async (
    response: Response,
    onTokenReceived: (token: string) => void,
  ) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");

    if (!reader) {
      throw new Error("ReadableStream not supported on this response channel.");
    }

    let assemblyBuffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      assemblyBuffer += decoder.decode(value, { stream: true });
      const lines = assemblyBuffer.split("\n");
      assemblyBuffer = lines.pop() ?? "";

      for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i];

        if (
          currentLine.startsWith("LOG:") ||
          currentLine.startsWith("__LOG__:") ||
          currentLine.includes("Context verified successfully")
        ) {
          continue;
        }

        onTokenReceived(currentLine + "\n");
      }
    }

    if (assemblyBuffer.length > 0) {
      if (
        !assemblyBuffer.startsWith("LOG:") &&
        !assemblyBuffer.startsWith("__LOG__:") &&
        !assemblyBuffer.includes("Context verified successfully")
      ) {
        onTokenReceived(assemblyBuffer);
      }
    }
  };

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const token = localStorage.getItem("token") || "";

    const sessionId = activeSessionId ?? createSession("New chat");
    const userMsgId = Date.now().toString();
    const aiMsgId = (Date.now() + 1).toString();

    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: "USER",
      text: trimmedInput,
    };

    const aiMessage: ChatMessage = {
      id: aiMsgId,
      sender: "AI",
      text: "",
      isStreaming: true,
    };

    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;

        const nextTitle =
          session.title === "New chat" && session.messages.length === 0
            ? trimmedInput.slice(0, 28) +
              (trimmedInput.length > 28 ? "..." : "")
            : session.title;

        return {
          ...session,
          title: nextTitle,
          updatedAt: Date.now(),
          messages: [...session.messages, userMessage, aiMessage],
        };
      }),
    );

    setActiveSessionId(sessionId);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: trimmedInput,
          sessionId: sessionId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newSessionId = response.headers.get("X-Session-ID");
      if (newSessionId && !activeSessionId) {
        setActiveSessionId(newSessionId);
      }

      const onTokenReceived = (chunk: string) => {
        setSessions((prev) =>
          prev.map((session) => {
            if (session.id !== sessionId) return session;

            const updatedMessages = [...session.messages];
            const lastIndex = updatedMessages.length - 1;

            if (lastIndex >= 0 && updatedMessages[lastIndex].sender === "AI") {
              updatedMessages[lastIndex] = {
                ...updatedMessages[lastIndex],
                text: updatedMessages[lastIndex].text + chunk,
              };
            }

            return {
              ...session,
              updatedAt: Date.now(),
              messages: updatedMessages,
            };
          }),
        );
      };

      await readStreamResponse(response, onTokenReceived);
    } catch (error) {
      console.error("Streaming error:", error);
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== sessionId) return session;

          const updatedMessages = [...session.messages];
          const lastIndex = updatedMessages.length - 1;

          if (lastIndex >= 0 && updatedMessages[lastIndex].sender === "AI") {
            updatedMessages[lastIndex] = {
              ...updatedMessages[lastIndex],
              text:
                updatedMessages[lastIndex].text +
                "\n\n*[Error generating response. Please try again.]*",
            };
          }

          return {
            ...session,
            updatedAt: Date.now(),
            messages: updatedMessages,
          };
        }),
      );
    } finally {
      setIsLoading(false);
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== sessionId) return session;

          const updatedMessages = [...session.messages];
          const lastIndex = updatedMessages.length - 1;

          if (lastIndex >= 0 && updatedMessages[lastIndex].sender === "AI") {
            updatedMessages[lastIndex] = {
              ...updatedMessages[lastIndex],
              isStreaming: false,
            };
          }

          return {
            ...session,
            updatedAt: Date.now(),
            messages: updatedMessages,
          };
        }),
      );
    }
  };

  const handleRenameSession = (sessionId: string) => {
    const target = sessions.find((session) => session.id === sessionId);
    if (!target) return;

    const nextTitle = window.prompt("Rename this chat", target.title);
    if (!nextTitle || !nextTitle.trim()) return;

    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? { ...session, title: nextTitle.trim(), updatedAt: Date.now() }
          : session,
      ),
    );
    setMenuSessionId(null);
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => {
      const nextSessions = prev.filter((session) => session.id !== sessionId);
      if (nextSessions.length === 0) {
        const freshSession = createNewSession("New chat");
        setActiveSessionId(freshSession.id);
        return [freshSession];
      }

      if (activeSessionId === sessionId) {
        setActiveSessionId(nextSessions[0].id);
      }

      return nextSessions;
    });

    setMenuSessionId(null);
  };

  const handleSessionSelect = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setMenuSessionId(null);
  };

  return (
    <div className="h-[calc(100vh-72px)] w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex h-full w-full max-w-7xl mx-auto min-h-0">
        <aside
          ref={sidebarRef}
          className="w-[330px] shrink-0 border-r border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 p-4 min-h-0"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500 text-xs font-bold text-white shadow-sm">
                N
              </div>
              <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Nexus AI
              </span>
            </div>

            <button
              type="button"
              onClick={() => createSession("New chat")}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-2.5 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-950/70 dark:text-cyan-200"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New chat</span>
            </button>
          </div>

          <div className="mt-5">
            <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              Chats
            </h2>

            <div className="mt-3 space-y-2">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const isMenuOpen = menuSessionId === session.id;

                return (
                  <div
                    key={session.id}
                    className={`group relative flex items-center gap-2 rounded-2xl border px-3 py-2 transition ${
                      isActive
                        ? "border-cyan-200 bg-cyan-50 text-cyan-900 shadow-sm dark:border-cyan-900 dark:bg-cyan-950/70 dark:text-cyan-100"
                        : "border-transparent bg-slate-100/80 text-slate-700 hover:border-slate-200 hover:bg-slate-100 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-slate-700"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSessionSelect(session.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="truncate text-sm font-medium">
                        {session.title || "New chat"}
                      </div>
                      <div className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {session.messages.length > 0
                          ? session.messages[
                              session.messages.length - 1
                            ].text.slice(0, 32) || "No messages yet"
                          : "No messages yet"}
                      </div>
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        data-menu-button
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuSessionId(isMenuOpen ? null : session.id);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                        aria-label={`Open actions for ${session.title}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {isMenuOpen && (
                        <div
                          data-menu-panel
                          className="absolute right-0 top-10 z-20 w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                        >
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRenameSession(session.id);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteSession(session.id);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="flex h-full w-full flex-col overflow-hidden max-w-4xl mx-auto px-4 py-4 min-h-0">
            {isEmpty ? (
              <div className="flex flex-1 flex-col items-center justify-center space-y-6 max-w-2xl mx-auto w-full px-4">
                <h1 className="text-2xl md:text-3xl font-semibold text-slate-800 dark:text-slate-100 text-center">
                  What are we exploring today?
                </h1>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="relative flex items-center w-full"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask AI anything about movies, anime, or recaps..."
                    className="w-full pl-4 pr-12 py-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 p-2 bg-cyan-500 text-white rounded-xl transition-all hover:bg-cyan-600 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto py-6 space-y-4 pr-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 ${
                        msg.sender === "USER" ? "flex-row-reverse" : ""
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                          msg.sender === "USER"
                            ? "bg-cyan-500 text-white rounded-tr-none"
                            : "bg-slate-100 text-slate-900 rounded-tl-none border border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700/50"
                        }`}
                      >
                        {msg.sender === "USER" ? (
                          <p className="whitespace-pre-line">{msg.text}</p>
                        ) : (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw, rehypeSanitize]}
                            components={{
                              p: ({ node, ...props }) => (
                                <p
                                  className="mb-4 last:mb-0 leading-relaxed"
                                  {...props}
                                />
                              ),
                              h1: ({ node, ...props }) => (
                                <h1
                                  className="text-2xl font-bold text-slate-100 my-4 border-b border-slate-700 pb-2"
                                  {...props}
                                />
                              ),
                              h2: ({ node, ...props }) => (
                                <h2
                                  className="text-xl font-semibold text-slate-100 mt-6 mb-3"
                                  {...props}
                                />
                              ),
                              h3: ({ node, ...props }) => (
                                <h3
                                  className="text-lg font-medium text-slate-200 mt-5 mb-2"
                                  {...props}
                                />
                              ),
                              ul: ({ node, ...props }) => (
                                <ul
                                  className="list-disc list-inside my-3 space-y-1"
                                  {...props}
                                />
                              ),
                              ol: ({ node, ...props }) => (
                                <ol
                                  className="list-decimal list-inside my-3 space-y-1"
                                  {...props}
                                />
                              ),
                              li: ({ node, ...props }) => (
                                <li className="ml-2" {...props} />
                              ),
                              table: ({ node, ...props }) => (
                                <div className="overflow-x-auto my-4 rounded-lg border border-slate-700/60 shadow-sm">
                                  <table
                                    className="table-auto w-full divide-y divide-slate-700/60 text-sm text-left border-collapse"
                                    {...props}
                                  />
                                </div>
                              ),
                              th: ({ node, ...props }) => (
                                <th
                                  className="px-4 py-3 font-semibold bg-slate-800/80 text-slate-100 border-r border-slate-700/60 last:border-r-0"
                                  {...props}
                                />
                              ),
                              tbody: ({ node, ...props }) => (
                                <tbody
                                  className="divide-y divide-slate-800 bg-slate-900 text-slate-300"
                                  {...props}
                                />
                              ),
                              tr: ({ node, ...props }) => (
                                <tr
                                  className="border-b border-slate-800/80 last:border-b-0 hover:bg-slate-800/30 transition-colors"
                                  {...props}
                                />
                              ),
                              td: ({ node, ...props }) => (
                                <td
                                  className="px-4 py-3 align-top text-slate-300 border-r border-slate-700/60 last:border-r-0"
                                  {...props}
                                />
                              ),
                            }}
                          >
                            {msg.text}
                          </ReactMarkdown>
                        )}

                        {msg.isStreaming && (
                          <span className="animate-pulse font-bold ml-1 text-cyan-400">
                            ▌
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading &&
                    !messages.some(
                      (m) => m.isStreaming && m.text.length > 0,
                    ) && (
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-cyan-500 animate-spin" />
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Searching vector DB & web...
                          </span>
                        </div>
                      </div>
                    )}
                  <div ref={chatEndRef} />
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="relative flex items-center pt-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask AI anything about movies, anime, or recaps..."
                    className="w-full pl-4 pr-12 py-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 p-2 bg-cyan-500 text-white rounded-xl transition-all hover:bg-cyan-600 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
