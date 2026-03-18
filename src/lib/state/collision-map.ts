/**
 * Generate a collision map (set of blocked cell keys) from an OfficeConfig.
 * Used by A* pathfinding to route agents around furniture.
 */

import type { OfficeConfig } from "./office-layout";

/** Returns "row,col" key matching pathfinding convention. */
function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

/**
 * Build a Set of blocked "row,col" keys for the given office layout.
 *
 * Blocked areas:
 * - Wall rows (rows 0-1)
 * - Desk footprints (3 wide x 2 tall per desk)
 * - Meeting room tables (central area, leaving seats/doorway clear)
 * - Break room furniture (coffee area, couch)
 *
 * Clear areas (explicitly kept passable):
 * - Corridors between desk rows
 * - Meeting room doorway cells
 * - Break room walkways
 */
export function buildCollisionMap(cfg: OfficeConfig): Set<string> {
  const blocked = new Set<string>();

  // --- Wall: rows 0-2 are the back wall (visually) ---
  // Row 0-1 fully blocked (wall), row 2 is baseboard area
  for (let c = 0; c < cfg.cols; c++) {
    blocked.add(cellKey(0, c));
    blocked.add(cellKey(1, c));
    blocked.add(cellKey(2, c));
  }

  // --- Desks: each desk is 3 cols wide x 2 rows tall ---
  for (const desk of cfg.desks) {
    for (let dr = 0; dr < 2; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        const r = desk.row + dr;
        const c = desk.col + dc;
        if (r >= 0 && r < cfg.rows && c >= 0 && c < cfg.cols) {
          blocked.add(cellKey(r, c));
        }
      }
    }
  }

  // --- Meeting rooms: block the table area in the centre ---
  for (const room of cfg.meetingRooms) {
    // Table occupies roughly the central 4x2 of the room
    const tableStartCol = room.col + Math.floor((room.w - 4) / 2);
    const tableStartRow = room.row + Math.floor((room.h - 2) / 2);
    for (let dr = 0; dr < 2; dr++) {
      for (let dc = 0; dc < 4; dc++) {
        const r = tableStartRow + dr;
        const c = tableStartCol + dc;
        if (r >= 0 && r < cfg.rows && c >= 0 && c < cfg.cols) {
          blocked.add(cellKey(r, c));
        }
      }
    }

    // Block room walls (perimeter) except the bottom-centre doorway
    for (let c = room.col; c < room.col + room.w; c++) {
      // Top wall
      blocked.add(cellKey(room.row, c));
    }
    for (let r = room.row; r < room.row + room.h; r++) {
      // Left wall
      blocked.add(cellKey(r, room.col));
      // Right wall
      blocked.add(cellKey(r, room.col + room.w - 1));
    }
    // Bottom wall with doorway gap in the middle
    const doorCol = room.col + Math.floor(room.w / 2);
    for (let c = room.col; c < room.col + room.w; c++) {
      if (c === doorCol || c === doorCol - 1) continue; // doorway
      blocked.add(cellKey(room.row + room.h - 1, c));
    }
  }

  // --- Break room: block furniture, keep paths clear ---
  if (cfg.breakRoom) {
    const br = cfg.breakRoom;
    // Coffee maker / appliance area (first 2 cols, first row)
    for (let dc = 0; dc < 2; dc++) {
      const c = br.col + dc;
      if (c < cfg.cols) {
        blocked.add(cellKey(br.row, c));
      }
    }
    // Couch area (right side of break room)
    const couchStartCol = br.col + Math.max(0, br.w - 4);
    for (let dc = 0; dc < 3; dc++) {
      const c = couchStartCol + dc;
      const r = br.row + 1;
      if (c < cfg.cols && r < cfg.rows) {
        blocked.add(cellKey(r, c));
      }
    }
  }

  // --- Unblock desk seats (agents sit here) ---
  for (const desk of cfg.desks) {
    // Agent sits at desk center: row+1, col+1
    blocked.delete(cellKey(desk.row + 1, desk.col + 1));
    // Also clear the cell in front of the desk for walking away
    blocked.delete(cellKey(desk.row + 2, desk.col + 1));
  }

  // --- Unblock meeting seats (agents stand/sit here) ---
  for (const seat of cfg.meetingSeats) {
    blocked.delete(cellKey(seat.row, seat.col));
  }

  return blocked;
}
