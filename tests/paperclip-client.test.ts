import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  isPaperclipAvailable,
  resetAvailabilityCache,
} from "@/lib/runtime/adapters/paperclip";

describe("isPaperclipAvailable", () => {
  beforeEach(() => {
    resetAvailabilityCache();
    vi.restoreAllMocks();
  });

  it("returns false when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    const result = await isPaperclipAvailable();
    expect(result).toBe(false);
  });

  it("returns false when fetch times out", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 100)),
    );
    const result = await isPaperclipAvailable();
    expect(result).toBe(false);
  });

  it("returns true when server responds 200", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("[]", { status: 200 }),
    );
    const result = await isPaperclipAvailable();
    expect(result).toBe(true);
  });

  it("caches result for subsequent calls", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("[]", { status: 200 }),
    );

    await isPaperclipAvailable();
    await isPaperclipAvailable();
    await isPaperclipAvailable();

    // Only 1 actual fetch call due to caching
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
