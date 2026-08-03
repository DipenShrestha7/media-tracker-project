import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, RefreshCw, Compass } from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "USER" | "AI";
  text: string;
  timestamp: string;
}

const Assistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      sender: "AI",
      text: "Hello! I'm your Media Assistant. Ask me to explain a ending, generate a recap, or give you cross-media recommendations based on your history!",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const promptSuggestions = [
    "Explain the ending of Inception",
    "Give recap of Attack on Titan S1",
    "Recommend anime based on sci-fi movies",
    "Summarize Solo Leveling",
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "USER",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput("");
    setIsLoading(true);

    // Mock API Response Call to Python FastAPI + LangChain backend
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "AI",
        text: `Here is what I found for "${textToSend}":\n\n*Inception* centers around extracted dreams and subconscious projections. Cobb's spinning top leaves the reality of the resolution open to interpretation!`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);
    }, 1200);
  };

  return (
    <div className="h-[calc(100vh-5rem)] max-w-5xl mx-auto p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">AI Assistant</h1>
          </div>
        </div>
        <button
          onClick={() => setMessages([messages[0]])}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs flex items-center gap-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Clear Chat
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4 pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === "USER" ? "flex-row-reverse" : ""
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.sender === "USER"
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-200 dark:bg-slate-800 text-cyan-500"
              }`}
            >
              {msg.sender === "USER" ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>

            <div
              className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                msg.sender === "USER"
                  ? "bg-cyan-500 text-white rounded-tr-none"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700/50"
              }`}
            >
              <p className="whitespace-pre-line">{msg.text}</p>
              <span
                className={`block text-[10px] mt-2 opacity-60 text-right ${
                  msg.sender === "USER" ? "text-white" : "text-slate-400"
                }`}
              >
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-cyan-500 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
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

      {/* Suggested Quick Prompts */}
      <div className="py-2 flex items-center gap-2 overflow-x-auto scrollbar-none mb-2">
        <Compass className="w-4 h-4 text-slate-400 shrink-0" />
        {promptSuggestions.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="text-xs whitespace-nowrap bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500/10 hover:text-cyan-500 dark:hover:text-cyan-400 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/50 transition-all shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="relative flex items-center"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI anything about movies, anime, or recaps..."
          className="w-full pl-4 pr-12 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white text-sm shadow-sm"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="absolute right-2 p-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-xl transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default Assistant;
