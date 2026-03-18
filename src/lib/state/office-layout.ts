import type { AgentState } from "@/lib/types";

export interface GridPosition {
  row: number;
  col: number;
  zone: "desk" | "meeting";
}

// Desk positions in the office grid (row, col).
// 5 desks arranged in 2 rows of the workspace zone.
export const DESK_SLOTS: GridPosition[] = [
  { row: 4, col: 3, zone: "desk" },   // Desk 1: top-left
  { row: 4, col: 8, zone: "desk" },   // Desk 2: top-center
  { row: 4, col: 13, zone: "desk" },  // Desk 3: top-right
  { row: 7, col: 3, zone: "desk" },   // Desk 4: bottom-left
  { row: 7, col: 8, zone: "desk" },   // Desk 5: bottom-center
];

// Meeting room seats around the conference table.
export const MEETING_SEATS: GridPosition[] = [
  { row: 10, col: 7, zone: "meeting" },
  { row: 10, col: 11, zone: "meeting" },
  { row: 12, col: 7, zone: "meeting" },
  { row: 12, col: 11, zone: "meeting" },
];

export function agentGridPosition(
  agentIndex: number,
  agentState: AgentState,
): GridPosition {
  if (agentState === "meeting") {
    return MEETING_SEATS[agentIndex % MEETING_SEATS.length];
  }
  // All other states: agent stays at their assigned desk.
  return DESK_SLOTS[agentIndex % DESK_SLOTS.length];
}

// State → bubble icon mapping for the UI layer.
export const STATE_BUBBLES: Record<AgentState, string | null> = {
  idle: null,
  planning: "notepad",
  researching: "search",
  writing: "pencil",
  meeting: "speech",
  waiting_for_approval: "clock",
  done: "checkmark",
};
