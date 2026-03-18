import { describe, expect, it } from "vitest";

import {
  agentGridPosition,
  DESK_SLOTS,
  MEETING_SEATS,
  type GridPosition,
} from "@/lib/state/office-layout";
import type { AgentState } from "@/lib/types";

describe("agentGridPosition", () => {
  it("returns the assigned desk for idle state", () => {
    const pos = agentGridPosition(0, "idle");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(DESK_SLOTS[0]);
  });

  it("returns the assigned desk for planning state", () => {
    const pos = agentGridPosition(1, "planning");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(DESK_SLOTS[1]);
  });

  it("returns the assigned desk for writing state", () => {
    const pos = agentGridPosition(2, "writing");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(DESK_SLOTS[2]);
  });

  it("returns the assigned desk for researching state", () => {
    const pos = agentGridPosition(0, "researching");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(DESK_SLOTS[0]);
  });

  it("returns a meeting seat for meeting state", () => {
    const pos = agentGridPosition(0, "meeting");
    expect(pos.zone).toBe("meeting");
    expect(pos).toEqual(MEETING_SEATS[0]);
  });

  it("returns the assigned desk for waiting_for_approval", () => {
    const pos = agentGridPosition(3, "waiting_for_approval");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(DESK_SLOTS[3]);
  });

  it("returns the assigned desk for done state", () => {
    const pos = agentGridPosition(0, "done");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(DESK_SLOTS[0]);
  });

  it("wraps desk assignment for agents beyond slot count", () => {
    const pos = agentGridPosition(5, "idle");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(DESK_SLOTS[5 % DESK_SLOTS.length]);
  });

  it("wraps meeting seat for agents beyond seat count", () => {
    const pos = agentGridPosition(4, "meeting");
    expect(pos.zone).toBe("meeting");
    expect(pos).toEqual(MEETING_SEATS[4 % MEETING_SEATS.length]);
  });

  it("covers all 7 AgentState values", () => {
    const states: AgentState[] = [
      "idle", "planning", "researching", "writing",
      "meeting", "waiting_for_approval", "done",
    ];
    for (const state of states) {
      const pos = agentGridPosition(0, state);
      expect(pos).toHaveProperty("row");
      expect(pos).toHaveProperty("col");
      expect(pos).toHaveProperty("zone");
    }
  });
});
