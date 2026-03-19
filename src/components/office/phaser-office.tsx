"use client";

import { useEffect, useRef } from "react";
import type { WorkspaceSnapshot, AgentState } from "@/lib/types";
import {
  generateOfficeConfig,
  agentGridPosition,
  type OfficeConfig,
} from "@/lib/state/office-layout";
import { findPath } from "@/lib/state/pathfinding";
import { buildCollisionMap } from "@/lib/state/collision-map";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface PhaserOfficeProps {
  snapshot: WorkspaceSnapshot | null;
}

/* ------------------------------------------------------------------ */
/*  Colour palette                                                     */
/* ------------------------------------------------------------------ */

const AGENT_COLORS = [
  0x4a90d9, 0xd97a4a, 0x5aaa6a, 0x9a6abd, 0xd9a04a, 0xd94a6a, 0x4ab8d9,
  0x8aaa4a, 0x6a5abd, 0xd98a4a, 0x4a7ad9, 0xaa5a8a, 0x5a9a8a, 0xba7a4a,
  0x6a8abd, 0x4ad97a, 0xd96a8a, 0x8a6ad9, 0x7aba5a, 0xd9ba4a,
];

/* ------------------------------------------------------------------ */
/*  Rich speech-bubble labels                                          */
/* ------------------------------------------------------------------ */

const STATE_BUBBLE: Record<AgentState, { emoji: string; text: string } | null> = {
  idle: null,
  writing: { emoji: "\u{1f4dd}", text: "Drafting report\u2026" },
  researching: { emoji: "\u{1f50d}", text: "Gathering data\u2026" },
  planning: { emoji: "\u{1f4cb}", text: "Framing mission\u2026" },
  meeting: { emoji: "\u{1f4ac}", text: "In meeting" },
  waiting_for_approval: { emoji: "\u23f3", text: "Waiting for review" },
  done: { emoji: "\u2705", text: "Complete" },
};

/* ------------------------------------------------------------------ */
/*  Tile size                                                          */
/* ------------------------------------------------------------------ */

const TILE = 32;
const NUM_CHARS = 6; // char_0 .. char_5

const BUBBLE_DISPLAY_MS = 8000;

/* ------------------------------------------------------------------ */
/*  React wrapper                                                      */
/* ------------------------------------------------------------------ */

export function PhaserOffice({ snapshot }: PhaserOfficeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<WorkspaceSnapshot | null>(null);
  const gameRef = useRef<unknown>(null);

  // Always keep the ref in sync so the Phaser scene can read it.
  snapshotRef.current = snapshot;

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    let destroyed = false;

    // Wait for the container to have real dimensions before booting Phaser.
    const el = containerRef.current;
    const waitForSize = new Promise<void>((resolve) => {
      if (el.clientWidth > 0 && el.clientHeight > 0) { resolve(); return; }
      const ro = new ResizeObserver((entries) => {
        for (const e of entries) {
          if (e.contentRect.width > 0 && e.contentRect.height > 0) {
            ro.disconnect();
            resolve();
            return;
          }
        }
      });
      ro.observe(el);
      setTimeout(() => { ro.disconnect(); resolve(); }, 2000);
    });

    waitForSize.then(() => import("phaser")).then((Phaser) => {
      if (destroyed || !containerRef.current) return;

      /* ============================================================ */
      /*  OfficeScene                                                  */
      /* ============================================================ */

      class OfficeScene extends Phaser.Scene {
        private officeConfig!: OfficeConfig;
        private worldW = 0;
        private worldH = 0;

        /* collision map for A* pathfinding */
        private collisionBlocked: Set<string> = new Set();

        /**
         * Occupied grid: true means a furniture item is rendered there.
         * Used during drawOffice to prevent visual overlaps.
         */
        private occupied: boolean[][] = [];

        /* per-agent runtime */
        private agentContainers: Map<
          string,
          {
            container: Phaser.GameObjects.Container;
            sprite: Phaser.GameObjects.Sprite;
            shadow: Phaser.GameObjects.Ellipse;
            nameLabel: Phaser.GameObjects.Text;
            bubble: Phaser.GameObjects.Text;
            bubbleTimer: ReturnType<typeof setTimeout> | null;
            lastRow: number;
            lastCol: number;
            lastState: AgentState;
            walking: boolean;
            goalRow: number;
            goalCol: number;
          }
        > = new Map();

        constructor() {
          super({ key: "OfficeScene" });
        }

        /* ---------------------------------------------------------- */
        /*  preload                                                    */
        /* ---------------------------------------------------------- */

        preload() {
          for (let i = 0; i < NUM_CHARS; i++) {
            this.load.spritesheet(`char_${i}`, `/assets/characters/char_${i}.png`, {
              frameWidth: 16,
              frameHeight: 32,
            });
          }

          this.load.image('desk', '/assets/tiles/Desk, Ornate.png');
          this.load.image('laptop', '/assets/tiles/Laptop.png');
          this.load.image('coffee-maker', '/assets/tiles/Coffee Maker.png');
          this.load.image('coffee-cup', '/assets/tiles/Coffee Cup.png');
          this.load.image('copy-machine', '/assets/tiles/Copy Machine.png');
          this.load.image('water-cooler', '/assets/tiles/Water Cooler.png');
          this.load.image('tv', '/assets/tiles/TV, Widescreen.png');
          this.load.image('bins', '/assets/tiles/Bins.png');
          this.load.image('portraits', '/assets/tiles/Office Portraits.png');

          this.load.audio('task-complete', '/assets/sounds/task-complete.wav');
        }

        /* ---------------------------------------------------------- */
        /*  create                                                     */
        /* ---------------------------------------------------------- */

        create() {
          const teamSize = snapshotRef.current?.agents.length ?? 4;
          this.officeConfig = generateOfficeConfig(Math.max(teamSize, 4));
          this.worldW = this.officeConfig.cols * TILE;
          this.worldH = this.officeConfig.rows * TILE;

          // Init occupied grid
          this.occupied = [];
          for (let r = 0; r < this.officeConfig.rows; r++) {
            this.occupied[r] = new Array(this.officeConfig.cols).fill(false);
          }

          this.drawOffice();
          this.createAnimations();
          this.collisionBlocked = buildCollisionMap(this.officeConfig);
          this.syncAgents();
          this.fitCamera();

          this.scale.on("resize", () => this.fitCamera());
        }

        /* ---------------------------------------------------------- */
        /*  update                                                     */
        /* ---------------------------------------------------------- */

        update() {
          this.syncAgents();
        }

        /* ---------------------------------------------------------- */
        /*  Occupancy helpers                                          */
        /* ---------------------------------------------------------- */

        /** Check if a rectangular region of cells is free. */
        private isFree(row: number, col: number, h: number, w: number): boolean {
          for (let r = row; r < row + h; r++) {
            for (let c = col; c < col + w; c++) {
              if (r < 0 || r >= this.officeConfig.rows) return false;
              if (c < 0 || c >= this.officeConfig.cols) return false;
              if (this.occupied[r][c]) return false;
            }
          }
          return true;
        }

        /** Mark a rectangular region as occupied. */
        private markOccupied(row: number, col: number, h: number, w: number) {
          for (let r = row; r < row + h; r++) {
            for (let c = col; c < col + w; c++) {
              if (r >= 0 && r < this.officeConfig.rows && c >= 0 && c < this.officeConfig.cols) {
                this.occupied[r][c] = true;
              }
            }
          }
        }

        /* ---------------------------------------------------------- */
        /*  Draw static office: floors -> walls -> furniture -> labels */
        /* ---------------------------------------------------------- */

        private drawOffice() {
          const g = this.add.graphics();
          const cfg = this.officeConfig;

          // ========== LAYER 1: FLOORS ==========

          // Main floor — warm checkerboard
          for (let r = 0; r < cfg.rows; r++) {
            for (let c = 0; c < cfg.cols; c++) {
              const shade = (r + c) % 2 === 0 ? 0xc8a878 : 0xc4a474;
              g.fillStyle(shade);
              g.fillRect(c * TILE, r * TILE, TILE, TILE);
            }
          }

          // Back wall area (rows 0-2)
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < cfg.cols; c++) {
              g.fillStyle(0xf2e4d0);
              g.fillRect(c * TILE, r * TILE, TILE, TILE);
              this.occupied[r][c] = true;
            }
          }

          // Room floors (tint over base)
          this.drawRoomFloor(g, cfg.bossOffice, 0xc49a6c, 0xc0966a);
          this.drawRoomFloor(g, cfg.serverRoom, 0x3a3a4a, 0x38384a);
          this.drawRoomFloor(g, cfg.archives, 0xb8a080, 0xb49c7c);
          this.drawRoomFloor(g, cfg.lounge, 0xc8a878, 0xc4a474);
          this.drawRoomFloor(g, cfg.restrooms, 0xaaaaaa, 0xa6a6a6);

          // Meeting room floor tint
          for (const room of cfg.meetingRooms) {
            for (let r = room.row; r < room.row + room.h; r++) {
              for (let c = room.col; c < room.col + room.w; c++) {
                g.fillStyle(0xa08264, 0.15);
                g.fillRect(c * TILE, r * TILE, TILE, TILE);
              }
            }
          }

          // Break room floor tint
          if (cfg.breakRoom) {
            const br = cfg.breakRoom;
            for (let r = br.row; r < br.row + br.h; r++) {
              for (let c = br.col; c < br.col + br.w; c++) {
                g.fillStyle(0x78b48c, 0.12);
                g.fillRect(c * TILE, r * TILE, TILE, TILE);
              }
            }
          }

          // Hallway floor
          if (cfg.hallway) {
            const hw = cfg.hallway;
            for (let r = hw.row; r < hw.row + hw.h; r++) {
              const shade = (r + hw.col) % 2 === 0 ? 0xc8a878 : 0xc4a474;
              g.fillStyle(shade);
              g.fillRect(hw.col * TILE, r * TILE, hw.w * TILE, TILE);
            }
          }

          // Subtle grid lines
          g.lineStyle(0.5, 0x000000, 0.06);
          for (let x = 0; x <= this.worldW; x += TILE) {
            g.lineBetween(x, 0, x, this.worldH);
          }
          for (let y = 0; y <= this.worldH; y += TILE) {
            g.lineBetween(0, y, this.worldW, y);
          }

          // ========== LAYER 2: WALLS ==========

          // Back wall baseboard
          g.fillStyle(0xa07840, 0.55);
          g.fillRect(0, 2 * TILE + TILE - 2, this.worldW, 2);

          // Windows on back wall (at row 0, spanning 2 cells wide)
          const winCols = [1, 4, 7, 10, 17, 20, 23];
          for (const c of winCols) {
            if (c + 2 > cfg.cols) continue;
            g.fillStyle(0xa8d8ea, 0.6);
            g.fillRect(c * TILE, 0, 2 * TILE, TILE);
            g.lineStyle(1, 0x8ab8ca, 0.8);
            g.strokeRect(c * TILE, 0, 2 * TILE, TILE);
            // Mullion
            g.lineBetween(c * TILE + TILE, 0, c * TILE + TILE, TILE);
          }

          // Room walls (right-side rooms)
          this.drawRoomWalls(g, cfg.bossOffice, "left");
          this.drawRoomWalls(g, cfg.serverRoom, "left");
          this.drawRoomWalls(g, cfg.archives, "left");
          this.drawRoomWalls(g, cfg.lounge, "left");
          this.drawRoomWalls(g, cfg.restrooms, "left");

          // Meeting room walls
          for (const room of cfg.meetingRooms) {
            g.lineStyle(0.8, 0xa07840, 0.2);
            g.strokeRect(room.col * TILE, room.row * TILE, room.w * TILE, room.h * TILE);
          }

          // Break room walls
          if (cfg.breakRoom) {
            const br = cfg.breakRoom;
            g.lineStyle(0.8, 0x50a064, 0.15);
            g.strokeRect(br.col * TILE, br.row * TILE, br.w * TILE, br.h * TILE);
          }

          // ========== LAYER 3: FURNITURE ==========

          this.drawDesks(g, cfg);
          this.drawMeetingFurniture(g, cfg);
          this.drawBreakRoomFurniture(g, cfg);
          this.drawBossOfficeFurniture(g, cfg);
          this.drawServerRoomFurniture(g, cfg);
          this.drawArchivesFurniture(g, cfg);
          this.drawLoungeFurniture(g, cfg);
          this.drawRestroomsFurniture(g, cfg);
          this.drawPlants(g, cfg);

          // ========== LAYER 4: LABELS ==========

          for (let i = 0; i < cfg.meetingRooms.length; i++) {
            const room = cfg.meetingRooms[i];
            this.drawRoomLabel(room.col * TILE, room.row * TILE - 6, `Meeting ${i + 1}`);
          }
          if (cfg.breakRoom) {
            this.drawRoomLabel(cfg.breakRoom.col * TILE, cfg.breakRoom.row * TILE - 6, "Kitchen & Lounge");
          }
          if (cfg.bossOffice) {
            this.drawRoomLabel(cfg.bossOffice.col * TILE, cfg.bossOffice.row * TILE - 6, "Boss Office");
          }
          if (cfg.serverRoom) {
            this.drawRoomLabel(cfg.serverRoom.col * TILE, cfg.serverRoom.row * TILE - 6, "Server Room");
          }
          if (cfg.archives) {
            this.drawRoomLabel(cfg.archives.col * TILE, cfg.archives.row * TILE - 6, "Archives");
          }
          if (cfg.lounge) {
            this.drawRoomLabel(cfg.lounge.col * TILE, cfg.lounge.row * TILE - 6, "Lounge");
          }
          if (cfg.restrooms) {
            this.drawRoomLabel(cfg.restrooms.col * TILE, cfg.restrooms.row * TILE - 6, "Restrooms");
          }
        }

        /* ---------------------------------------------------------- */
        /*  Room floor helper                                          */
        /* ---------------------------------------------------------- */

        private drawRoomFloor(
          g: Phaser.GameObjects.Graphics,
          room: { row: number; col: number; w: number; h: number } | null,
          shade1: number,
          shade2: number,
        ) {
          if (!room) return;
          for (let r = room.row; r < room.row + room.h; r++) {
            for (let c = room.col; c < room.col + room.w; c++) {
              const shade = (r + c) % 2 === 0 ? shade1 : shade2;
              g.fillStyle(shade);
              g.fillRect(c * TILE, r * TILE, TILE, TILE);
            }
          }
        }

        /* ---------------------------------------------------------- */
        /*  Room wall helper                                           */
        /* ---------------------------------------------------------- */

        private drawRoomWalls(
          g: Phaser.GameObjects.Graphics,
          room: { row: number; col: number; w: number; h: number } | null,
          doorSide: "bottom" | "left" = "bottom",
        ) {
          if (!room) return;
          const rx = room.col * TILE;
          const ry = room.row * TILE;
          const rw = room.w * TILE;
          const rh = room.h * TILE;
          g.lineStyle(1.5, 0x6a5a4a, 0.8);

          // Top wall
          g.lineBetween(rx, ry, rx + rw, ry);
          // Right wall
          g.lineBetween(rx + rw, ry, rx + rw, ry + rh);

          // Bottom wall with optional door
          if (doorSide === "bottom") {
            const doorX = rx + Math.floor(rw / 2);
            g.lineBetween(rx, ry + rh, doorX - TILE, ry + rh);
            g.lineBetween(doorX + TILE, ry + rh, rx + rw, ry + rh);
          } else {
            g.lineBetween(rx, ry + rh, rx + rw, ry + rh);
          }

          // Left wall with optional door
          if (doorSide === "left") {
            const doorY = ry + Math.floor(rh / 2);
            g.lineBetween(rx, ry, rx, doorY - TILE);
            g.lineBetween(rx, doorY + TILE, rx, ry + rh);
          } else {
            g.lineBetween(rx, ry, rx, ry + rh);
          }
        }

        /* ---------------------------------------------------------- */
        /*  Room label helper                                          */
        /* ---------------------------------------------------------- */

        private drawRoomLabel(x: number, y: number, text: string) {
          this.add
            .text(x, y, text, {
              fontSize: "5px",
              color: "#8a7a6a",
              fontFamily: "sans-serif",
            })
            .setOrigin(0, 1);
        }

        /* ---------------------------------------------------------- */
        /*  Desks (3 wide x 2 tall each, strict grid)                  */
        /* ---------------------------------------------------------- */

        private drawDesks(g: Phaser.GameObjects.Graphics, cfg: OfficeConfig) {
          for (const desk of cfg.desks) {
            const r = desk.row;
            const c = desk.col;

            // Each desk is 3 cols x 2 rows
            if (!this.isFree(r, c, 2, 3)) continue;
            this.markOccupied(r, c, 2, 3);

            const dx = c * TILE;
            const dy = r * TILE;

            // Desk surface
            try {
              const deskImg = this.add.image(dx, dy, 'desk');
              deskImg.setOrigin(0, 0);
              deskImg.setDisplaySize(3 * TILE, 2 * TILE);
            } catch {
              g.fillStyle(0x8b6b4a);
              g.fillRect(dx, dy, 3 * TILE, 2 * TILE);
            }

            // Laptop on desk (top-left cell)
            try {
              this.add.image(dx, dy, 'laptop')
                .setOrigin(0, 0)
                .setDisplaySize(TILE, TILE);
            } catch { /* tile not loaded */ }

            // Monitor glow (top-right area)
            g.fillStyle(0x44aadd, 0.25);
            g.fillRect(dx + 2 * TILE, dy, TILE, TILE);
          }
        }

        /* ---------------------------------------------------------- */
        /*  Meeting room furniture                                     */
        /* ---------------------------------------------------------- */

        private drawMeetingFurniture(g: Phaser.GameObjects.Graphics, cfg: OfficeConfig) {
          for (const room of cfg.meetingRooms) {
            // Meeting table: 4 wide x 2 tall, centered in room
            const tableCol = room.col + Math.floor((room.w - 4) / 2);
            const tableRow = room.row + Math.floor((room.h - 2) / 2);

            this.markOccupied(tableRow, tableCol, 2, 4);

            g.fillStyle(0x7a5a3a);
            g.fillRect(tableCol * TILE, tableRow * TILE, 4 * TILE, 2 * TILE);
            g.fillStyle(0x9a7a5a, 0.3);
            g.fillRect(tableCol * TILE + 2, tableRow * TILE + 2, 4 * TILE - 4, 2);

            // TV at top of room (1 cell)
            const tvCol = room.col + Math.floor(room.w / 2);
            if (this.isFree(room.row, tvCol, 1, 1)) {
              this.markOccupied(room.row, tvCol, 1, 1);
              try {
                this.add.image(tvCol * TILE, room.row * TILE, 'tv')
                  .setOrigin(0, 0)
                  .setDisplaySize(TILE, TILE);
              } catch { /* tile not loaded */ }
            }
          }
        }

        /* ---------------------------------------------------------- */
        /*  Break room furniture                                       */
        /* ---------------------------------------------------------- */

        private drawBreakRoomFurniture(g: Phaser.GameObjects.Graphics, cfg: OfficeConfig) {
          if (!cfg.breakRoom) return;
          const br = cfg.breakRoom;

          // Coffee maker (1 cell)
          const cmR = br.row;
          const cmC = br.col + 1;
          if (this.isFree(cmR, cmC, 1, 1)) {
            this.markOccupied(cmR, cmC, 1, 1);
            try {
              this.add.image(cmC * TILE, cmR * TILE, 'coffee-maker')
                .setOrigin(0, 0)
                .setDisplaySize(TILE, TILE);
            } catch {
              g.fillStyle(0x6a4a3a);
              g.fillRect(cmC * TILE, cmR * TILE, TILE, TILE);
            }
          }

          // Water cooler (1 cell)
          const wcR = br.row;
          const wcC = br.col + 3;
          if (this.isFree(wcR, wcC, 1, 1)) {
            this.markOccupied(wcR, wcC, 1, 1);
            try {
              this.add.image(wcC * TILE, wcR * TILE, 'water-cooler')
                .setOrigin(0, 0)
                .setDisplaySize(TILE, TILE);
            } catch { /* tile not loaded */ }
          }

          // Couch (3 wide x 1 tall)
          const couchR = br.row + 1;
          const couchC = br.col + 5;
          if (this.isFree(couchR, couchC, 1, 3)) {
            this.markOccupied(couchR, couchC, 1, 3);
            g.fillStyle(0x6a7a9a);
            g.fillRect(couchC * TILE, couchR * TILE, 3 * TILE, TILE);
            // Armrests
            g.fillStyle(0x5a6a8a, 0.5);
            g.fillRect(couchC * TILE, couchR * TILE, TILE / 2, TILE);
            g.fillRect((couchC + 3) * TILE - TILE / 2, couchR * TILE, TILE / 2, TILE);
          }

          // Copy machine (1 cell, next to break room)
          const cpR = br.row;
          const cpC = br.col + br.w + 1;
          if (cpC < cfg.cols && this.isFree(cpR, cpC, 1, 1)) {
            this.markOccupied(cpR, cpC, 1, 1);
            try {
              this.add.image(cpC * TILE, cpR * TILE, 'copy-machine')
                .setOrigin(0, 0)
                .setDisplaySize(TILE, TILE);
            } catch { /* tile not loaded */ }
          }
        }

        /* ---------------------------------------------------------- */
        /*  Boss Office furniture                                      */
        /* ---------------------------------------------------------- */

        private drawBossOfficeFurniture(g: Phaser.GameObjects.Graphics, cfg: OfficeConfig) {
          if (!cfg.bossOffice) return;
          const room = cfg.bossOffice;
          const rx = room.col * TILE;
          const ry = room.row * TILE;
          const rw = room.w * TILE;

          // Executive desk: 4 wide x 1 tall, at row+0 offset by 3 cols
          const deskR = room.row;
          const deskC = room.col + 3;
          if (this.isFree(deskR, deskC, 1, 4)) {
            this.markOccupied(deskR, deskC, 1, 4);
            g.fillStyle(0x5a3a1a);
            g.fillRect(deskC * TILE, deskR * TILE, 4 * TILE, TILE);
            // Monitor
            g.fillStyle(0x222222);
            g.fillRect((deskC + 1) * TILE, deskR * TILE, 2 * TILE, TILE);
            g.fillStyle(0x44aadd, 0.5);
            g.fillRect((deskC + 1) * TILE + 2, deskR * TILE + 2, 2 * TILE - 4, TILE - 4);
          }

          // Nameplate
          g.fillStyle(0xd4af37);
          g.fillRect((deskC + 1) * TILE, (deskR + 1) * TILE - 8, TILE, 6);
          this.add.text(
            (deskC + 1) * TILE + TILE / 2, (deskR + 1) * TILE - 7,
            "BOSS", {
              fontSize: "4px",
              color: "#3a2a1a",
              fontFamily: "sans-serif",
            },
          ).setOrigin(0.5, 0);

          // Chair (1 cell below desk)
          const chairR = room.row + 1;
          const chairC = room.col + 4;
          if (this.isFree(chairR, chairC, 1, 1)) {
            this.markOccupied(chairR, chairC, 1, 1);
            g.fillStyle(0x3a2a1a);
            g.fillCircle(chairC * TILE + TILE / 2, chairR * TILE + TILE / 2, TILE / 3);
          }

          // Rug (decorative, no occupancy)
          g.fillStyle(0x8b2222, 0.25);
          g.fillRect((room.col + 2) * TILE, (room.row + 1) * TILE, 6 * TILE, 2 * TILE);

          // Bookshelf: 2 tall x 1 wide on right side
          const bsR = room.row;
          const bsC = room.col + room.w - 2;
          if (this.isFree(bsR, bsC, 3, 1)) {
            this.markOccupied(bsR, bsC, 3, 1);
            g.fillStyle(0x6a4a2a);
            g.fillRect(bsC * TILE, bsR * TILE, TILE, 3 * TILE);
            // Shelf lines
            g.lineStyle(0.5, 0x5a3a1a, 0.6);
            for (let s = 0; s < 4; s++) {
              const sy = bsR * TILE + s * (3 * TILE / 4);
              g.lineBetween(bsC * TILE + 2, sy, (bsC + 1) * TILE - 2, sy);
            }
            // Book spines
            const bookColors = [0x2244aa, 0xaa2222, 0x22aa44, 0xaaaa22];
            for (let s = 0; s < 3; s++) {
              for (let b = 0; b < 3; b++) {
                g.fillStyle(bookColors[(s + b) % bookColors.length], 0.7);
                g.fillRect(
                  bsC * TILE + 3 + b * 8,
                  bsR * TILE + 3 + s * TILE,
                  6, TILE - 6,
                );
              }
            }
          }

          // Window on back wall (2 wide, row 0 of room)
          g.fillStyle(0xa8d8ea, 0.6);
          g.fillRect(room.col * TILE + TILE, room.row * TILE, 2 * TILE, TILE);
          g.lineStyle(0.8, 0x8ab8ca, 0.8);
          g.strokeRect(room.col * TILE + TILE, room.row * TILE, 2 * TILE, TILE);
        }

        /* ---------------------------------------------------------- */
        /*  Server Room furniture                                      */
        /* ---------------------------------------------------------- */

        private drawServerRoomFurniture(g: Phaser.GameObjects.Graphics, cfg: OfficeConfig) {
          if (!cfg.serverRoom) return;
          const room = cfg.serverRoom;

          // Blue tint overlay
          const blueOverlay = this.add.graphics();
          blueOverlay.fillStyle(0x2244aa, 0.08);
          blueOverlay.fillRect(room.col * TILE, room.row * TILE, room.w * TILE, room.h * TILE);

          // Server racks: 3 racks, each 1 wide x 3 tall
          for (let i = 0; i < 3; i++) {
            const rackR = room.row;
            const rackC = room.col + 1 + i;
            if (!this.isFree(rackR, rackC, 3, 1)) continue;
            this.markOccupied(rackR, rackC, 3, 1);

            const rackX = rackC * TILE;
            const rackY = rackR * TILE;

            // Rack body
            g.fillStyle(i % 2 === 0 ? 0x2a2a2a : 0x333333);
            g.fillRect(rackX, rackY, TILE, 3 * TILE);
            g.lineStyle(0.5, 0x555555, 0.6);
            g.strokeRect(rackX, rackY, TILE, 3 * TILE);

            // Indicator lights
            const lightColors = [0x00ff44, 0x44aaff, 0xff8800, 0x00ff44, 0x44aaff];
            for (let l = 0; l < 5; l++) {
              g.fillStyle(lightColors[l], 0.9);
              g.fillCircle(rackX + 6, rackY + 8 + l * 18, 1.5);
              g.fillStyle(lightColors[(l + 2) % 5], 0.7);
              g.fillCircle(rackX + TILE - 6, rackY + 8 + l * 18, 1.5);
            }
          }
        }

        /* ---------------------------------------------------------- */
        /*  Archives furniture                                         */
        /* ---------------------------------------------------------- */

        private drawArchivesFurniture(g: Phaser.GameObjects.Graphics, cfg: OfficeConfig) {
          if (!cfg.archives) return;
          const room = cfg.archives;

          // Warm overlay
          const warmOverlay = this.add.graphics();
          warmOverlay.fillStyle(0xaa8844, 0.05);
          warmOverlay.fillRect(room.col * TILE, room.row * TILE, room.w * TILE, room.h * TILE);

          // Filing cabinets: 2 rows x 4 cols, each 1x1 cell
          for (let row = 0; row < 2; row++) {
            for (let cab = 0; cab < 4; cab++) {
              const cabR = room.row + row;
              const cabC = room.col + 1 + cab;
              if (!this.isFree(cabR, cabC, 1, 1)) continue;
              this.markOccupied(cabR, cabC, 1, 1);

              const cx = cabC * TILE;
              const cy = cabR * TILE;

              g.fillStyle(row === 0 ? 0x888888 : 0x7a7a7a);
              g.fillRect(cx, cy, TILE, TILE);
              g.lineStyle(0.5, 0x666666, 0.5);
              g.strokeRect(cx, cy, TILE, TILE);

              // Drawer lines
              g.lineStyle(0.4, 0x666666, 0.6);
              for (let d = 1; d <= 3; d++) {
                g.lineBetween(cx + 1, cy + d * (TILE / 4), cx + TILE - 1, cy + d * (TILE / 4));
              }
              // Handle
              g.fillStyle(0xaaaaaa, 0.7);
              g.fillRect(cx + TILE / 2 - 2, cy + TILE / 2 - 1, 4, 2);
            }
          }

          // Boxes on floor (bottom-right, 1 cell)
          const boxR = room.row + room.h - 1;
          const boxC = room.col + room.w - 2;
          if (this.isFree(boxR, boxC, 1, 1)) {
            this.markOccupied(boxR, boxC, 1, 1);
            const boxColors = [0x8b6b4a, 0x9a7a5a, 0x7a5a3a];
            for (let b = 0; b < 3; b++) {
              g.fillStyle(boxColors[b]);
              g.fillRect(boxC * TILE + b * 9, boxR * TILE + 6, 8, 8);
            }
          }
        }

        /* ---------------------------------------------------------- */
        /*  Lounge furniture                                           */
        /* ---------------------------------------------------------- */

        private drawLoungeFurniture(g: Phaser.GameObjects.Graphics, cfg: OfficeConfig) {
          if (!cfg.lounge) return;
          const room = cfg.lounge;

          // Couch 1 (left side, 1 wide x 2 tall)
          const c1R = room.row + 1;
          const c1C = room.col + 1;
          if (this.isFree(c1R, c1C, 2, 1)) {
            this.markOccupied(c1R, c1C, 2, 1);
            g.fillStyle(0x5a6a9a);
            g.fillRect(c1C * TILE, c1R * TILE, TILE, 2 * TILE);
          }

          // Coffee table (1 wide x 2 tall, center)
          const ctR = room.row + 1;
          const ctC = room.col + 3;
          if (this.isFree(ctR, ctC, 2, 1)) {
            this.markOccupied(ctR, ctC, 2, 1);
            g.fillStyle(0x7a5a3a);
            g.fillRect(ctC * TILE, ctR * TILE, TILE, 2 * TILE);
          }

          // Couch 2 (right side, 1 wide x 2 tall)
          const c2R = room.row + 1;
          const c2C = room.col + 5;
          if (this.isFree(c2R, c2C, 2, 1)) {
            this.markOccupied(c2R, c2C, 2, 1);
            g.fillStyle(0x5a6a9a);
            g.fillRect(c2C * TILE, c2R * TILE, TILE, 2 * TILE);
          }

          // Vending machine (1 wide x 2 tall)
          const vmR = room.row + 1;
          const vmC = room.col + 7;
          if (vmC < room.col + room.w && this.isFree(vmR, vmC, 2, 1)) {
            this.markOccupied(vmR, vmC, 2, 1);
            g.fillStyle(0x2244aa);
            g.fillRect(vmC * TILE, vmR * TILE, TILE, 2 * TILE);
            // Display
            g.fillStyle(0xaaddff, 0.3);
            g.fillRect(vmC * TILE + 2, vmR * TILE + 2, TILE - 4, TILE - 4);
          }

          // TV at top (1 cell)
          const tvR = room.row;
          const tvC = room.col + 3;
          if (this.isFree(tvR, tvC, 1, 1)) {
            this.markOccupied(tvR, tvC, 1, 1);
            try {
              this.add.image(tvC * TILE, tvR * TILE, 'tv')
                .setOrigin(0, 0)
                .setDisplaySize(TILE, TILE);
            } catch {
              g.fillStyle(0x222244);
              g.fillRect(tvC * TILE, tvR * TILE, TILE, TILE);
            }
          }
        }

        /* ---------------------------------------------------------- */
        /*  Restrooms furniture                                        */
        /* ---------------------------------------------------------- */

        private drawRestroomsFurniture(g: Phaser.GameObjects.Graphics, cfg: OfficeConfig) {
          if (!cfg.restrooms) return;
          const room = cfg.restrooms;

          // Two doors (each 1 cell wide, 2 cells tall)
          const doorR = room.row + 1;
          const door1C = room.col;
          const door2C = room.col + 1;

          // Door M
          if (this.isFree(doorR, door1C, 2, 1)) {
            this.markOccupied(doorR, door1C, 2, 1);
            g.fillStyle(0x8b6b4a);
            g.fillRect(door1C * TILE, doorR * TILE, TILE, 2 * TILE);
            g.lineStyle(0.5, 0x6a4a2a, 0.8);
            g.strokeRect(door1C * TILE, doorR * TILE, TILE, 2 * TILE);
            // Handle
            g.fillStyle(0xd4af37);
            g.fillCircle(door1C * TILE + TILE - 4, doorR * TILE + TILE, 2);
            this.add.text(
              door1C * TILE + TILE / 2, doorR * TILE + TILE / 2,
              "M", {
                fontSize: "8px",
                color: "#ffffff",
                fontFamily: "sans-serif",
                fontStyle: "bold",
              },
            ).setOrigin(0.5, 0.5);
          }

          // Door F
          if (this.isFree(doorR, door2C, 2, 1)) {
            this.markOccupied(doorR, door2C, 2, 1);
            g.fillStyle(0x8b6b4a);
            g.fillRect(door2C * TILE, doorR * TILE, TILE, 2 * TILE);
            g.lineStyle(0.5, 0x6a4a2a, 0.8);
            g.strokeRect(door2C * TILE, doorR * TILE, TILE, 2 * TILE);
            g.fillStyle(0xd4af37);
            g.fillCircle(door2C * TILE + TILE - 4, doorR * TILE + TILE, 2);
            this.add.text(
              door2C * TILE + TILE / 2, doorR * TILE + TILE / 2,
              "F", {
                fontSize: "8px",
                color: "#ffffff",
                fontFamily: "sans-serif",
                fontStyle: "bold",
              },
            ).setOrigin(0.5, 0.5);
          }
        }

        /* ---------------------------------------------------------- */
        /*  Plants (1x1 cells in dedicated spots)                      */
        /* ---------------------------------------------------------- */

        private drawPlants(g: Phaser.GameObjects.Graphics, cfg: OfficeConfig) {
          const plantSpots = [
            [0, 3],
            [cfg.cols - 1, 3],
            [0, 7],
            [cfg.cols - 1, 7],
            [13, cfg.rows - 2],
          ];

          for (const [c, r] of plantSpots) {
            if (r >= cfg.rows || c >= cfg.cols) continue;
            if (!this.isFree(r, c, 1, 1)) continue;
            this.markOccupied(r, c, 1, 1);

            const px = c * TILE + TILE / 2;
            const py = r * TILE + TILE / 2;
            // Pot
            g.fillStyle(0x8a5a3a);
            g.fillRect(px - 3, py + 2, 8, 5);
            // Foliage
            g.fillStyle(0x4a8a3a, 0.85);
            g.fillCircle(px + 1, py - 2, 5);
            g.fillStyle(0x5aaa4a, 0.7);
            g.fillCircle(px - 2, py, 4);
            g.fillCircle(px + 4, py, 4);
          }
        }

        /* ---------------------------------------------------------- */
        /*  Sprite animations                                          */
        /* ---------------------------------------------------------- */

        private createAnimations() {
          for (let i = 0; i < NUM_CHARS; i++) {
            const key = `char_${i}`;

            this.anims.create({
              key: `${key}_walk_down`,
              frames: this.anims.generateFrameNumbers(key, { start: 0, end: 2 }),
              frameRate: 8,
              repeat: -1,
            });

            this.anims.create({
              key: `${key}_walk_up`,
              frames: this.anims.generateFrameNumbers(key, { start: 7, end: 9 }),
              frameRate: 8,
              repeat: -1,
            });

            this.anims.create({
              key: `${key}_walk_right`,
              frames: this.anims.generateFrameNumbers(key, { start: 14, end: 16 }),
              frameRate: 8,
              repeat: -1,
            });

            this.anims.create({
              key: `${key}_idle_down`,
              frames: [{ key, frame: 0 }],
              frameRate: 1,
            });

            this.anims.create({
              key: `${key}_idle_up`,
              frames: [{ key, frame: 7 }],
              frameRate: 1,
            });

            this.anims.create({
              key: `${key}_idle_right`,
              frames: [{ key, frame: 14 }],
              frameRate: 1,
            });
          }
        }

        /* ---------------------------------------------------------- */
        /*  Sync agents from React snapshot                            */
        /* ---------------------------------------------------------- */

        private syncAgents() {
          const snap = snapshotRef.current;
          if (!snap) return;

          const agents = snap.agents;

          if (agents.length > 0) {
            const newCfg = generateOfficeConfig(Math.max(agents.length, 4));
            if (
              newCfg.cols !== this.officeConfig.cols ||
              newCfg.rows !== this.officeConfig.rows
            ) {
              this.officeConfig = newCfg;
              this.collisionBlocked = buildCollisionMap(newCfg);
            }
          }

          const seen = new Set<string>();

          for (let i = 0; i < agents.length; i++) {
            const agent = agents[i];
            seen.add(agent.agentId);

            const pos = agentGridPosition(i, agent.state, this.officeConfig);
            // Strict grid: agent stands at exact col*TILE, row*TILE
            const targetX = pos.col * TILE + TILE / 2;
            const targetY = pos.row * TILE;

            const charKey = `char_${i % NUM_CHARS}`;
            const existing = this.agentContainers.get(agent.agentId);

            if (!existing) {
              const shadow = this.add.ellipse(0, -1, 12, 4, 0x000000, 0.2);
              shadow.setOrigin(0.5, 0.5);

              const sprite = this.add.sprite(0, 0, charKey, 0);
              sprite.setOrigin(0.5, 1);

              const nameLabel = this.add.text(0, 2, agent.displayName, {
                fontSize: "5px",
                color: "#3a3a3a",
                fontFamily: "sans-serif",
                backgroundColor: "rgba(255,255,255,0.7)",
                padding: { x: 2, y: 1 },
                align: "center",
              });
              nameLabel.setOrigin(0.5, 0);

              const bubbleInfo = STATE_BUBBLE[agent.state];
              const bubbleText = bubbleInfo
                ? `${bubbleInfo.emoji} ${bubbleInfo.text}`
                : "";
              const bubble = this.add.text(0, -28, bubbleText, {
                fontSize: "7px",
                color: "#ffffff",
                backgroundColor: bubbleText ? "#333333dd" : "transparent",
                padding: { x: 4, y: 2 },
                align: "center",
                wordWrap: { width: 80 },
              });
              bubble.setOrigin(0.5, 1);

              const container = this.add.container(targetX, targetY, [
                shadow,
                sprite,
                nameLabel,
                bubble,
              ]);
              container.setDepth(pos.row);

              let bubbleTimer: ReturnType<typeof setTimeout> | null = null;
              if (bubbleText) {
                bubbleTimer = setTimeout(() => {
                  bubble.setVisible(false);
                }, BUBBLE_DISPLAY_MS);
              }

              this.agentContainers.set(agent.agentId, {
                container,
                sprite,
                shadow,
                nameLabel,
                bubble,
                bubbleTimer,
                lastRow: pos.row,
                lastCol: pos.col,
                lastState: agent.state,
                walking: false,
                goalRow: pos.row,
                goalCol: pos.col,
              });
            } else {
              const { container, sprite, bubble } = existing;

              if (existing.lastState !== agent.state) {
                if (
                  agent.state === "done" ||
                  agent.state === "waiting_for_approval"
                ) {
                  try {
                    this.sound.play("task-complete", { volume: 0.3 });
                  } catch { /* sound may not be loaded */ }
                }

                const bubbleInfo = STATE_BUBBLE[agent.state];
                const bubbleText = bubbleInfo
                  ? `${bubbleInfo.emoji} ${bubbleInfo.text}`
                  : "";
                bubble.setText(bubbleText);
                bubble.setBackgroundColor(
                  bubbleText ? "#333333dd" : "transparent",
                );
                bubble.setVisible(!!bubbleText);

                if (existing.bubbleTimer) {
                  clearTimeout(existing.bubbleTimer);
                  existing.bubbleTimer = null;
                }
                if (bubbleText) {
                  existing.bubbleTimer = setTimeout(() => {
                    bubble.setVisible(false);
                  }, BUBBLE_DISPLAY_MS);
                }

                existing.lastState = agent.state;
              }

              if (existing.goalRow !== pos.row || existing.goalCol !== pos.col) {
                existing.goalRow = pos.row;
                existing.goalCol = pos.col;

                if (existing.walking) {
                  this.tweens.killTweensOf(container);
                  existing.walking = false;
                }

                const path = findPath(
                  this.officeConfig.rows,
                  this.officeConfig.cols,
                  this.collisionBlocked,
                  { row: existing.lastRow, col: existing.lastCol },
                  { row: pos.row, col: pos.col },
                );

                if (path.length > 1) {
                  this.walkAlongPath(agent.agentId, charKey, path);
                } else if (path.length === 0) {
                  container.x = targetX;
                  container.y = targetY;
                  container.setDepth(pos.row);
                  existing.lastRow = pos.row;
                  existing.lastCol = pos.col;
                }
              }
            }
          }

          for (const [id, entry] of this.agentContainers) {
            if (!seen.has(id)) {
              if (entry.bubbleTimer) clearTimeout(entry.bubbleTimer);
              entry.container.destroy();
              this.agentContainers.delete(id);
            }
          }
        }

        /* ---------------------------------------------------------- */
        /*  Step-by-step walk along an A* path                         */
        /* ---------------------------------------------------------- */

        private walkAlongPath(
          agentId: string,
          charKey: string,
          path: Array<{ row: number; col: number }>,
        ) {
          const entry = this.agentContainers.get(agentId);
          if (!entry) return;

          entry.walking = true;
          let stepIndex = 1;

          const stepNext = () => {
            const freshEntry = this.agentContainers.get(agentId);
            if (!freshEntry || !freshEntry.walking) return;
            if (stepIndex >= path.length) {
              freshEntry.walking = false;
              const prev = path[stepIndex - 2] ?? path[stepIndex - 1];
              const last = path[stepIndex - 1];
              const dir = this.walkDirection(prev, last);
              freshEntry.sprite.play(`${charKey}_idle_${dir.anim}`);
              if (dir.anim !== "right") freshEntry.sprite.setFlipX(false);
              return;
            }

            const from = path[stepIndex - 1];
            const to = path[stepIndex];
            const dir = this.walkDirection(from, to);

            freshEntry.sprite.setFlipX(dir.flipX);
            freshEntry.sprite.play(`${charKey}_walk_${dir.anim}`);

            const tx = to.col * TILE + TILE / 2;
            const ty = to.row * TILE;

            this.tweens.add({
              targets: freshEntry.container,
              x: tx,
              y: ty,
              duration: 180,
              ease: "Linear",
              onComplete: () => {
                const e = this.agentContainers.get(agentId);
                if (!e) return;
                e.lastRow = to.row;
                e.lastCol = to.col;
                e.container.setDepth(to.row);
                stepIndex++;
                this.time.delayedCall(20, stepNext);
              },
            });
          };

          stepNext();
        }

        private walkDirection(
          from: { row: number; col: number },
          to: { row: number; col: number },
        ): { anim: "down" | "up" | "right"; flipX: boolean } {
          const dr = to.row - from.row;
          const dc = to.col - from.col;
          if (dr > 0) return { anim: "down", flipX: false };
          if (dr < 0) return { anim: "up", flipX: false };
          if (dc > 0) return { anim: "right", flipX: false };
          return { anim: "right", flipX: true };
        }

        /* ---------------------------------------------------------- */
        /*  Camera                                                     */
        /* ---------------------------------------------------------- */

        private fitCamera() {
          const cam = this.cameras.main;
          const cw = this.scale.width;
          const ch = this.scale.height;
          if (!cw || !ch) return;

          const zoomX = cw / this.worldW;
          const zoomY = ch / this.worldH;
          const zoom = Math.max(zoomX, zoomY * 0.95);

          cam.setZoom(zoom);
          cam.setBounds(0, 0, this.worldW, this.worldH);
          cam.centerOn(this.worldW / 2, this.worldH / 2);
        }
      }

      /* ============================================================ */
      /*  Boot Phaser                                                  */
      /* ============================================================ */

      const el = containerRef.current!;
      const w = el.clientWidth || el.parentElement?.clientWidth || 800;
      const h = el.clientHeight || el.parentElement?.clientHeight || 600;

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: el,
        width: Math.max(w, 400),
        height: Math.max(h, 300),
        scene: [OfficeScene],
        pixelArt: true,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        input: { keyboard: { capture: [] } },
        backgroundColor: "#e0c898",
      });

      gameRef.current = game;
    });

    return () => {
      destroyed = true;
      if (gameRef.current) {
        (gameRef.current as { destroy: (b: boolean) => void }).destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
