"use client";

import { useRef, useEffect, useState } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "system";
  text: string;
}

interface CommandInputProps {
  suggestions?: string[];
  workspaceId?: string;
  nextPendingGate?: string;
  onApprove?: (gateType: string) => void;
  onSnapshotUpdate?: () => void;
}

export function CommandInput({
  suggestions = [],
  workspaceId,
  nextPendingGate,
  onApprove,
  onSnapshotUpdate,
}: CommandInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function addSystemMessage(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: `s-${Date.now()}`, role: "system", text },
    ]);
  }

  function addUserMessage(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text },
    ]);
  }

  async function handleSuggestion(suggestion: string) {
    if (!workspaceId) {
      handleGenericSend(suggestion);
      return;
    }

    addUserMessage(suggestion);

    const lower = suggestion.toLowerCase();

    // "Start execution" -> approve next pending gate
    if (lower.includes("start execution") && nextPendingGate && onApprove) {
      addSystemMessage("Approving gate and starting execution...");
      onApprove(nextPendingGate);
      return;
    }

    // "Check progress" -> refresh snapshot
    if (lower.includes("check progress")) {
      addSystemMessage("Refreshing workspace status...");
      onSnapshotUpdate?.();
      return;
    }

    // "Export all deliverables" -> download artifacts as markdown
    if (lower.includes("export all deliverables")) {
      setBusy(true);
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}`);
        if (!res.ok) throw new Error("Failed to fetch workspace");
        const snapshot = await res.json();
        const artifacts = snapshot.artifacts ?? [];

        if (artifacts.length === 0) {
          addSystemMessage("No deliverables to export yet.");
          return;
        }

        // Concatenate all artifact content into one markdown string
        const markdown = artifacts
          .map((a: { title: string; currentVersion: number; versions: Array<{ version: number; content: string }> }) => {
            const version = a.versions.find(
              (v: { version: number }) => v.version === a.currentVersion,
            );
            return `# ${a.title}\n\n${version?.content ?? "(no content)"}\n\n---\n`;
          })
          .join("\n");

        // Trigger browser download
        const blob = new Blob([markdown], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `deliverables-${workspaceId.slice(0, 8)}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        addSystemMessage(`Exported ${artifacts.length} deliverable(s) as markdown.`);
      } catch (err) {
        addSystemMessage(
          `Export failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    // "Generate executive summary" -> POST to command endpoint
    if (lower.includes("generate executive summary")) {
      setBusy(true);
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "Generate executive summary",
            source: "user",
          }),
        });
        if (!res.ok) throw new Error("Command failed");
        addSystemMessage("Executive summary request logged. The team will process it.");
      } catch (err) {
        addSystemMessage(
          `Failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    // "Start follow-up mission" -> navigate to composer with pre-filled brief
    if (lower.includes("start follow-up mission")) {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}`);
        if (!res.ok) throw new Error("Failed to fetch workspace");
        const snapshot = await res.json();
        const missionGoal = snapshot.workspace?.title ?? "Previous mission";
        // Navigate to composer by removing workspace param and adding a follow-up hint
        const url = new URL(window.location.href);
        url.searchParams.delete("workspace");
        url.searchParams.set("followUp", missionGoal);
        window.location.href = url.toString();
      } catch {
        addSystemMessage("Could not start follow-up. Try creating a new workspace manually.");
      }
      return;
    }

    // Default: any other suggestion -> send as custom command
    handleCustomCommand(suggestion);
  }

  async function handleCustomCommand(text: string) {
    if (!workspaceId) {
      addSystemMessage(`Received: "${text}". No workspace loaded.`);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, source: "user" }),
      });
      if (!res.ok) throw new Error("Command failed");
      addSystemMessage(`Command logged: "${text}". The team will process it.`);
    } catch (err) {
      addSystemMessage(
        `Failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setBusy(false);
    }
  }

  function handleGenericSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    addUserMessage(trimmed);
    addSystemMessage(`Received: "${trimmed}". No workspace loaded.`);
    setInputValue("");
  }

  function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Check if it matches a known suggestion
    const matchedSuggestion = suggestions.find(
      (s) => s.toLowerCase() === trimmed.toLowerCase(),
    );
    if (matchedSuggestion) {
      handleSuggestion(matchedSuggestion);
      setInputValue("");
      return;
    }

    // Custom message
    addUserMessage(trimmed);
    handleCustomCommand(trimmed);
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
              disabled={busy}
              onClick={() => {
                handleSuggestion(suggestion);
              }}
              className="rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)] transition hover:border-[var(--success)]/50 hover:bg-[var(--success-bg)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
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
          disabled={busy}
          placeholder="Give an instruction to the team..."
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:border-[var(--success)]/50 focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => handleSend(inputValue)}
          disabled={!inputValue.trim() || busy}
          className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-secondary)] transition hover:border-[var(--success)]/50 hover:bg-[var(--success-bg)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
