import { describe, expect, it } from "vitest";

import { getPaperclipBudget, clearPaperclipSchedule } from "@/lib/runtime/paperclip-executor";

describe("paperclip-executor", () => {
  it("returns zero budget for unknown workspace", () => {
    const budget = getPaperclipBudget("nonexistent-workspace");
    expect(budget).toEqual({ inputTokens: 0, outputTokens: 0, estimatedCost: 0 });
  });

  it("clearPaperclipSchedule does not throw for unknown workspace", () => {
    expect(() => clearPaperclipSchedule("nonexistent")).not.toThrow();
  });
});
