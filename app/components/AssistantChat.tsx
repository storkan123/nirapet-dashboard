"use client";

import { useEffect, useRef, useState } from "react";

type Provider = "anthropic" | "openai";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME =
  "Hi! I'm your automation assistant. I can explain what each workflow does, turn them on or off, or help you make changes. What would you like to know?";

const PROVIDER_LABELS: Record<Provider, { name: string; model: string; color: string }> = {
  anthropic: { name: "Claude", model: "claude-sonnet-4-6", color: "bg-orange-100 text-orange-700 border-orange-200" },
  openai: { name: "GPT-4o", model: "gpt-4o", color: "bg-green-100 text-green-700 border-green-200" },
};

export default function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<Provider>("anthropic");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Don't send the welcome message — it's just UI
          messages: next.filter((m) => !(m.role === "assistant" && m.content === WELCOME)),
          provider,
        }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply ?? data.error ?? "Something went wrong." }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 flex flex-col h-[560px] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="font-semibold text-gray-900 text-sm">Automation Assistant</span>
        </div>

        {/* Provider toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(["anthropic", "openai"] as Provider[]).map((p) => {
            const label = PROVIDER_LABELS[p];
            return (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  provider === p
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active model badge */}
      <div className="px-5 pt-2 pb-1">
        <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${PROVIDER_LABELS[provider].color}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
          Using {PROVIDER_LABELS[provider].name} ({PROVIDER_LABELS[provider].model})
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-emerald-500 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-800 rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your workflows..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 bg-gray-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-40 transition-colors text-sm font-medium"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
