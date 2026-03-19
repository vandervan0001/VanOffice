/**
 * Generate a Tiled-compatible tilemap JSON from an OfficeConfig.
 *
 * The output can be loaded directly into Phaser via:
 *   this.load.tilemapTiledJSON("office", json);
 *
 * Tile GIDs are 1-indexed (Tiled convention: 0 = empty).
 * Our tileset has 8 columns × 6 rows = 48 tiles.
 * GID = tileIndex + 1   (tile 0 in the PNG → GID 1 in layer data).
 */

import type { OfficeConfig, RoomRect } from "./office-layout";

/* ------------------------------------------------------------------ */
/*  Tile index constants (0-based in the PNG tileset)                 */
/*  GID in layer data = TILE_* + 1                                    */
/* ------------------------------------------------------------------ */

// Row 0: Floors
export const TILE_FLOOR_LIGHT     = 0;
export const TILE_FLOOR_DARK      = 1;
export const TILE_FLOOR_BOSS      = 2;
export const TILE_FLOOR_SERVER    = 3;
export const TILE_FLOOR_ARCHIVES  = 4;
export const TILE_FLOOR_LOUNGE    = 5;
export const TILE_FLOOR_RESTROOM  = 6;
export const TILE_FLOOR_HALLWAY   = 7;

// Row 1: Walls
export const TILE_WALL_BACK       = 8;
export const TILE_WALL_SIDE       = 9;
export const TILE_WALL_BASEBOARD  = 10;
export const TILE_WALL_ROOM       = 11;
export const TILE_DOOR_GAP        = 12;
export const TILE_WINDOW          = 13;
export const TILE_WALL_CORNER     = 14;
export const TILE_EMPTY           = 15;

// Row 2: Desk furniture
export const TILE_DESK_TL         = 16;
export const TILE_DESK_TC         = 17;
export const TILE_DESK_TR         = 18;
export const TILE_DESK_BL         = 19;
export const TILE_DESK_BC         = 20;
export const TILE_DESK_BR         = 21;
export const TILE_CHAIR           = 22;
export const TILE_DESK_EMPTY      = 23;

// Row 3: Office furniture
export const TILE_BOOKSHELF_TOP   = 24;
export const TILE_BOOKSHELF_BOT   = 25;
export const TILE_FILING_CABINET  = 26;
export const TILE_PLANT           = 27;
export const TILE_WATER_COOLER    = 28;
export const TILE_COFFEE_MACHINE  = 29;
export const TILE_PRINTER         = 30;
export const TILE_WHITEBOARD      = 31;

// Row 4: Meeting & lounge
export const TILE_MEETING_TL      = 32;
export const TILE_MEETING_TR      = 33;
export const TILE_MEETING_BL      = 34;
export const TILE_MEETING_BR      = 35;
export const TILE_COUCH_LEFT      = 36;
export const TILE_COUCH_RIGHT     = 37;
export const TILE_COFFEE_TABLE    = 38;
export const TILE_TV_SCREEN       = 39;

// Row 5: Special
export const TILE_SERVER_RACK     = 40;
export const TILE_SERVER_RACK2    = 41;
export const TILE_ARCHIVE_BOX     = 42;
export const TILE_VENDING_TOP     = 43;
export const TILE_VENDING_BOT     = 44;
export const TILE_FIRE_EXT        = 45;
export const TILE_NOTICE_BOARD    = 46;
export const TILE_RUG_CENTER      = 47;

const TILESET_COLS = 8;
const TILESET_ROWS = 6;
const TILE_SIZE = 32;

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface TiledLayerJSON {
  name: string;
  type: "tilelayer";
  data: number[];
  width: number;
  height: number;
  x: number;
  y: number;
  opacity: number;
  visible: boolean;
}

export interface TiledMapJSON {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  orientation: "orthogonal";
  renderorder: "right-down";
  layers: TiledLayerJSON[];
  tilesets: Array<{
    firstgid: number;
    name: string;
    tilewidth: number;
    tileheight: number;
    imagewidth: number;
    imageheight: number;
    columns: number;
    image: string;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Convert a 0-based tile index to a Tiled GID (1-indexed, 0 = empty). */
function gid(tileIndex: number): number {
  return tileIndex + 1;
}

/** Create an empty layer filled with 0 (= empty). */
function emptyLayer(name: string, w: number, h: number): TiledLayerJSON {
  return {
    name,
    type: "tilelayer",
    data: new Array(w * h).fill(0),
    width: w,
    height: h,
    x: 0,
    y: 0,
    opacity: 1,
    visible: true,
  };
}

/** Set a tile in a layer. Row/col are grid coordinates. */
function setTile(layer: TiledLayerJSON, row: number, col: number, tileGid: number) {
  if (row < 0 || row >= layer.height || col < 0 || col >= layer.width) return;
  layer.data[row * layer.width + col] = tileGid;
}

/** Get a tile from a layer. */
function getTile(layer: TiledLayerJSON, row: number, col: number): number {
  if (row < 0 || row >= layer.height || col < 0 || col >= layer.width) return 0;
  return layer.data[row * layer.width + col];
}

/** Fill a rectangular region in a layer with one GID. */
function fillRect(
  layer: TiledLayerJSON,
  row: number,
  col: number,
  w: number,
  h: number,
  tileGid: number,
) {
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      setTile(layer, r, c, tileGid);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Main generator                                                    */
/* ------------------------------------------------------------------ */

export function generateTilemapJSON(
  config: OfficeConfig,
  teamSize: number,
): TiledMapJSON {
  const W = config.cols;
  const H = config.rows;

  const floor     = emptyLayer("floor", W, H);
  const walls     = emptyLayer("walls", W, H);
  const furniture = emptyLayer("furniture", W, H);
  const collision = emptyLayer("collision", W, H);

  // ================================================================
  // 1. FLOOR LAYER — fill everything with default floor first
  // ================================================================

  // Default: checkerboard parquet for the whole map
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const floorTile = (r + c) % 2 === 0 ? TILE_FLOOR_LIGHT : TILE_FLOOR_DARK;
      setTile(floor, r, c, gid(floorTile));
    }
  }

  // Hallway floor
  if (config.hallway) {
    fillRoomFloor(floor, config.hallway, TILE_FLOOR_HALLWAY);
  }

  // Room-specific floors
  if (config.bossOffice) fillRoomFloor(floor, config.bossOffice, TILE_FLOOR_BOSS);
  if (config.serverRoom) fillRoomFloor(floor, config.serverRoom, TILE_FLOOR_SERVER);
  if (config.archives) fillRoomFloor(floor, config.archives, TILE_FLOOR_ARCHIVES);
  if (config.lounge) fillRoomFloor(floor, config.lounge, TILE_FLOOR_LOUNGE);
  if (config.restrooms) fillRoomFloor(floor, config.restrooms, TILE_FLOOR_RESTROOM);

  // ================================================================
  // 2. WALLS LAYER
  // ================================================================

  // Back wall: row 0 only (thin wall)
  for (let c = 0; c < W; c++) {
    setTile(walls, 0, c, gid(TILE_WALL_BACK));
  }

  // Add windows along back wall row 0
  for (let c = 4; c < W - 2; c += 4) {
    if (c < W) setTile(walls, 0, c, gid(TILE_WINDOW));
  }

  // Baseboard: row 1
  for (let c = 0; c < W; c++) {
    setTile(walls, 1, c, gid(TILE_WALL_BASEBOARD));
  }

  // Room walls for right-side rooms
  placeRoomWalls(walls, config.bossOffice, "left");
  placeRoomWalls(walls, config.serverRoom, "left");
  placeRoomWalls(walls, config.archives, "left");
  placeRoomWalls(walls, config.lounge, "left");
  placeRoomWalls(walls, config.restrooms, "left");

  // Meeting room walls (doorway at top — agents enter from desk area above)
  for (const room of config.meetingRooms) {
    placeRoomWalls(walls, room, "top");
  }

  // Break room walls (doorway at top — agents enter from desk area)
  if (config.breakRoom) {
    placeRoomWalls(walls, config.breakRoom, "top");
  }

  // ================================================================
  // 3. FURNITURE LAYER
  // ================================================================

  // --- Desks ---
  for (const desk of config.desks) {
    // Desk: 3 wide × 2 tall
    setTile(furniture, desk.row, desk.col, gid(TILE_DESK_TL));
    setTile(furniture, desk.row, desk.col + 1, gid(TILE_DESK_TC));
    setTile(furniture, desk.row, desk.col + 2, gid(TILE_DESK_TR));
    setTile(furniture, desk.row + 1, desk.col, gid(TILE_DESK_BL));
    setTile(furniture, desk.row + 1, desk.col + 1, gid(TILE_DESK_BC));
    setTile(furniture, desk.row + 1, desk.col + 2, gid(TILE_DESK_BR));
    // Chair below desk center
    setTile(furniture, desk.row + 2, desk.col + 1, gid(TILE_CHAIR));
  }

  // --- Meeting room tables ---
  for (const room of config.meetingRooms) {
    const tableCol = room.col + Math.floor((room.w - 2) / 2);
    const tableRow = room.row + Math.floor((room.h - 2) / 2);
    setTile(furniture, tableRow, tableCol, gid(TILE_MEETING_TL));
    setTile(furniture, tableRow, tableCol + 1, gid(TILE_MEETING_TR));
    setTile(furniture, tableRow + 1, tableCol, gid(TILE_MEETING_BL));
    setTile(furniture, tableRow + 1, tableCol + 1, gid(TILE_MEETING_BR));
  }

  // --- Break room furniture ---
  if (config.breakRoom) {
    const br = config.breakRoom;
    // Coffee machine + water cooler on left
    setTile(furniture, br.row, br.col + 1, gid(TILE_COFFEE_MACHINE));
    setTile(furniture, br.row, br.col + 2, gid(TILE_WATER_COOLER));
    // Couch on right side
    const couchCol = br.col + Math.max(0, br.w - 4);
    setTile(furniture, br.row + 1, couchCol, gid(TILE_COUCH_LEFT));
    setTile(furniture, br.row + 1, couchCol + 1, gid(TILE_COUCH_RIGHT));
    setTile(furniture, br.row + 1, couchCol + 2, gid(TILE_COFFEE_TABLE));
  }

  // --- Boss office furniture ---
  if (config.bossOffice) {
    const bo = config.bossOffice;
    // Big desk at top of room
    setTile(furniture, bo.row + 1, bo.col + 3, gid(TILE_DESK_TL));
    setTile(furniture, bo.row + 1, bo.col + 4, gid(TILE_DESK_TC));
    setTile(furniture, bo.row + 1, bo.col + 5, gid(TILE_DESK_TR));
    // Chair behind desk
    setTile(furniture, bo.row + 2, bo.col + 4, gid(TILE_CHAIR));
    // Bookshelves on right wall
    setTile(furniture, bo.row + 1, bo.col + bo.w - 2, gid(TILE_BOOKSHELF_TOP));
    setTile(furniture, bo.row + 2, bo.col + bo.w - 2, gid(TILE_BOOKSHELF_BOT));
    // Plant in corner
    setTile(furniture, bo.row + 1, bo.col + 1, gid(TILE_PLANT));
    // Rug
    setTile(furniture, bo.row + 2, bo.col + 3, gid(TILE_RUG_CENTER));
  }

  // --- Server room furniture ---
  if (config.serverRoom) {
    const sr = config.serverRoom;
    // Server racks (fill 3 columns, 2 rows)
    for (let dc = 1; dc <= 3 && dc < sr.w - 1; dc++) {
      setTile(furniture, sr.row + 1, sr.col + dc, gid(dc % 2 === 1 ? TILE_SERVER_RACK : TILE_SERVER_RACK2));
      setTile(furniture, sr.row + 2, sr.col + dc, gid(dc % 2 === 1 ? TILE_SERVER_RACK2 : TILE_SERVER_RACK));
    }
  }

  // --- Archives furniture ---
  if (config.archives) {
    const ar = config.archives;
    // Filing cabinets
    for (let dc = 1; dc <= 4 && dc < ar.w - 1; dc++) {
      setTile(furniture, ar.row + 1, ar.col + dc, gid(TILE_FILING_CABINET));
    }
    // Archive boxes below
    for (let dc = 1; dc <= 4 && dc < ar.w - 1; dc++) {
      setTile(furniture, ar.row + 2, ar.col + dc, gid(TILE_ARCHIVE_BOX));
    }
  }

  // --- Lounge furniture ---
  if (config.lounge) {
    const lo = config.lounge;
    // Couch 1 (left side)
    setTile(furniture, lo.row + 1, lo.col + 1, gid(TILE_COUCH_LEFT));
    setTile(furniture, lo.row + 2, lo.col + 1, gid(TILE_COUCH_RIGHT));
    // Coffee table
    setTile(furniture, lo.row + 1, lo.col + 3, gid(TILE_COFFEE_TABLE));
    // Couch 2 (right side)
    setTile(furniture, lo.row + 1, lo.col + 5, gid(TILE_COUCH_LEFT));
    setTile(furniture, lo.row + 2, lo.col + 5, gid(TILE_COUCH_RIGHT));
    // TV on top wall
    setTile(furniture, lo.row, lo.col + 3, gid(TILE_TV_SCREEN));
    // Vending machine (right edge)
    if (lo.w >= 8) {
      setTile(furniture, lo.row + 1, lo.col + lo.w - 2, gid(TILE_VENDING_TOP));
      setTile(furniture, lo.row + 2, lo.col + lo.w - 2, gid(TILE_VENDING_BOT));
    }
  }

  // --- Scatter items: plants, printer, whiteboard, fire ext, notice board ---
  // Plant near hallway (just outside, not blocking the corridor)
  if (config.hallway) {
    setTile(furniture, config.hallway.row + config.hallway.h, config.hallway.col, gid(TILE_PLANT));
  }

  // Printer + whiteboard near desks (if space allows)
  if (config.desks.length > 0) {
    const lastDeskRow = config.desks[config.desks.length - 1].row;
    // Printer next to last desk row
    setTile(furniture, lastDeskRow, 13, gid(TILE_PRINTER));
    // Whiteboard on baseboard row
    if (W > 14) {
      setTile(furniture, 1, 14, gid(TILE_WHITEBOARD));
    }
  }

  // Fire extinguisher near server room
  if (config.serverRoom) {
    const sr = config.serverRoom;
    setTile(furniture, sr.row + sr.h - 1, sr.col + sr.w - 2, gid(TILE_FIRE_EXT));
  }

  // Notice board near boss office
  if (config.bossOffice) {
    setTile(furniture, config.bossOffice.row, config.bossOffice.col + 3, gid(TILE_NOTICE_BOARD));
  }

  // ================================================================
  // 4. COLLISION LAYER — mark blocked cells with GID 1
  // ================================================================

  const COLLISION_GID = 1; // any non-zero value means blocked

  // Walls are blocked (rows 0-1)
  for (let c = 0; c < W; c++) {
    setTile(collision, 0, c, COLLISION_GID);
    setTile(collision, 1, c, COLLISION_GID);
  }

  // All furniture cells are blocked
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (getTile(furniture, r, c) !== 0) {
        setTile(collision, r, c, COLLISION_GID);
      }
    }
  }

  // All wall cells (from walls layer, excluding floor-level doors) are blocked
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const wallGid = getTile(walls, r, c);
      if (wallGid !== 0 && wallGid !== gid(TILE_DOOR_GAP)) {
        setTile(collision, r, c, COLLISION_GID);
      }
    }
  }

  // UNBLOCK: any cell that has floor but no furniture and no solid wall is walkable
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const floorGid = getTile(floor, r, c);
      const wallGid = getTile(walls, r, c);
      const furnGid = getTile(furniture, r, c);
      // Has floor, no furniture, and no solid wall (or is a door gap) → walkable
      if (floorGid !== 0 && furnGid === 0 && (wallGid === 0 || wallGid === gid(TILE_DOOR_GAP))) {
        setTile(collision, r, c, 0);
      }
    }
  }

  // Also unblock desk seats explicitly (they have furniture=chair but must be walkable)
  for (const desk of config.desks) {
    setTile(collision, desk.row + 1, desk.col + 1, 0); // chair cell
    setTile(collision, desk.row + 2, desk.col + 1, 0); // walkway in front
  }

  // Unblock meeting seats
  for (const seat of config.meetingSeats) {
    setTile(collision, seat.row, seat.col, 0);
  }

  // ================================================================
  // Assemble final JSON
  // ================================================================

  return {
    width: W,
    height: H,
    tilewidth: TILE_SIZE,
    tileheight: TILE_SIZE,
    orientation: "orthogonal",
    renderorder: "right-down",
    layers: [floor, walls, furniture, collision],
    tilesets: [
      {
        firstgid: 1,
        name: "office",
        tilewidth: TILE_SIZE,
        tileheight: TILE_SIZE,
        imagewidth: TILESET_COLS * TILE_SIZE,
        imageheight: TILESET_ROWS * TILE_SIZE,
        columns: TILESET_COLS,
        image: "/sprites/office-tileset.png",
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  Private layout helpers                                            */
/* ------------------------------------------------------------------ */

/** Fill interior of a room rect with a specific floor tile. */
function fillRoomFloor(layer: TiledLayerJSON, room: RoomRect, tileIndex: number) {
  for (let r = room.row; r < room.row + room.h; r++) {
    for (let c = room.col; c < room.col + room.w; c++) {
      setTile(layer, r, c, gid(tileIndex));
    }
  }
}

/**
 * Place room walls (perimeter) with a doorway gap.
 * doorSide: which side has the door opening.
 */
function placeRoomWalls(
  layer: TiledLayerJSON,
  room: RoomRect | null,
  doorSide: "left" | "bottom" | "top",
) {
  if (!room) return;

  const { row, col, w, h } = room;

  // Top wall
  if (doorSide === "top") {
    const doorMid = col + Math.floor(w / 2);
    for (let c = col; c < col + w; c++) {
      // 3-cell wide door gap centered
      if (c >= doorMid - 1 && c <= doorMid + 1) {
        setTile(layer, row, c, gid(TILE_DOOR_GAP));
      } else {
        setTile(layer, row, c, gid(TILE_WALL_ROOM));
      }
    }
  } else {
    for (let c = col; c < col + w; c++) {
      setTile(layer, row, c, gid(TILE_WALL_ROOM));
    }
  }

  // Bottom wall
  if (doorSide === "bottom") {
    const doorMid = col + Math.floor(w / 2);
    for (let c = col; c < col + w; c++) {
      if (c >= doorMid - 1 && c <= doorMid + 1) {
        setTile(layer, row + h - 1, c, gid(TILE_DOOR_GAP));
      } else {
        setTile(layer, row + h - 1, c, gid(TILE_WALL_ROOM));
      }
    }
  } else {
    for (let c = col; c < col + w; c++) {
      setTile(layer, row + h - 1, c, gid(TILE_WALL_ROOM));
    }
  }

  // Left wall
  if (doorSide === "left") {
    const doorRow = row + Math.floor(h / 2);
    for (let r = row; r < row + h; r++) {
      if (r === doorRow || r === doorRow - 1) {
        setTile(layer, r, col, gid(TILE_DOOR_GAP));
      } else {
        setTile(layer, r, col, gid(TILE_WALL_ROOM));
      }
    }
  } else {
    for (let r = row; r < row + h; r++) {
      setTile(layer, r, col, gid(TILE_WALL_ROOM));
    }
  }

  // Right wall
  for (let r = row; r < row + h; r++) {
    setTile(layer, r, col + w - 1, gid(TILE_WALL_ROOM));
  }

  // Corners
  setTile(layer, row, col, gid(TILE_WALL_CORNER));
  setTile(layer, row, col + w - 1, gid(TILE_WALL_CORNER));
  setTile(layer, row + h - 1, col, gid(doorSide === "left" ? TILE_WALL_ROOM : TILE_WALL_CORNER));
  setTile(layer, row + h - 1, col + w - 1, gid(TILE_WALL_CORNER));
}
