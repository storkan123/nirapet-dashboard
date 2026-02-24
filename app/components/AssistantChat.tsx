"use client";

import { useEffect, useRef, useState } from "react";

type Provider = "anthropic" | "openai";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME =
  "Hi! I'm your automation assistant. I can explain what each workflow does, turn them on or off, or help you make changes. What would you like to know?";

// ─── Brand icons ──────────────────────────────────────────────────────────────

function ClaudeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#CC7853" />
      {/* Stylised A / Anthropic mark */}
      <path
        d="M16 6L24.5 26H20.8L19.1 21.5H12.9L11.2 26H7.5L16 6ZM16 12.5L13.8 19.2H18.2L16 12.5Z"
        fill="white"
      />
    </svg>
  );
}

function OpenAIIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* OpenAI logo polygon */}
      <path
        d="M29.4 12.8a8.1 8.1 0 0 0-.7-6.6A8.3 8.3 0 0 0 19.9 2a8.2 8.2 0 0 0-13.6 3.2 8.1 8.1 0 0 0-5.4 3.9 8.3 8.3 0 0 0 1 9.7 8.1 8.1 0 0 0 .7 6.6 8.3 8.3 0 0 0 8.8 4 8.2 8.2 0 0 0 13.6-3.2 8.1 8.1 0 0 0 5.4-3.9 8.3 8.3 0 0 0-1-9.5zm-10.1 16.7a6.1 6.1 0 0 1-3.9-1.4l.2-.1 6.5-3.7c.3-.2.5-.5.5-1v-9.1l2.7 1.6v7.7a6.1 6.1 0 0 1-6 6zm-13-5.6a6.1 6.1 0 0 1-.7-4.1l.2.1 6.5 3.7c.3.2.7.2 1 0l7.9-4.6v3.2l-6.6 3.8a6.1 6.1 0 0 1-8.3-2.1zM4.6 11.1A6.1 6.1 0 0 1 7.8 8.4v7.7c0 .4.2.8.5 1l7.9 4.6-2.7 1.6-6.6-3.8a6.1 6.1 0 0 1-2.3-8.4zm22.2 5.2-7.9-4.6 2.7-1.6 6.6 3.8A6.1 6.1 0 0 1 26 25.1v-7.7c0-.4-.2-.8-.5-1.1zm2.7-4.1-.2-.1-6.5-3.7c-.3-.2-.7-.2-1 0L13.9 13V9.8l6.6-3.8a6.1 6.1 0 0 1 9 5.3zM11.4 17.3l-2.7-1.6v-3.2l2.7 1.6v3.2zm1 .6 2.7 1.6 2.7-1.6v-3.2L15.1 13l-2.7 1.6v3.3zm6.3-.6v-3.2l2.7-1.6v3.2L18.7 17.3z"
        fill="black"
      />
    </svg>
  );
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
      return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function MessageContent({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={key++} className="list-disc list-inside space-y-0.5 my-1 pl-1">
        {listItems.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  for (const line of lines) {
    if (line.match(/^[-*•] /)) {
      listItems.push(line.replace(/^[-*•] /, ""));
    } else {
      flushList();
      if (line.trim())
        elements.push(
          <p key={key++} className="mb-1 last:mb-0">
            {renderInline(line)}
          </p>
        );
    }
  }
  flushList();

  return <div className="space-y-0.5">{elements}</div>;
}

// ─── Provider config ──────────────────────────────────────────────────────────

const PROVIDERS: Record<
  Provider,
  { name: string; model: string; badge: string; Icon: () => React.ReactElement }
> = {
  anthropic: {
    name: "Claude",
    model: "claude-sonnet-4-6",
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    Icon: ClaudeIcon,
  },
  openai: {
    name: "GPT-4o",
    model: "gpt-4o",
    badge: "bg-gray-100 text-gray-700 border-gray-200",
    Icon: OpenAIIcon,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

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
          messages: next.filter(
            (m) => !(m.role === "assistant" && m.content === WELCOME)
          ),
          provider,
        }),
      });
      const data = await res.json();
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.reply ?? data.error ?? "Something went wrong.",
        },
      ]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const pConfig = PROVIDERS[provider];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 flex flex-col h-[560px] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-semibold text-gray-900 text-sm">Automation Assistant</span>
        </div>

        {/* Provider toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(["anthropic", "openai"] as Provider[]).map((p) => {
            const cfg = PROVIDERS[p];
            return (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  provider === p
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <cfg.Icon />
                {cfg.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active model badge */}
      <div className="px-5 pt-2 pb-1">
        <span
          className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${pConfig.badge}`}
        >
          <pConfig.Icon />
          Using {pConfig.name} ({pConfig.model})
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
              {msg.role === "assistant" ? (
                <MessageContent text={msg.content} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
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
