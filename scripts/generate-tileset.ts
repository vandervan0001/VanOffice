/**
 * Generate a 32x32 pixel-art tileset PNG for the office Phaser tilemap.
 *
 * Usage:  npx tsx scripts/generate-tileset.ts
 * Output: public/sprites/office-tileset.png
 *
 * Tileset grid: 8 columns × 6 rows = 48 tiles, each 32×32.
 */

import { createCanvas, type CanvasRenderingContext2D } from "canvas";
import * as fs from "node:fs";
import * as path from "node:path";

const TILE = 32;
const COLS = 8;
const ROWS = 6;

const canvas = createCanvas(COLS * TILE, ROWS * TILE);
const ctx = canvas.getContext("2d");

/* ------------------------------------------------------------------ */
/*  Helper drawing primitives                                         */
/* ------------------------------------------------------------------ */

/** Fill entire tile with one color */
function fillTile(ctx: CanvasRenderingContext2D, col: number, row: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
}

/** Draw a small rectangle inside a tile (relative coords) */
function rect(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(col * TILE + x, row * TILE + y, w, h);
}

/** Draw a single pixel inside a tile */
function pixel(ctx: CanvasRenderingContext2D, col: number, row: number, x: number, y: number, color: string) {
  rect(ctx, col, row, x, y, 1, 1, color);
}

/** Draw horizontal line inside tile */
function hline(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  x: number,
  y: number,
  len: number,
  color: string,
) {
  rect(ctx, col, row, x, y, len, 1, color);
}

/** Draw vertical line inside tile */
function vline(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  x: number,
  y: number,
  len: number,
  color: string,
) {
  rect(ctx, col, row, x, y, 1, len, color);
}

/* ------------------------------------------------------------------ */
/*  Tile drawing functions                                            */
/* ------------------------------------------------------------------ */

// --- Row 0: Floors ---

function drawLightParquet(c: number, r: number) {
  fillTile(ctx, c, r, "#c8a878");
  // subtle parquet lines
  hline(ctx, c, r, 0, 8, 16, "#c0a070");
  hline(ctx, c, r, 16, 24, 16, "#c0a070");
  vline(ctx, c, r, 16, 0, 16, "#c0a070");
  vline(ctx, c, r, 0, 16, 16, "#c0a070");
}

function drawDarkParquet(c: number, r: number) {
  fillTile(ctx, c, r, "#c4a474");
  hline(ctx, c, r, 0, 8, 16, "#bc9c6c");
  hline(ctx, c, r, 16, 24, 16, "#bc9c6c");
  vline(ctx, c, r, 16, 0, 16, "#bc9c6c");
  vline(ctx, c, r, 0, 16, 16, "#bc9c6c");
}

function drawBossFloor(c: number, r: number) {
  fillTile(ctx, c, r, "#c49a6c");
  // wood grain lines
  for (let i = 0; i < 32; i += 6) {
    hline(ctx, c, r, 0, i, 32, "#bc9264");
  }
}

function drawServerFloor(c: number, r: number) {
  fillTile(ctx, c, r, "#3a3a4a");
  // grid lines for raised floor
  for (let i = 0; i < 32; i += 8) {
    hline(ctx, c, r, 0, i, 32, "#444458");
    vline(ctx, c, r, i, 0, 32, "#444458");
  }
}

function drawArchivesFloor(c: number, r: number) {
  fillTile(ctx, c, r, "#b8a080");
  hline(ctx, c, r, 0, 16, 32, "#b09878");
}

function drawLoungeFloor(c: number, r: number) {
  fillTile(ctx, c, r, "#d4b888");
  hline(ctx, c, r, 0, 16, 32, "#ccb080");
}

function drawRestroomFloor(c: number, r: number) {
  fillTile(ctx, c, r, "#888888");
  // tile grid
  for (let i = 0; i < 32; i += 8) {
    hline(ctx, c, r, 0, i, 32, "#808080");
    vline(ctx, c, r, i, 0, 32, "#808080");
  }
}

function drawHallwayFloor(c: number, r: number) {
  fillTile(ctx, c, r, "#c8a878");
  hline(ctx, c, r, 0, 8, 16, "#c0a070");
  hline(ctx, c, r, 16, 24, 16, "#c0a070");
}

// --- Row 1: Walls ---

function drawBackWall(c: number, r: number) {
  fillTile(ctx, c, r, "#f2e4d0");
  // subtle horizontal mortar lines
  hline(ctx, c, r, 0, 10, 32, "#ece0cc");
  hline(ctx, c, r, 0, 22, 32, "#ece0cc");
}

function drawSideWall(c: number, r: number) {
  fillTile(ctx, c, r, "#f2e4d0");
  vline(ctx, c, r, 10, 0, 32, "#ece0cc");
  vline(ctx, c, r, 22, 0, 32, "#ece0cc");
}

function drawWallBaseboard(c: number, r: number) {
  fillTile(ctx, c, r, "#f2e4d0");
  // dark baseboard strip at bottom
  rect(ctx, c, r, 0, 26, 32, 6, "#5c4a32");
}

function drawRoomWall(c: number, r: number) {
  fillTile(ctx, c, r, "#e0d0b8");
  hline(ctx, c, r, 0, 16, 32, "#d8c8b0");
}

function drawDoorGap(c: number, r: number) {
  fillTile(ctx, c, r, "#c8a878"); // floor color
  // door frame indicators on sides
  vline(ctx, c, r, 0, 0, 32, "#5c4a32");
  vline(ctx, c, r, 31, 0, 32, "#5c4a32");
}

function drawWindow(c: number, r: number) {
  fillTile(ctx, c, r, "#f2e4d0"); // wall bg
  // window frame
  rect(ctx, c, r, 4, 4, 24, 24, "#d4c4a8");
  // glass pane
  rect(ctx, c, r, 6, 6, 20, 20, "#a8d4e8");
  // cross-bar
  hline(ctx, c, r, 6, 16, 20, "#d4c4a8");
  vline(ctx, c, r, 16, 6, 20, "#d4c4a8");
  // light reflection
  rect(ctx, c, r, 8, 8, 3, 3, "#c8e8f8");
}

function drawWallCorner(c: number, r: number) {
  fillTile(ctx, c, r, "#e8d8c0");
  // vertical + horizontal edge
  vline(ctx, c, r, 0, 0, 32, "#d0c0a8");
  hline(ctx, c, r, 0, 0, 32, "#d0c0a8");
}

function drawEmpty(c: number, r: number) {
  // transparent — do nothing (canvas default is transparent)
}

// --- Row 2: Desk furniture ---

function drawDeskTopLeft(c: number, r: number) {
  fillTile(ctx, c, r, "#8B6914");
  // edge highlights
  hline(ctx, c, r, 0, 0, 32, "#7a5c10");
  vline(ctx, c, r, 0, 0, 32, "#7a5c10");
  // monitor base
  rect(ctx, c, r, 12, 20, 8, 4, "#333333");
  rect(ctx, c, r, 14, 16, 4, 4, "#444444");
}

function drawDeskTopCenter(c: number, r: number) {
  fillTile(ctx, c, r, "#8B6914");
  hline(ctx, c, r, 0, 0, 32, "#7a5c10");
  // monitor screen
  rect(ctx, c, r, 4, 4, 24, 18, "#222233");
  rect(ctx, c, r, 6, 6, 20, 14, "#1a1a2e");
  // screen content: code lines
  hline(ctx, c, r, 8, 8, 10, "#66bb6a");
  hline(ctx, c, r, 8, 11, 14, "#42a5f5");
  hline(ctx, c, r, 8, 14, 8, "#66bb6a");
  hline(ctx, c, r, 8, 17, 12, "#42a5f5");
  // monitor stand
  rect(ctx, c, r, 13, 22, 6, 2, "#333333");
  rect(ctx, c, r, 11, 24, 10, 2, "#444444");
}

function drawDeskTopRight(c: number, r: number) {
  fillTile(ctx, c, r, "#8B6914");
  hline(ctx, c, r, 0, 0, 32, "#7a5c10");
  vline(ctx, c, r, 31, 0, 32, "#7a5c10");
  // coffee mug
  rect(ctx, c, r, 20, 14, 8, 10, "#e8e8e8");
  rect(ctx, c, r, 22, 16, 4, 6, "#6b3a1a"); // coffee
  rect(ctx, c, r, 28, 18, 3, 4, "#e8e8e8"); // handle
}

function drawDeskBottomLeft(c: number, r: number) {
  fillTile(ctx, c, r, "#8B6914");
  vline(ctx, c, r, 0, 0, 32, "#7a5c10");
  hline(ctx, c, r, 0, 31, 32, "#7a5c10");
  // keyboard
  rect(ctx, c, r, 8, 8, 18, 8, "#444444");
  rect(ctx, c, r, 9, 9, 16, 6, "#555555");
  // key rows
  for (let kx = 0; kx < 7; kx++) {
    for (let ky = 0; ky < 3; ky++) {
      pixel(ctx, c, r, 10 + kx * 2, 10 + ky * 2, "#777777");
    }
  }
}

function drawDeskBottomCenter(c: number, r: number) {
  fillTile(ctx, c, r, "#8B6914");
  hline(ctx, c, r, 0, 31, 32, "#7a5c10");
  // subtle wood grain
  hline(ctx, c, r, 0, 10, 32, "#836010");
  hline(ctx, c, r, 0, 20, 32, "#836010");
}

function drawDeskBottomRight(c: number, r: number) {
  fillTile(ctx, c, r, "#8B6914");
  vline(ctx, c, r, 31, 0, 32, "#7a5c10");
  hline(ctx, c, r, 0, 31, 32, "#7a5c10");
  // small plant
  rect(ctx, c, r, 18, 22, 8, 8, "#6b4226"); // pot
  rect(ctx, c, r, 19, 14, 6, 8, "#2e7d32"); // leaves
  rect(ctx, c, r, 17, 16, 3, 4, "#388e3c");
  rect(ctx, c, r, 26, 16, 3, 4, "#388e3c");
}

function drawChair(c: number, r: number) {
  fillTile(ctx, c, r, "#c8a878"); // floor background
  // seat
  rect(ctx, c, r, 8, 10, 16, 14, "#333333");
  // back of chair
  rect(ctx, c, r, 10, 4, 12, 8, "#444444");
  // armrests
  rect(ctx, c, r, 6, 12, 4, 8, "#3a3a3a");
  rect(ctx, c, r, 22, 12, 4, 8, "#3a3a3a");
  // wheels (bottom dots)
  pixel(ctx, c, r, 10, 26, "#555555");
  pixel(ctx, c, r, 21, 26, "#555555");
  pixel(ctx, c, r, 15, 28, "#555555");
}

function drawEmptyDesk(c: number, r: number) {
  fillTile(ctx, c, r, "#8B6914");
  hline(ctx, c, r, 0, 0, 32, "#7a5c10");
  hline(ctx, c, r, 0, 31, 32, "#7a5c10");
  vline(ctx, c, r, 0, 0, 32, "#7a5c10");
  vline(ctx, c, r, 31, 0, 32, "#7a5c10");
}

// --- Row 3: Office furniture ---

function drawBookshelfTop(c: number, r: number) {
  fillTile(ctx, c, r, "#5c4a32"); // wood frame
  rect(ctx, c, r, 2, 2, 28, 28, "#6b5a3c");
  // shelf divider
  hline(ctx, c, r, 2, 16, 28, "#4a3828");
  // books top shelf
  rect(ctx, c, r, 4, 3, 4, 12, "#c62828"); // red
  rect(ctx, c, r, 9, 4, 3, 11, "#1565c0"); // blue
  rect(ctx, c, r, 13, 3, 4, 12, "#2e7d32"); // green
  rect(ctx, c, r, 18, 5, 3, 10, "#f9a825"); // yellow
  rect(ctx, c, r, 22, 3, 5, 12, "#6a1b9a"); // purple
}

function drawBookshelfBottom(c: number, r: number) {
  fillTile(ctx, c, r, "#5c4a32");
  rect(ctx, c, r, 2, 2, 28, 28, "#6b5a3c");
  hline(ctx, c, r, 2, 16, 28, "#4a3828");
  // books bottom shelf
  rect(ctx, c, r, 4, 3, 5, 12, "#ef6c00");
  rect(ctx, c, r, 10, 4, 3, 11, "#0277bd");
  rect(ctx, c, r, 14, 3, 4, 12, "#ad1457");
  // trophy on bottom shelf
  rect(ctx, c, r, 22, 18, 6, 10, "#ffd700");
  rect(ctx, c, r, 24, 14, 2, 4, "#ffd700");
  rect(ctx, c, r, 21, 12, 8, 2, "#ffd700");
}

function drawFilingCabinet(c: number, r: number) {
  fillTile(ctx, c, r, "#888888");
  rect(ctx, c, r, 4, 2, 24, 28, "#999999");
  // drawer dividers
  hline(ctx, c, r, 4, 10, 24, "#777777");
  hline(ctx, c, r, 4, 18, 24, "#777777");
  // handles
  rect(ctx, c, r, 14, 5, 6, 2, "#666666");
  rect(ctx, c, r, 14, 13, 6, 2, "#666666");
  rect(ctx, c, r, 14, 21, 6, 2, "#666666");
}

function drawPlantPot(c: number, r: number) {
  fillTile(ctx, c, r, "#c8a878"); // floor bg
  // pot
  rect(ctx, c, r, 10, 20, 12, 10, "#8d6e4a");
  rect(ctx, c, r, 8, 18, 16, 3, "#9e7e5a");
  // bush
  rect(ctx, c, r, 8, 6, 16, 14, "#2e7d32");
  rect(ctx, c, r, 6, 10, 4, 6, "#388e3c");
  rect(ctx, c, r, 22, 10, 4, 6, "#388e3c");
  rect(ctx, c, r, 12, 2, 8, 6, "#43a047");
  // leaf highlights
  pixel(ctx, c, r, 10, 8, "#66bb6a");
  pixel(ctx, c, r, 18, 12, "#66bb6a");
  pixel(ctx, c, r, 14, 6, "#81c784");
}

function drawWaterCooler(c: number, r: number) {
  fillTile(ctx, c, r, "#c8a878"); // floor bg
  // base
  rect(ctx, c, r, 10, 22, 12, 8, "#aaaaaa");
  // body
  rect(ctx, c, r, 12, 10, 8, 14, "#bbbbbb");
  // water bottle
  rect(ctx, c, r, 13, 2, 6, 10, "#4fc3f7");
  rect(ctx, c, r, 14, 0, 4, 3, "#4fc3f7");
  // tap
  rect(ctx, c, r, 11, 16, 3, 2, "#e53935");
  rect(ctx, c, r, 18, 16, 3, 2, "#43a047");
}

function drawCoffeeMachine(c: number, r: number) {
  fillTile(ctx, c, r, "#c8a878"); // floor bg
  // body
  rect(ctx, c, r, 6, 4, 20, 24, "#333333");
  rect(ctx, c, r, 8, 6, 16, 16, "#444444");
  // display area
  rect(ctx, c, r, 10, 8, 12, 8, "#222222");
  // buttons
  rect(ctx, c, r, 10, 18, 4, 3, "#e53935"); // red
  rect(ctx, c, r, 16, 18, 4, 3, "#43a047"); // green
  // drip area
  rect(ctx, c, r, 12, 24, 8, 3, "#555555");
  // steam
  pixel(ctx, c, r, 14, 2, "#cccccc");
  pixel(ctx, c, r, 18, 3, "#cccccc");
}

function drawPrinter(c: number, r: number) {
  fillTile(ctx, c, r, "#c8a878"); // floor bg
  // body
  rect(ctx, c, r, 4, 12, 24, 16, "#aaaaaa");
  // paper tray top
  rect(ctx, c, r, 6, 8, 20, 6, "#bbbbbb");
  // paper
  rect(ctx, c, r, 8, 6, 16, 4, "#f5f5f5");
  // output slot
  rect(ctx, c, r, 8, 24, 16, 2, "#888888");
  // status light
  rect(ctx, c, r, 22, 14, 3, 3, "#43a047");
}

function drawWhiteboard(c: number, r: number) {
  fillTile(ctx, c, r, "#e0d0b8"); // wall bg
  // frame
  rect(ctx, c, r, 2, 2, 28, 28, "#aaaaaa");
  // white surface
  rect(ctx, c, r, 4, 4, 24, 24, "#f5f5f5");
  // post-its
  rect(ctx, c, r, 6, 6, 6, 6, "#ffeb3b");
  rect(ctx, c, r, 14, 6, 6, 6, "#4fc3f7");
  rect(ctx, c, r, 22, 6, 4, 6, "#f48fb1");
  rect(ctx, c, r, 6, 16, 6, 6, "#81c784");
  rect(ctx, c, r, 14, 16, 6, 6, "#ffab91");
  // marker line
  hline(ctx, c, r, 6, 26, 16, "#333333");
}

// --- Row 4: Meeting & Lounge ---

function drawMeetingTableTL(c: number, r: number) {
  fillTile(ctx, c, r, "#c8a878"); // floor bg
  // table surface (oval: rounded top-left)
  rect(ctx, c, r, 4, 8, 28, 24, "#5c4a32");
  rect(ctx, c, r, 8, 4, 24, 4, "#5c4a32");
  // highlight
  hline(ctx, c, r, 8, 8, 20, "#6b5a3c");
}

function drawMeetingTableTR(c: number, r: number) {
  fillTile(ctx, c, r, "#c8a878");
  rect(ctx, c, r, 0, 8, 28, 24, "#5c4a32");
  rect(ctx, c, r, 0, 4, 24, 4, "#5c4a32");
  hline(ctx, c, r, 4, 8, 20, "#6b5a3c");
}

function drawMeetingTableBL(c: number, r: number) {
  fillTile(ctx, c, r, "#c8a878");
  rect(ctx, c, r, 4, 0, 28, 24, "#5c4a32");
  rect(ctx, c, r, 8, 24, 24, 4, "#5c4a32");
  hline(ctx, c, r, 8, 4, 20, "#6b5a3c");
}

function drawMeetingTableBR(c: number, r: number) {
  fillTile(ctx, c, r, "#c8a878");
  rect(ctx, c, r, 0, 0, 28, 24, "#5c4a32");
  rect(ctx, c, r, 0, 24, 24, 4, "#5c4a32");
  hline(ctx, c, r, 4, 4, 20, "#6b5a3c");
}

function drawCouchLeft(c: number, r: number) {
  fillTile(ctx, c, r, "#c8a878"); // floor bg
  // seat
  rect(ctx, c, r, 2, 8, 28, 20, "#1565c0");
  // back
  rect(ctx, c, r, 2, 2, 28, 8, "#0d47a1");
  // armrest left
  rect(ctx, c, r, 0, 4, 6, 22, "#0d47a1");
  // cushion lines
  vline(ctx, c, r, 16, 10, 14, "#1256a8");
}

function drawCouchRight(c: number, r: number) {
  fillTile(ctx, c, r, "#c8a878");
  rect(ctx, c, r, 2, 8, 28, 20, "#1565c0");
  rect(ctx, c, r, 2, 2, 28, 8, "#0d47a1");
  // armrest right
  rect(ctx, c, r, 26, 4, 6, 22, "#0d47a1");
  vline(ctx, c, r, 16, 10, 14, "#1256a8");
}

function drawCoffeeTable(c: number, r: number) {
  fillTile(ctx, c, r, "#c8a878"); // floor bg
  // table
  rect(ctx, c, r, 6, 8, 20, 16, "#4a3828");
  rect(ctx, c, r, 8, 10, 16, 12, "#5c4a32");
  // magazine
  rect(ctx, c, r, 10, 12, 8, 6, "#e8e8e8");
  hline(ctx, c, r, 11, 14, 6, "#42a5f5");
}

function drawTVScreen(c: number, r: number) {
  fillTile(ctx, c, r, "#e0d0b8"); // wall bg
  // frame
  rect(ctx, c, r, 2, 4, 28, 22, "#222222");
  // screen
  rect(ctx, c, r, 4, 6, 24, 18, "#1a1a2e");
  // chart: bar chart
  rect(ctx, c, r, 8, 16, 4, 6, "#42a5f5");
  rect(ctx, c, r, 14, 12, 4, 10, "#66bb6a");
  rect(ctx, c, r, 20, 14, 4, 8, "#ffa726");
  // chart title line
  hline(ctx, c, r, 8, 8, 16, "#ffffff");
  // stand
  rect(ctx, c, r, 14, 26, 4, 4, "#333333");
}

// --- Row 5: Special ---

function drawServerRack(c: number, r: number) {
  fillTile(ctx, c, r, "#3a3a4a"); // server floor bg
  rect(ctx, c, r, 4, 0, 24, 32, "#222233");
  rect(ctx, c, r, 6, 2, 20, 28, "#2a2a3a");
  // rack units
  for (let y = 4; y < 28; y += 4) {
    rect(ctx, c, r, 8, y, 16, 3, "#333344");
    // LED lights
    pixel(ctx, c, r, 20, y + 1, "#43a047"); // green
    pixel(ctx, c, r, 22, y + 1, "#e53935"); // red (blinking)
  }
  // ventilation holes
  for (let y = 4; y < 28; y += 4) {
    for (let x = 9; x < 18; x += 2) {
      pixel(ctx, c, r, x, y + 1, "#1a1a2e");
    }
  }
}

function drawServerRack2(c: number, r: number) {
  fillTile(ctx, c, r, "#3a3a4a");
  rect(ctx, c, r, 4, 0, 24, 32, "#222233");
  rect(ctx, c, r, 6, 2, 20, 28, "#2a2a3a");
  for (let y = 4; y < 28; y += 4) {
    rect(ctx, c, r, 8, y, 16, 3, "#333344");
    pixel(ctx, c, r, 20, y + 1, "#ffa726"); // amber
    pixel(ctx, c, r, 22, y + 1, "#43a047"); // green
  }
  // cables
  vline(ctx, c, r, 26, 4, 24, "#555555");
  vline(ctx, c, r, 27, 4, 24, "#444444");
}

function drawArchiveBox(c: number, r: number) {
  fillTile(ctx, c, r, "#b8a080"); // archive floor bg
  // box
  rect(ctx, c, r, 6, 10, 20, 18, "#c49a6c");
  rect(ctx, c, r, 8, 12, 16, 14, "#d4aa7c");
  // lid
  rect(ctx, c, r, 4, 8, 24, 4, "#b08a5c");
  // label
  rect(ctx, c, r, 12, 16, 8, 5, "#f5f5f5");
  hline(ctx, c, r, 13, 18, 6, "#333333");
}

function drawVendingTop(c: number, r: number) {
  fillTile(ctx, c, r, "#c8a878");
  rect(ctx, c, r, 2, 0, 28, 32, "#444444");
  // display window
  rect(ctx, c, r, 4, 2, 24, 28, "#555555");
  // snacks (colorful rows)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const colors = ["#e53935", "#ffa726", "#43a047", "#42a5f5"];
      rect(ctx, c, r, 6 + col * 5, 4 + row * 7, 4, 5, colors[(row + col) % 4]);
    }
  }
}

function drawVendingBottom(c: number, r: number) {
  fillTile(ctx, c, r, "#c8a878");
  rect(ctx, c, r, 2, 0, 28, 32, "#444444");
  // coin slot
  rect(ctx, c, r, 20, 4, 4, 6, "#333333");
  rect(ctx, c, r, 21, 6, 2, 2, "#666666");
  // dispensing area
  rect(ctx, c, r, 6, 16, 20, 12, "#333333");
  rect(ctx, c, r, 8, 18, 16, 8, "#222222");
  // keypad
  for (let kr = 0; kr < 3; kr++) {
    for (let kc = 0; kc < 3; kc++) {
      rect(ctx, c, r, 6 + kc * 4, 4 + kr * 4, 3, 3, "#666666");
    }
  }
}

function drawFireExtinguisher(c: number, r: number) {
  fillTile(ctx, c, r, "#e0d0b8"); // wall bg
  // cylinder
  rect(ctx, c, r, 12, 6, 8, 22, "#e53935");
  rect(ctx, c, r, 10, 8, 12, 18, "#c62828");
  // top
  rect(ctx, c, r, 14, 2, 4, 6, "#333333");
  // handle
  rect(ctx, c, r, 10, 4, 4, 4, "#333333");
  // label
  rect(ctx, c, r, 13, 14, 6, 6, "#f5f5f5");
  // hose
  rect(ctx, c, r, 20, 6, 2, 8, "#333333");
  pixel(ctx, c, r, 22, 12, "#333333");
}

function drawNoticeBoard(c: number, r: number) {
  fillTile(ctx, c, r, "#e0d0b8"); // wall bg
  // cork board
  rect(ctx, c, r, 2, 4, 28, 24, "#c49a6c");
  rect(ctx, c, r, 4, 6, 24, 20, "#d4aa7c");
  // frame
  hline(ctx, c, r, 2, 4, 28, "#8b6914");
  hline(ctx, c, r, 2, 27, 28, "#8b6914");
  vline(ctx, c, r, 2, 4, 24, "#8b6914");
  vline(ctx, c, r, 29, 4, 24, "#8b6914");
  // pins and notes
  rect(ctx, c, r, 6, 8, 8, 6, "#ffeb3b");
  pixel(ctx, c, r, 10, 8, "#e53935"); // pin
  rect(ctx, c, r, 18, 8, 8, 8, "#f5f5f5");
  pixel(ctx, c, r, 22, 8, "#1565c0"); // pin
  rect(ctx, c, r, 8, 18, 10, 6, "#81c784");
  pixel(ctx, c, r, 13, 18, "#ffa726"); // pin
}

function drawRugCenter(c: number, r: number) {
  fillTile(ctx, c, r, "#c62828"); // red rug
  // gold border
  rect(ctx, c, r, 0, 0, 32, 2, "#ffd700");
  rect(ctx, c, r, 0, 30, 32, 2, "#ffd700");
  rect(ctx, c, r, 0, 0, 2, 32, "#ffd700");
  rect(ctx, c, r, 30, 0, 2, 32, "#ffd700");
  // inner border
  rect(ctx, c, r, 4, 4, 24, 1, "#d4a700");
  rect(ctx, c, r, 4, 27, 24, 1, "#d4a700");
  rect(ctx, c, r, 4, 4, 1, 24, "#d4a700");
  rect(ctx, c, r, 27, 4, 1, 24, "#d4a700");
  // center diamond pattern
  for (let i = 0; i < 6; i++) {
    pixel(ctx, c, r, 16 - i, 10 + i, "#ffd700");
    pixel(ctx, c, r, 16 + i, 10 + i, "#ffd700");
    pixel(ctx, c, r, 16 - i, 22 - i, "#ffd700");
    pixel(ctx, c, r, 16 + i, 22 - i, "#ffd700");
  }
}

/* ------------------------------------------------------------------ */
/*  Draw all tiles                                                    */
/* ------------------------------------------------------------------ */

// Row 0: Floors
drawLightParquet(0, 0);
drawDarkParquet(1, 0);
drawBossFloor(2, 0);
drawServerFloor(3, 0);
drawArchivesFloor(4, 0);
drawLoungeFloor(5, 0);
drawRestroomFloor(6, 0);
drawHallwayFloor(7, 0);

// Row 1: Walls
drawBackWall(0, 1);
drawSideWall(1, 1);
drawWallBaseboard(2, 1);
drawRoomWall(3, 1);
drawDoorGap(4, 1);
drawWindow(5, 1);
drawWallCorner(6, 1);
drawEmpty(7, 1);

// Row 2: Desk furniture
drawDeskTopLeft(0, 2);
drawDeskTopCenter(1, 2);
drawDeskTopRight(2, 2);
drawDeskBottomLeft(3, 2);
drawDeskBottomCenter(4, 2);
drawDeskBottomRight(5, 2);
drawChair(6, 2);
drawEmptyDesk(7, 2);

// Row 3: Office furniture
drawBookshelfTop(0, 3);
drawBookshelfBottom(1, 3);
drawFilingCabinet(2, 3);
drawPlantPot(3, 3);
drawWaterCooler(4, 3);
drawCoffeeMachine(5, 3);
drawPrinter(6, 3);
drawWhiteboard(7, 3);

// Row 4: Meeting & lounge
drawMeetingTableTL(0, 4);
drawMeetingTableTR(1, 4);
drawMeetingTableBL(2, 4);
drawMeetingTableBR(3, 4);
drawCouchLeft(4, 4);
drawCouchRight(5, 4);
drawCoffeeTable(6, 4);
drawTVScreen(7, 4);

// Row 5: Special
drawServerRack(0, 5);
drawServerRack2(1, 5);
drawArchiveBox(2, 5);
drawVendingTop(3, 5);
drawVendingBottom(4, 5);
drawFireExtinguisher(5, 5);
drawNoticeBoard(6, 5);
drawRugCenter(7, 5);

/* ------------------------------------------------------------------ */
/*  Write output                                                      */
/* ------------------------------------------------------------------ */

const outDir = path.resolve(__dirname, "..", "public", "sprites");
fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, "office-tileset.png");
const buffer = canvas.toBuffer("image/png");
fs.writeFileSync(outPath, buffer);

console.log(`Tileset written to ${outPath}`);
console.log(`  ${COLS}x${ROWS} tiles = ${COLS * ROWS} tiles total`);
console.log(`  Image size: ${COLS * TILE}x${ROWS * TILE} (${buffer.length} bytes)`);
