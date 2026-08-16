import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import axios from "axios";
import { useNavigate } from "react-router";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Send,
  Sparkles,
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
  updatedAt?: number | string;
}

const API_BASE_URL = `${import.meta.env.VITE_API_URL || "http://localhost:8001"}/api`;

export default function Assistant() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStartedStreaming, setHasStartedStreaming] = useState(false);
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem("nexus_token") || "";
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const isEmpty = messages.length === 0;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 1. Fetch Sessions List on Load
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/sessions`, {
          headers: authHeaders,
        });
        if (!res.data) return;

        const data = await res.data;
        const rawSessions = Array.isArray(data) ? data : data.sessions || [];

        const formattedSessions: ChatSession[] = rawSessions.map((s: any) => ({
          id: s.session_id || s.id,
          title: s.title || "New chat",
          updatedAt: s.updated_at || s.updatedAt,
        }));

        setSessions(formattedSessions);

        if (formattedSessions.length > 0 && !activeSessionId) {
          setActiveSessionId(formattedSessions[0].id);
        }
      } catch (error) {
        console.error("Failed to load sessions:", error);
      }
    };

    fetchSessions();
  }, []);

  const fetchMessagesForSession = async (sessionId: string | null) => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    try {
      const res = await axios.get(
        `${API_BASE_URL}/sessions/${sessionId}/messages`,
        {
          headers: authHeaders,
        },
      );
      if (!res.data) {
        setMessages([]);
        return;
      }

      const rawMsgs = Array.isArray(res.data)
        ? res.data
        : res.data.messages || [];

      const formattedMsgs: ChatMessage[] = rawMsgs.map((m: any) => {
        const currentSender = (m.sender || m.role || "").toLowerCase();

        return {
          id: m.id || m.message_id || Date.now().toString(),
          sender: currentSender === "user" ? "USER" : "AI",
          text: m.text || m.content || "",
        };
      });

      setMessages(formattedMsgs);
    } catch (error) {
      console.error("Failed to fetch session messages:", error);
      setMessages([]);
    }
  };

  // 2. Fetch Messages when Active Session Changes
  useEffect(() => {
    void fetchMessagesForSession(activeSessionId);
  }, [activeSessionId]);

  // 3. Outside Click Handler for Action Menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest("[data-menu-button]") &&
        !target.closest("[data-menu-panel]")
      ) {
        setMenuSessionId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const createSession = async (userPrompt: string): Promise<string | null> => {
    if (!token) {
      console.error("No auth token found in localStorage.");
      return null;
    }

    try {
      const res = await axios.post(
        `${API_BASE_URL}/sessions`,
        { firstPrompt: userPrompt },
        { headers: authHeaders },
      );

      if (!res.data) throw new Error("No response data from server");

      const newSessionId = res.data.session_id || res.data.id;

      if (!newSessionId) {
        console.error("Backend response is missing session_id:", res.data);
        return null;
      }
      const newSession: ChatSession = {
        id: newSessionId,
        title: res.data.title || userPrompt,
        updatedAt: Date.now(),
      };

      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSessionId);

      return newSessionId;
    } catch (error) {
      console.error("Error creating session:", error);
      return null;
    }
  };

  // 5. Stream Decoder
  const readStreamResponse = async (
    response: Response,
    onTokenReceived: (token: string) => void,
  ) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");

    if (!reader)
      throw new Error("ReadableStream not supported on response channel.");

    let assemblyBuffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      assemblyBuffer += decoder.decode(value, { stream: true });
      const lines = assemblyBuffer.split(/\r?\n/);
      assemblyBuffer = lines.pop() ?? "";

      for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i].trimEnd();
        if (
          !currentLine ||
          currentLine.startsWith("LOG:") ||
          currentLine.startsWith("__LOG__:") ||
          currentLine.includes("Context verified successfully")
        ) {
          continue;
        }

        if (currentLine.startsWith("data: ")) {
          onTokenReceived(currentLine.slice(6).replace(/\\n/g, "\n"));
        } else if (currentLine.startsWith("data:")) {
          onTokenReceived(currentLine.slice(5).replace(/\\n/g, "\n"));
        }
      }
    }

    if (assemblyBuffer.length > 0) {
      const finalLine = assemblyBuffer.trimEnd();
      if (
        finalLine &&
        !finalLine.startsWith("LOG:") &&
        !finalLine.startsWith("__LOG__:") &&
        !finalLine.includes("Context verified successfully")
      ) {
        if (finalLine.startsWith("data: ")) {
          onTokenReceived(finalLine.slice(6).replace(/\\n/g, "\n"));
        } else if (finalLine.startsWith("data:")) {
          onTokenReceived(finalLine.slice(5).replace(/\\n/g, "\n"));
        }
      }
    }
  };

  // 6. Send Message Handler
  const handleSend = async () => {
    if (!token) {
      window.alert(
        "You are not logged in. Please log in to use the assistant.",
      );
    }
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: "USER",
      text: trimmedInput,
    };

    const aiMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      sender: "AI",
      text: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, aiMessage]);
    setInput("");
    setIsLoading(true);
    setIsProcessing(true);
    setHasStartedStreaming(false);

    let targetSessionId = activeSessionId;

    if (!targetSessionId) {
      targetSessionId = await createSession(trimmedInput);

      if (!targetSessionId) {
        console.error("Failed to create session. Aborting stream.");
        setMessages((prev) =>
          prev.filter((m) => m.id !== userMessage.id && m.id !== aiMessage.id),
        );
        setIsLoading(false);
        setIsProcessing(false);
        return;
      }
    }
    try {
      const response = await fetch(`${API_BASE_URL}/stream`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          sessionId: targetSessionId,
          prompt: trimmedInput,
        }),
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const onTokenReceived = (chunk: string) => {
        if (chunk && chunk.trim()) {
          setHasStartedStreaming(true);
          setIsProcessing(false);
        }

        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;

          if (lastIdx >= 0 && updated[lastIdx].sender === "AI") {
            updated[lastIdx] = {
              ...updated[lastIdx],
              text: updated[lastIdx].text + chunk,
            };
          }
          return updated;
        });
      };

      await readStreamResponse(response, onTokenReceived);
    } catch (error) {
      console.error("Streaming error:", error);
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].sender === "AI") {
          updated[lastIdx] = {
            ...updated[lastIdx],
            text:
              updated[lastIdx].text +
              "\n\n*[Error generating response. Please try again.]*",
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
      setHasStartedStreaming(false);
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].sender === "AI") {
          updated[lastIdx] = {
            ...updated[lastIdx],
            isStreaming: false,
          };
        }
        return updated;
      });
    }
  };

  // 7. Rename Handler
  // Triggers opening the modal overlay
  const openRenameModal = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    setRenameSessionId(sessionId);
    setNewTitle(session.title || "");
    setIsRenameOpen(true);
    setMenuSessionId(null);
  };

  const closeRenameModal = () => {
    setIsRenameOpen(false);
    setRenameSessionId(null);
    setNewTitle("");
  };

  // Submits the API PATCH request
  const handleConfirmRename = async () => {
    if (!renameSessionId || !newTitle.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/sessions/${renameSessionId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === renameSessionId ? { ...s, title: newTitle.trim() } : s,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to rename session:", error);
    } finally {
      closeRenameModal();
    }
  };

  // 8. Delete Handler
  const handleDeleteSession = async (sessionId: string) => {
    try {
      const res = await axios.delete(`${API_BASE_URL}/sessions/${sessionId}`, {
        headers: authHeaders,
      });

      if (res.data) {
        setSessions((prev) => {
          const updated = prev.filter((s) => s.id !== sessionId);
          if (activeSessionId === sessionId) {
            setActiveSessionId(updated[0]?.id ?? null);
          }
          return updated;
        });
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    } finally {
      setMenuSessionId(null);
    }
  };

  const handleNewChatClick = () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  return (
    <div className="h-[calc(100vh-72px)] w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex h-full w-full max-w-7xl mx-auto min-h-0">
        <div className="w-82.5 shrink-0 border-r border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 p-4 min-h-0">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Nexus AI
              </span>
            </div>

            <button
              type="button"
              onClick={handleNewChatClick}
              className="inline-flex items-center justify-between gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-2 py-1.5 text-sm font-medium text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-950/70 dark:text-white"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New</span>
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
                    className={`group relative flex items-center gap-2 rounded-2xl px-2.5 py-1 transition ${
                      isActive
                        ? "bg-cyan-500 text-white shadow-sm dark:bg-cyan-950/70 dark:text-cyan-100"
                        : "text-slate-700 hover:bg-cyan-100 dark:text-slate-200 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSessionId(session.id);
                        setMenuSessionId(null);
                      }}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="truncate text-sm font-medium">
                        {session.title || "New chat"}
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
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openRenameModal(session.id);
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
                              navigate("/assistant");
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
        </div>

        {isRenameOpen && renameSessionId && (
          <div
            data-rename-modal
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
            onClick={closeRenameModal}
          >
            <div
              className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-6 text-slate-900 dark:text-slate-100">
                Rename this chat
              </h2>

              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmRename();
                  if (e.key === "Escape") closeRenameModal();
                }}
                autoFocus
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-cyan-500 dark:focus:border-cyan-500 transition-colors"
              />

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeRenameModal}
                  className="rounded-full px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmRename}
                  disabled={!newTitle.trim()}
                  className="rounded-full bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-40 transition-colors"
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
        )}

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
                  {messages.map((msg) => {
                    // Don't render an empty AI bubble while waiting for first token
                    if (msg.sender === "AI" && msg.isStreaming && !msg.text) return null;
                    return (
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
                            : "bg-slate-100 text-black rounded-tl-none border border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700/50"
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
                      </div>
                    </div>
                  ); })}

                  {isProcessing && !hasStartedStreaming && (
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-500 animate-spin" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Searching...
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
