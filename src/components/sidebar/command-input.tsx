"use client";

import { useRef, useEffect, useState } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "system";
  text: string;
}

interface CommandInputProps {
  suggestions?: string[];
}

export function CommandInput({ suggestions = [] }: CommandInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    const systemMsg: ChatMessage = {
      id: `s-${Date.now()}`,
      role: "system",
      text: `Received: "${trimmed}". Command processing coming soon.`,
    };

    console.log("[CommandInput] User message:", trimmed);
    setMessages((prev) => [...prev, userMsg, systemMsg]);
    setInputValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
        Orders
      </p>

      {/* Suggestion pills */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSend(suggestion)}
              className="rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)] transition hover:border-[var(--success)]/50 hover:bg-[var(--success-bg)] hover:text-[var(--foreground)]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Chat messages */}
      {messages.length > 0 && (
        <div className="flex max-h-[240px] flex-col gap-1.5 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)] p-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3 py-1.5 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[var(--success-bg)] text-[var(--foreground)]"
                    : "bg-[var(--border)]/50 text-[var(--text-secondary)]"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Give an instruction to the team..."
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:border-[var(--success)]/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => handleSend(inputValue)}
          disabled={!inputValue.trim()}
          className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-secondary)] transition hover:border-[var(--success)]/50 hover:bg-[var(--success-bg)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
