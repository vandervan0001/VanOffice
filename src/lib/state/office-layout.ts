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

// Desk layout: 4 columns of desks, wider open-plan office
function generateDesks(count: number): GridPosition[] {
  const desks: GridPosition[] = [];
  const DESK_COLS = [1, 8, 15, 22];
  const FIRST_DESK_ROW = 3;
  const ROW_SPACING = 3; // Compact rows

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
    { row: meetingRow, col: 3, zone: "meeting" as const },
    { row: meetingRow, col: 7, zone: "meeting" as const },
    { row: meetingRow + 2, col: 3, zone: "meeting" as const },
    { row: meetingRow + 2, col: 7, zone: "meeting" as const },
  ];
  const room2Seats = [
    { row: meetingRow, col: 17, zone: "meeting" as const },
    { row: meetingRow, col: 21, zone: "meeting" as const },
    { row: meetingRow + 2, col: 17, zone: "meeting" as const },
    { row: meetingRow + 2, col: 21, zone: "meeting" as const },
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
 * Wide open-plan layout: 4 desks per row, 28 cols wide.
 */
export function generateOfficeConfig(teamSize: number): OfficeConfig {
  const desksPerRow = 4;
  const deskRows = Math.ceil(teamSize / desksPerRow);
  const FIRST_DESK_ROW = 3;
  const ROW_SPACING = 3; // Compact rows
  const deskZoneEnd = FIRST_DESK_ROW + deskRows * ROW_SPACING;
  const meetingStartRow = deskZoneEnd;

  const needsSecondMeeting = teamSize > 8;
  const meetingZoneHeight = 4;
  const breakRoomHeight = 2;
  const breakRoomStartRow = meetingStartRow + meetingZoneHeight;
  const totalRows = breakRoomStartRow + breakRoomHeight + 1;
  const totalCols = 28;

  const desks = generateDesks(teamSize);
  const meetingSeats = generateMeetingSeats(teamSize, meetingStartRow + 1);

  const meetingRooms = [
    { row: meetingStartRow, col: 1, w: 10, h: 4 },
  ];
  if (needsSecondMeeting) {
    meetingRooms.push({ row: meetingStartRow, col: 15, w: 10, h: 4 });
  }

  const breakRoom = { row: breakRoomStartRow, col: 1, w: 12, h: breakRoomHeight };

  // --- Right-side rooms (cols 15-27) ---
  // Ensure enough rows for right-side rooms (minimum 16 rows)
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
