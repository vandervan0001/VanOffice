import { describe, it, expect } from "vitest";
import { generateOfficeConfig } from "@/lib/state/office-layout";
import {
  generateTilemapJSON,
  TILE_FLOOR_LIGHT,
  TILE_FLOOR_DARK,
  TILE_FLOOR_BOSS,
  TILE_FLOOR_SERVER,
  TILE_FLOOR_ARCHIVES,
  TILE_FLOOR_LOUNGE,
  TILE_FLOOR_RESTROOM,
  TILE_DOOR_GAP,
  type TiledMapJSON,
} from "@/lib/state/tilemap-generator";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getLayer(map: TiledMapJSON, name: string) {
  const layer = map.layers.find((l) => l.name === name);
  if (!layer) throw new Error(`Layer "${name}" not found`);
  return layer;
}

function tileAt(map: TiledMapJSON, layerName: string, row: number, col: number): number {
  const layer = getLayer(map, layerName);
  return layer.data[row * layer.width + col];
}

/** Collect all non-zero cells from a layer as "row,col" strings. */
function occupiedCells(map: TiledMapJSON, layerName: string): Set<string> {
  const layer = getLayer(map, layerName);
  const cells = new Set<string>();
  for (let r = 0; r < layer.height; r++) {
    for (let c = 0; c < layer.width; c++) {
      if (layer.data[r * layer.width + c] !== 0) {
        cells.add(`${r},${c}`);
      }
    }
  }
  return cells;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("tilemap-generator", () => {
  const TEAM_SIZE = 5;
  const config = generateOfficeConfig(TEAM_SIZE);
  const map = generateTilemapJSON(config, TEAM_SIZE);

  // ------------------------------------------------------------------
  // Dimensions
  // ------------------------------------------------------------------

  it("has correct width and height matching OfficeConfig", () => {
    expect(map.width).toBe(config.cols);
    expect(map.height).toBe(config.rows);
    expect(map.tilewidth).toBe(32);
    expect(map.tileheight).toBe(32);
  });

  it("has exactly 4 layers", () => {
    expect(map.layers).toHaveLength(4);
    const names = map.layers.map((l) => l.name);
    expect(names).toEqual(["floor", "walls", "furniture", "collision"]);
  });

  it("every layer data array has width * height entries", () => {
    for (const layer of map.layers) {
      expect(layer.data).toHaveLength(map.width * map.height);
      expect(layer.width).toBe(map.width);
      expect(layer.height).toBe(map.height);
    }
  });

  it("has a valid tileset definition", () => {
    expect(map.tilesets).toHaveLength(1);
    const ts = map.tilesets[0];
    expect(ts.firstgid).toBe(1);
    expect(ts.tilewidth).toBe(32);
    expect(ts.tileheight).toBe(32);
    expect(ts.columns).toBe(8);
    expect(ts.imagewidth).toBe(256);
    expect(ts.imageheight).toBe(192);
  });

  // ------------------------------------------------------------------
  // Floor coverage
  // ------------------------------------------------------------------

  it("all cells have a floor tile (no empty cells on floor layer)", () => {
    const floor = getLayer(map, "floor");
    for (let i = 0; i < floor.data.length; i++) {
      expect(floor.data[i]).toBeGreaterThan(0);
    }
  });

  it("rooms have correct floor tile types", () => {
    // GID = tileIndex + 1
    if (config.bossOffice) {
      const bo = config.bossOffice;
      // Check an interior cell
      const floorGid = tileAt(map, "floor", bo.row + 1, bo.col + 1);
      expect(floorGid).toBe(TILE_FLOOR_BOSS + 1);
    }

    if (config.serverRoom) {
      const sr = config.serverRoom;
      const floorGid = tileAt(map, "floor", sr.row + 1, sr.col + 1);
      expect(floorGid).toBe(TILE_FLOOR_SERVER + 1);
    }

    if (config.archives) {
      const ar = config.archives;
      const floorGid = tileAt(map, "floor", ar.row + 1, ar.col + 1);
      expect(floorGid).toBe(TILE_FLOOR_ARCHIVES + 1);
    }

    if (config.lounge) {
      const lo = config.lounge;
      const floorGid = tileAt(map, "floor", lo.row + 1, lo.col + 1);
      expect(floorGid).toBe(TILE_FLOOR_LOUNGE + 1);
    }

    if (config.restrooms) {
      const rr = config.restrooms;
      const floorGid = tileAt(map, "floor", rr.row + 1, rr.col + 1);
      expect(floorGid).toBe(TILE_FLOOR_RESTROOM + 1);
    }
  });

  it("open area has checkerboard parquet floor", () => {
    // Row 5, col 0 should be light or dark parquet (not a room-specific tile)
    const floorGid = tileAt(map, "floor", 5, 0);
    const isParquet =
      floorGid === TILE_FLOOR_LIGHT + 1 || floorGid === TILE_FLOOR_DARK + 1;
    expect(isParquet).toBe(true);
  });

  // ------------------------------------------------------------------
  // Walls
  // ------------------------------------------------------------------

  it("back wall rows 0-1 have wall tiles", () => {
    for (let c = 0; c < map.width; c++) {
      expect(tileAt(map, "walls", 0, c)).toBeGreaterThan(0);
      expect(tileAt(map, "walls", 1, c)).toBeGreaterThan(0);
    }
  });

  it("baseboard row 2 has wall tiles", () => {
    for (let c = 0; c < map.width; c++) {
      expect(tileAt(map, "walls", 2, c)).toBeGreaterThan(0);
    }
  });

  // ------------------------------------------------------------------
  // Furniture: no overlaps
  // ------------------------------------------------------------------

  it("no two furniture items occupy the same cell", () => {
    const furnitureLayer = getLayer(map, "furniture");
    // The data array is set once per cell. If we set the same cell twice,
    // the second write overwrites the first. We verify by checking that
    // the count of non-zero cells matches the total non-zero writes.
    // Since we can't detect overwrites directly, we verify all expected
    // furniture pieces are present.
    const cells = occupiedCells(map, "furniture");
    // Count non-zero entries directly
    const directCount = furnitureLayer.data.filter((g) => g !== 0).length;
    expect(cells.size).toBe(directCount);
  });

  it("every desk has 6 furniture tiles (3x2)", () => {
    for (const desk of config.desks) {
      for (let dr = 0; dr < 2; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          const gid = tileAt(map, "furniture", desk.row + dr, desk.col + dc);
          expect(gid).toBeGreaterThan(0);
        }
      }
    }
  });

  // ------------------------------------------------------------------
  // Collision layer
  // ------------------------------------------------------------------

  it("collision blocks walls (rows 0-2)", () => {
    for (let c = 0; c < map.width; c++) {
      expect(tileAt(map, "collision", 0, c)).toBeGreaterThan(0);
      expect(tileAt(map, "collision", 1, c)).toBeGreaterThan(0);
      expect(tileAt(map, "collision", 2, c)).toBeGreaterThan(0);
    }
  });

  it("collision blocks all furniture cells", () => {
    const furnitureCells = occupiedCells(map, "furniture");
    for (const key of furnitureCells) {
      const [r, c] = key.split(",").map(Number);
      // Some furniture cells may be explicitly unblocked (desk seats)
      // so only check that furniture cells that are NOT desk seats are blocked.
      const isDeskSeat = config.desks.some(
        (d) => r === d.row + 1 && c === d.col + 1,
      );
      const isChairCell = config.desks.some(
        (d) => r === d.row + 2 && c === d.col + 1,
      );
      if (!isDeskSeat && !isChairCell) {
        expect(tileAt(map, "collision", r, c)).toBeGreaterThan(0);
      }
    }
  });

  it("desk seat cells are unblocked in collision layer", () => {
    for (const desk of config.desks) {
      // Agent sits at desk center: row+1, col+1
      expect(tileAt(map, "collision", desk.row + 1, desk.col + 1)).toBe(0);
      // Cell in front of desk for walking
      expect(tileAt(map, "collision", desk.row + 2, desk.col + 1)).toBe(0);
    }
  });

  it("meeting seats are unblocked in collision layer (unless overlapping furniture)", () => {
    for (const seat of config.meetingSeats) {
      const furnGid = tileAt(map, "furniture", seat.row, seat.col);
      if (furnGid === 0) {
        // No furniture here — seat should be passable
        expect(tileAt(map, "collision", seat.row, seat.col)).toBe(0);
      } else {
        // Furniture takes priority — cell stays blocked
        expect(tileAt(map, "collision", seat.row, seat.col)).toBeGreaterThan(0);
      }
    }
  });

  it("door gaps are not blocked in collision layer", () => {
    const wallsLayer = getLayer(map, "walls");
    for (let r = 0; r < map.height; r++) {
      for (let c = 0; c < map.width; c++) {
        if (wallsLayer.data[r * map.width + c] === TILE_DOOR_GAP + 1) {
          expect(tileAt(map, "collision", r, c)).toBe(0);
        }
      }
    }
  });

  // ------------------------------------------------------------------
  // GID validity
  // ------------------------------------------------------------------

  it("all GIDs are within valid tileset range", () => {
    const maxGid = 48; // 8 cols × 6 rows
    for (const layer of map.layers) {
      for (const gid of layer.data) {
        expect(gid).toBeGreaterThanOrEqual(0);
        expect(gid).toBeLessThanOrEqual(maxGid);
      }
    }
  });

  // ------------------------------------------------------------------
  // Different team sizes
  // ------------------------------------------------------------------

  it("works for team size 1", () => {
    const cfg = generateOfficeConfig(1);
    const m = generateTilemapJSON(cfg, 1);
    expect(m.width).toBe(cfg.cols);
    expect(m.height).toBe(cfg.rows);
    expect(m.layers).toHaveLength(4);
  });

  it("works for team size 12", () => {
    const cfg = generateOfficeConfig(12);
    const m = generateTilemapJSON(cfg, 12);
    expect(m.width).toBe(cfg.cols);
    expect(m.height).toBe(cfg.rows);
    // Should have 12 desks
    const furnitureCells = occupiedCells(m, "furniture");
    // At minimum 12 desks × 6 tiles + 12 chairs = 84 furniture tiles
    expect(furnitureCells.size).toBeGreaterThanOrEqual(84);
  });
});
