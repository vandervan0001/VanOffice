import type { AgentState } from "@/lib/types";

export interface GridPosition {
  row: number;
  col: number;
  zone: "desk" | "meeting";
}

export interface OfficeConfig {
  cols: number;
  rows: number;
  desks: GridPosition[];
  meetingSeats: GridPosition[];
  meetingRooms: Array<{ row: number; col: number; w: number; h: number }>;
  breakRoom: { row: number; col: number; w: number; h: number } | null;
}

// Desk layout: 3 columns of desks, as many rows as needed
function generateDesks(count: number): GridPosition[] {
  const desks: GridPosition[] = [];
  const DESK_COLS = [2, 8, 14];
  const FIRST_DESK_ROW = 4;
  const ROW_SPACING = 5;

  for (let i = 0; i < count; i++) {
    const colIndex = i % DESK_COLS.length;
    const rowIndex = Math.floor(i / DESK_COLS.length);
    desks.push({
      row: FIRST_DESK_ROW + rowIndex * ROW_SPACING,
      col: DESK_COLS[colIndex],
      zone: "desk",
    });
  }
  return desks;
}

// Meeting seats arranged around tables
function generateMeetingSeats(count: number, meetingRow: number): GridPosition[] {
  const seats: GridPosition[] = [];
  const room1Seats = [
    { row: meetingRow, col: 7, zone: "meeting" as const },
    { row: meetingRow, col: 11, zone: "meeting" as const },
    { row: meetingRow + 2, col: 7, zone: "meeting" as const },
    { row: meetingRow + 2, col: 11, zone: "meeting" as const },
  ];
  const room2Seats = [
    { row: meetingRow, col: 16, zone: "meeting" as const },
    { row: meetingRow, col: 19, zone: "meeting" as const },
    { row: meetingRow + 2, col: 16, zone: "meeting" as const },
    { row: meetingRow + 2, col: 19, zone: "meeting" as const },
  ];

  for (let i = 0; i < count; i++) {
    if (i < room1Seats.length) {
      seats.push(room1Seats[i]);
    } else if (i < room1Seats.length + room2Seats.length) {
      seats.push(room2Seats[i - room1Seats.length]);
    } else {
      seats.push(room1Seats[i % room1Seats.length]);
    }
  }
  return seats;
}

/**
 * Generate an office that scales with team size.
 * All sizes get a break room and filled layout — no large empty gaps.
 * 2-5: compact. 6-10: standard. 11+: big open space, 2 meeting rooms.
 */
export function generateOfficeConfig(teamSize: number): OfficeConfig {
  const deskRows = Math.ceil(teamSize / 3);
  const deskZoneEnd = 4 + deskRows * 3;
  const meetingStartRow = deskZoneEnd + 1;

  const needsSecondMeeting = teamSize > 8;
  const meetingZoneHeight = 5;
  // Break room is always present — even small teams need a kitchen/lounge
  const breakRoomHeight = 4;
  const breakRoomStartRow = meetingStartRow + meetingZoneHeight;
  const totalRows = Math.max(14, breakRoomStartRow + breakRoomHeight + 1);
  const totalCols = 22;

  const desks = generateDesks(teamSize);
  const meetingSeats = generateMeetingSeats(teamSize, meetingStartRow + 1);

  const meetingRooms = [
    { row: meetingStartRow, col: 5, w: 8, h: 4.5 },
  ];
  if (needsSecondMeeting) {
    meetingRooms.push({ row: meetingStartRow, col: 14, w: 7, h: 4.5 });
  }

  const breakRoom = { row: breakRoomStartRow, col: 1, w: 8, h: breakRoomHeight };

  return { cols: totalCols, rows: totalRows, desks, meetingSeats, meetingRooms, breakRoom };
}

// Backwards-compatible fixed configs for tests
export const DESK_SLOTS = generateDesks(5);
export const MEETING_SEATS = generateMeetingSeats(4, 11);

/**
 * Get grid position for an agent. Works with any team size.
 */
export function agentGridPosition(
  agentIndex: number,
  agentState: AgentState,
  officeConfig?: OfficeConfig,
): GridPosition {
  const desks = officeConfig?.desks ?? DESK_SLOTS;
  const seats = officeConfig?.meetingSeats ?? MEETING_SEATS;

  if (agentState === "meeting") {
    return seats[agentIndex % seats.length];
  }
  return desks[agentIndex % desks.length];
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
