"use client";

import { useState } from "react";

interface CommandInputProps {
  suggestions?: string[];
}

export function CommandInput({ suggestions = [] }: CommandInputProps) {
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="space-y-2">
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
              onClick={() => setInputValue(suggestion)}
              className="rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)] transition hover:border-[var(--success)]/50 hover:bg-[var(--success-bg)] hover:text-[var(--foreground)]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <input
        type="text"
        disabled
        value={inputValue}
        placeholder="Give an instruction to the team..."
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-60"
      />
      <p className="text-center text-[10px] text-[var(--text-muted)]">
        Available in v2
      </p>
    </div>
  );
}
