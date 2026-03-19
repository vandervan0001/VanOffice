import type { AgentState } from "@/lib/types";

export interface GridPosition {
  row: number;
  col: number;
  zone: "desk" | "meeting";
}

export interface RoomRect {
  row: number;
  col: number;
  w: number;
  h: number;
}

export interface OfficeConfig {
  cols: number;
  rows: number;
  desks: GridPosition[];
  meetingSeats: GridPosition[];
  meetingRooms: RoomRect[];
  breakRoom: RoomRect | null;
  bossOffice: RoomRect | null;
  serverRoom: RoomRect | null;
  archives: RoomRect | null;
  lounge: RoomRect | null;
  restrooms: RoomRect | null;
  hallway: RoomRect | null;
}

/**
 * Desk layout: 3 columns of desks on the LEFT side (cols 0-13).
 * Each desk is 3 cols wide x 2 rows tall.
 * Desk columns: [1, 5, 9] — no overlap with right-side rooms.
 * Row spacing: 4 (2 desk + 1 walkway + 1 gap).
 */
function generateDesks(count: number): GridPosition[] {
  const desks: GridPosition[] = [];
  const DESK_COLS = [1, 5, 9];
  const FIRST_DESK_ROW = 3;
  const ROW_SPACING = 4; // 2 desk rows + 1 walkway + 1 buffer

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

/**
 * Meeting seats arranged around tables in meeting rooms.
 * Room 1: left side. Room 2: also left side (below room 1 area).
 */
function generateMeetingSeats(count: number, meetingRow: number): GridPosition[] {
  const seats: GridPosition[] = [];
  // Seats around the meeting table. The table occupies cols 6-7, rows +1/+2.
  // Place seats to the LEFT (col 4) and RIGHT (col 9) of the table so they
  // never overlap furniture and are always walkable.
  const room1Seats = [
    { row: meetingRow + 1, col: 4, zone: "meeting" as const },
    { row: meetingRow + 1, col: 9, zone: "meeting" as const },
    { row: meetingRow + 2, col: 4, zone: "meeting" as const },
    { row: meetingRow + 2, col: 9, zone: "meeting" as const },
  ];

  for (let i = 0; i < count; i++) {
    seats.push(room1Seats[i % room1Seats.length]);
  }
  return seats;
}

/**
 * Generate an office that scales with team size.
 *
 * Layout:
 *   Left side (cols 0-13): open-plan desks, meeting room, break room
 *   Col 14: hallway corridor
 *   Right side (cols 15-27): boss office, server room, archives, lounge, restrooms
 *
 * Every piece is placed at integer grid positions. No fractional math.
 */
export function generateOfficeConfig(teamSize: number): OfficeConfig {
  const desksPerRow = 3;
  const deskRows = Math.ceil(teamSize / desksPerRow);
  const FIRST_DESK_ROW = 3;
  const ROW_SPACING = 4;
  const deskZoneEnd = FIRST_DESK_ROW + deskRows * ROW_SPACING;
  const meetingStartRow = deskZoneEnd;

  const meetingZoneHeight = 5;
  const breakRoomStartRow = meetingStartRow + meetingZoneHeight;
  const breakRoomHeight = 3;
  const totalRows = breakRoomStartRow + breakRoomHeight + 1;
  const totalCols = 28;

  const desks = generateDesks(teamSize);
  const meetingSeats = generateMeetingSeats(teamSize, meetingStartRow);

  // Single meeting room on left side
  const meetingRooms = [
    { row: meetingStartRow, col: 1, w: 12, h: meetingZoneHeight },
  ];

  const breakRoom = { row: breakRoomStartRow, col: 1, w: 12, h: breakRoomHeight };

  // --- Right-side rooms (cols 15-27) ---
  const rightSideMinRows = 16;
  const finalRows = Math.max(totalRows, rightSideMinRows);

  const bossOffice: RoomRect = { row: 3, col: 16, w: 11, h: 4 };
  const serverRoom: RoomRect = { row: 7, col: 16, w: 5, h: 4 };
  const archives: RoomRect = { row: 7, col: 21, w: 6, h: 4 };
  const lounge: RoomRect = { row: 11, col: 16, w: 8, h: 4 };
  const restrooms: RoomRect = { row: 11, col: 24, w: 3, h: 4 };
  // Hallway: vertical strip connecting right-side rooms
  const hallway: RoomRect = { row: 3, col: 15, w: 1, h: 12 };

  return {
    cols: totalCols,
    rows: finalRows,
    desks,
    meetingSeats,
    meetingRooms,
    breakRoom,
    bossOffice,
    serverRoom,
    archives,
    lounge,
    restrooms,
    hallway,
  };
}

// Backwards-compatible fixed configs for tests.
// DESK_SLOTS stores desk furniture origins; agentGridPosition applies
// the seat offset (+2 row, +1 col) when returning positions.
export const DESK_SLOTS = generateDesks(5);
export const MEETING_SEATS = generateMeetingSeats(4, 11);

/**
 * Get the **walkable seat** position for an agent.
 *
 * For desk states the seat is 2 rows below and 1 col right of the desk
 * origin (the chair cell in front of the desk).
 * For meeting states the seat is taken from the meetingSeats array which
 * already stores walkable cells around the meeting table.
 *
 * Works with any team size.
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
  // Return the chair/seat cell: desk origin + (row+2, col+1)
  const desk = desks[agentIndex % desks.length];
  return { row: desk.row + 2, col: desk.col + 1, zone: "desk" };
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
