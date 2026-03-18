import { describe, expect, it } from "vitest";

import { ROLE_TEMPLATES, SHARED_OPERATING_MANUAL } from "@/lib/role-templates";

describe("role templates", () => {
  it("ship with a normalized shared manual", () => {
    expect(ROLE_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    expect(SHARED_OPERATING_MANUAL).toContain("task board");
    expect(
      ROLE_TEMPLATES.every((template) => template.promptFragments.length > 0),
    ).toBe(true);
  });
});
