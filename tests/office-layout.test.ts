import { describe, expect, it } from "vitest";

import {
  agentGridPosition,
  DESK_SLOTS,
  MEETING_SEATS,
  type GridPosition,
} from "@/lib/state/office-layout";
import type { AgentState } from "@/lib/types";

/**
 * agentGridPosition now returns walkable **seat** positions:
 *   desk seat = desk origin + (row+2, col+1)   (the chair cell)
 *   meeting seat = directly from meetingSeats array
 */
function deskSeat(index: number): GridPosition {
  const desk = DESK_SLOTS[index % DESK_SLOTS.length];
  return { row: desk.row + 2, col: desk.col + 1, zone: "desk" };
}

describe("agentGridPosition", () => {
  it("returns the desk seat for idle state", () => {
    const pos = agentGridPosition(0, "idle");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(deskSeat(0));
  });

  it("returns the desk seat for planning state", () => {
    const pos = agentGridPosition(1, "planning");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(deskSeat(1));
  });

  it("returns the desk seat for writing state", () => {
    const pos = agentGridPosition(2, "writing");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(deskSeat(2));
  });

  it("returns the desk seat for researching state", () => {
    const pos = agentGridPosition(0, "researching");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(deskSeat(0));
  });

  it("returns a meeting seat for meeting state", () => {
    const pos = agentGridPosition(0, "meeting");
    expect(pos.zone).toBe("meeting");
    expect(pos).toEqual(MEETING_SEATS[0]);
  });

  it("returns the desk seat for waiting_for_approval", () => {
    const pos = agentGridPosition(3, "waiting_for_approval");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(deskSeat(3));
  });

  it("returns the desk seat for done state", () => {
    const pos = agentGridPosition(0, "done");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(deskSeat(0));
  });

  it("wraps desk seat assignment for agents beyond slot count", () => {
    const pos = agentGridPosition(5, "idle");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(deskSeat(5));
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
