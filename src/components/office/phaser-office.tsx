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
/*  Tile size used by Phaser (half the HTML office's 32 px)            */
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
    // Flex layouts can report 0 width at mount time.
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
      // Safety timeout — boot anyway after 2s
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
            /** True while a step-by-step walk tween chain is running. */
            walking: boolean;
            /** The final destination (row,col) the agent is heading to. */
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

          // LPC Office tiles
          this.load.image('desk', '/assets/tiles/Desk, Ornate.png');
          this.load.image('laptop', '/assets/tiles/Laptop.png');
          this.load.image('coffee-maker', '/assets/tiles/Coffee Maker.png');
          this.load.image('coffee-cup', '/assets/tiles/Coffee Cup.png');
          this.load.image('copy-machine', '/assets/tiles/Copy Machine.png');
          this.load.image('water-cooler', '/assets/tiles/Water Cooler.png');
          this.load.image('tv', '/assets/tiles/TV, Widescreen.png');
          this.load.image('bins', '/assets/tiles/Bins.png');
          this.load.image('portraits', '/assets/tiles/Office Portraits.png');

          // Sound
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
        /*  Draw static office furniture/floors via Graphics + tiles   */
        /* ---------------------------------------------------------- */

        private drawOffice() {
          const g = this.add.graphics();
          const cfg = this.officeConfig;

          // --- Floor with warm subtle checkerboard ---
          for (let r = 0; r < cfg.rows; r++) {
            for (let c = 0; c < cfg.cols; c++) {
              const shade = (r + c) % 2 === 0 ? 0xc8a878 : 0xc4a474;
              g.fillStyle(shade);
              g.fillRect(c * TILE, r * TILE, TILE, TILE);
            }
          }

          // Subtle grid
          g.lineStyle(0.5, 0x000000, 0.06);
          for (let x = 0; x <= this.worldW; x += TILE) {
            g.lineBetween(x, 0, x, this.worldH);
          }
          for (let y = 0; y <= this.worldH; y += TILE) {
            g.lineBetween(0, y, this.worldW, y);
          }

          // --- Back wall ---
          g.fillStyle(0xf2e4d0);
          g.fillRect(0, 0, this.worldW, TILE * 2.5);
          // Baseboard
          g.fillStyle(0xa07840, 0.55);
          g.fillRect(0, TILE * 2.5, this.worldW, 2);

          // --- Windows on wall ---
          const winCols = [1, 6, 11, 16, 21];
          for (const c of winCols) {
            const wx = c * TILE;
            const wy = TILE * 0.4;
            g.fillStyle(0xa8d8ea, 0.6);
            g.fillRect(wx, wy, TILE * 2.4, TILE * 1.4);
            g.lineStyle(1, 0x8ab8ca, 0.8);
            g.strokeRect(wx, wy, TILE * 2.4, TILE * 1.4);
            // Mullion
            g.lineBetween(wx + TILE * 1.2, wy, wx + TILE * 1.2, wy + TILE * 1.4);
          }

          // --- Sunlight gradient overlay from windows ---
          for (const c of winCols) {
            const wx = c * TILE;
            const wy = TILE * 2.5;
            const sunG = this.add.graphics();
            sunG.fillStyle(0xffe8a0, 0.06);
            sunG.fillRect(wx - TILE * 0.5, wy, TILE * 3.4, TILE * 4);
            sunG.fillStyle(0xffe8a0, 0.03);
            sunG.fillRect(wx - TILE * 1, wy + TILE * 4, TILE * 4.4, TILE * 3);
          }

          // --- Office Portraits on back wall ---
          try {
            const portraitsX = 13 * TILE + TILE * 0.5;
            const portraitsY = TILE * 0.8;
            this.add.image(portraitsX, portraitsY, 'portraits')
              .setOrigin(0.5, 0)
              .setScale(0.5);
          } catch { /* tile not loaded */ }

          // --- Desks (LPC tile images) ---
          for (const desk of cfg.desks) {
            const dx = desk.col * TILE;
            const dy = desk.row * TILE;

            // Place desk tile image centered on the desk area
            try {
              const deskImg = this.add.image(
                dx + TILE * 1.5,
                dy + TILE * 0.9,
                'desk',
              );
              deskImg.setOrigin(0.5, 0.5);
              deskImg.setScale(0.5);
            } catch {
              // Fallback: draw desk with graphics
              g.fillStyle(0x8b6b4a);
              g.fillRect(dx, dy, TILE * 3, TILE * 1.8);
            }

            // Laptop on desk
            try {
              this.add.image(dx + TILE * 0.7, dy + TILE * 0.35, 'laptop')
                .setOrigin(0, 0)
                .setScale(0.35);
            } catch { /* tile not loaded */ }

            // Monitor screen glow (colored rectangle over desk)
            g.fillStyle(0x44aadd, 0.25);
            g.fillRect(dx + TILE * 1.8, dy + TILE * 0.2, TILE * 0.8, TILE * 0.5);
          }

          // --- Meeting rooms ---
          for (const room of cfg.meetingRooms) {
            const rx = room.col * TILE;
            const ry = room.row * TILE;
            const rw = room.w * TILE;
            const rh = room.h * TILE;
            // Floor tint
            g.fillStyle(0xa08264, 0.15);
            g.fillRect(rx, ry, rw, rh);
            // Border
            g.lineStyle(0.8, 0xa07840, 0.2);
            g.strokeRect(rx, ry, rw, rh);
            // Meeting table
            const tw = TILE * 4;
            const th = TILE * 1.6;
            const tx = rx + (rw - tw) / 2;
            const ty = ry + (rh - th) / 2;
            g.fillStyle(0x7a5a3a);
            g.fillRoundedRect(tx, ty, tw, th, 3);
            g.fillStyle(0x9a7a5a, 0.3);
            g.fillRect(tx + 2, ty + 2, tw - 4, 2);

            // TV in meeting room
            try {
              this.add.image(rx + rw / 2, ry + 4, 'tv')
                .setOrigin(0.5, 0)
                .setScale(0.35);
            } catch { /* tile not loaded */ }
          }

          // --- Break room ---
          if (cfg.breakRoom) {
            const br = cfg.breakRoom;
            const bx = br.col * TILE;
            const by = br.row * TILE;
            const bw = br.w * TILE;
            const bh = br.h * TILE;
            // Floor tint
            g.fillStyle(0x78b48c, 0.12);
            g.fillRect(bx, by, bw, bh);
            g.lineStyle(0.8, 0x50a064, 0.15);
            g.strokeRect(bx, by, bw, bh);

            // Coffee maker (LPC tile)
            try {
              this.add.image(bx + TILE * 0.9, by + TILE * 0.6, 'coffee-maker')
                .setOrigin(0.5, 0)
                .setScale(0.5);
            } catch {
              // Fallback graphics
              g.fillStyle(0x6a4a3a);
              g.fillRect(bx + TILE * 0.5, by + TILE * 0.4, TILE * 0.8, TILE * 1);
            }

            // Coffee cup on counter
            try {
              this.add.image(bx + TILE * 2, by + TILE * 0.8, 'coffee-cup')
                .setOrigin(0.5, 0.5)
                .setScale(0.35);
            } catch { /* tile not loaded */ }

            // Water cooler
            try {
              this.add.image(bx + TILE * 3, by + TILE * 0.5, 'water-cooler')
                .setOrigin(0.5, 0)
                .setScale(0.5);
            } catch { /* tile not loaded */ }

            // Couch (keep graphics — no specific LPC tile)
            g.fillStyle(0x6a7a9a);
            g.fillRoundedRect(
              bx + TILE * 3.5,
              by + TILE * 1.5,
              TILE * 3,
              TILE * 1.2,
              4,
            );
            g.fillStyle(0x5a6a8a, 0.5);
            g.fillRect(bx + TILE * 3.5, by + TILE * 1.5, TILE * 0.5, TILE * 1.2);
            g.fillRect(bx + TILE * 6, by + TILE * 1.5, TILE * 0.5, TILE * 1.2);
          }

          // --- Copy machine & bins near break room ---
          try {
            const cmX = (cfg.breakRoom ? cfg.breakRoom.col + cfg.breakRoom.w + 1 : 10) * TILE;
            const cmY = (cfg.breakRoom ? cfg.breakRoom.row : 10) * TILE + TILE * 0.5;
            this.add.image(cmX, cmY, 'copy-machine')
              .setOrigin(0, 0)
              .setScale(0.5);
            this.add.image(cmX + TILE * 2.5, cmY + TILE * 0.3, 'bins')
              .setOrigin(0, 0)
              .setScale(0.35);
          } catch { /* tiles not loaded */ }

          // --- Plants (green circles) ---
          const plantSpots = [
            [0, 4],
            [26, 4],
            [0, 8],
            [26, 8],
            [26, cfg.rows - 3],
            [13, cfg.rows - 2],
          ];
          for (const [c, r] of plantSpots) {
            if (r >= cfg.rows) continue;
            const px = c * TILE + TILE * 0.5;
            const py = r * TILE + TILE * 0.5;
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

          // --- Label for break room ---
          if (cfg.breakRoom) {
            this.add
              .text(cfg.breakRoom.col * TILE, cfg.breakRoom.row * TILE - 6, "Kitchen & Lounge", {
                fontSize: "5px",
                color: "#8a7a6a",
                fontFamily: "sans-serif",
              })
              .setOrigin(0, 1);
          }

          // --- Meeting label ---
          for (let i = 0; i < cfg.meetingRooms.length; i++) {
            const room = cfg.meetingRooms[i];
            this.add
              .text(
                room.col * TILE,
                room.row * TILE - 6,
                `Meeting ${i + 1}`,
                {
                  fontSize: "5px",
                  color: "#8a7a6a",
                  fontFamily: "sans-serif",
                },
              )
              .setOrigin(0, 1);
          }

          // ============================================================
          //  RIGHT-SIDE ROOMS
          // ============================================================

          this.drawHallway(g, cfg);
          this.drawBossOffice(g, cfg);
          this.drawServerRoom(g, cfg);
          this.drawArchives(g, cfg);
          this.drawLounge(g, cfg);
          this.drawRestrooms(g, cfg);
        }

        /* ---------------------------------------------------------- */
        /*  Room-drawing helpers (right-side wing)                     */
        /* ---------------------------------------------------------- */

        /** Helper: draw room walls with a doorway gap at the bottom-centre */
        private drawRoomWalls(
          g: Phaser.GameObjects.Graphics,
          room: { row: number; col: number; w: number; h: number },
          doorSide: "bottom" | "left" = "bottom",
        ) {
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
            const doorX = rx + rw / 2;
            g.lineBetween(rx, ry + rh, doorX - TILE * 0.7, ry + rh);
            g.lineBetween(doorX + TILE * 0.7, ry + rh, rx + rw, ry + rh);
          } else {
            g.lineBetween(rx, ry + rh, rx + rw, ry + rh);
          }
          // Left wall with optional door
          if (doorSide === "left") {
            const doorY = ry + rh / 2;
            g.lineBetween(rx, ry, rx, doorY - TILE * 0.7);
            g.lineBetween(rx, doorY + TILE * 0.7, rx, ry + rh);
          } else {
            g.lineBetween(rx, ry, rx, ry + rh);
          }
        }

        /** Room label */
        private drawRoomLabel(
          x: number,
          y: number,
          text: string,
        ) {
          this.add
            .text(x, y, text, {
              fontSize: "5px",
              color: "#8a7a6a",
              fontFamily: "sans-serif",
            })
            .setOrigin(0, 1);
        }

        /* ---- Hallway (vertical corridor connecting right-side rooms) ---- */

        private drawHallway(
          g: Phaser.GameObjects.Graphics,
          cfg: OfficeConfig,
        ) {
          if (!cfg.hallway) return;
          const hw = cfg.hallway;
          const hx = hw.col * TILE;
          const hy = hw.row * TILE;
          const hh = hw.h * TILE;
          const hww = hw.w * TILE;

          // Floor — same as main office
          for (let r = hw.row; r < hw.row + hw.h; r++) {
            const shade = (r + hw.col) % 2 === 0 ? 0xc8a878 : 0xc4a474;
            g.fillStyle(shade);
            g.fillRect(hx, r * TILE, hww, TILE);
          }

          // Water cooler in hallway
          try {
            this.add.image(hx + TILE * 0.5, hy + TILE * 1, 'water-cooler')
              .setOrigin(0.5, 0)
              .setScale(0.4);
          } catch { /* tile not loaded */ }

          // Notice board (small rectangle on left wall)
          g.fillStyle(0x8b6b4a);
          g.fillRect(hx + 2, hy + TILE * 4, TILE * 0.6, TILE * 0.8);
          g.fillStyle(0xf5f0e0);
          g.fillRect(hx + 4, hy + TILE * 4 + 2, TILE * 0.6 - 4, TILE * 0.8 - 4);
          // Coloured paper pins
          g.fillStyle(0xdd4444);
          g.fillRect(hx + 6, hy + TILE * 4 + 4, 3, 3);
          g.fillStyle(0x44aa44);
          g.fillRect(hx + 11, hy + TILE * 4 + 4, 3, 3);
          g.fillStyle(0x4488dd);
          g.fillRect(hx + 6, hy + TILE * 4 + 10, 3, 3);

          // Fire extinguisher (small red rectangle)
          g.fillStyle(0xcc2222);
          g.fillRect(hx + 4, hy + TILE * 8, 5, TILE * 0.7);
          g.fillStyle(0x333333);
          g.fillRect(hx + 5, hy + TILE * 8 - 2, 3, 3);
        }

        /* ---- Boss Office ---- */

        private drawBossOffice(
          g: Phaser.GameObjects.Graphics,
          cfg: OfficeConfig,
        ) {
          if (!cfg.bossOffice) return;
          const room = cfg.bossOffice;
          const rx = room.col * TILE;
          const ry = room.row * TILE;
          const rw = room.w * TILE;
          const rh = room.h * TILE;

          // Warm wood floor
          for (let r = room.row; r < room.row + room.h; r++) {
            for (let c = room.col; c < room.col + room.w; c++) {
              const shade = (r + c) % 2 === 0 ? 0xc49a6c : 0xc0966a;
              g.fillStyle(shade);
              g.fillRect(c * TILE, r * TILE, TILE, TILE);
            }
          }

          // Rug (central area)
          g.fillStyle(0x8b2222, 0.25);
          g.fillRoundedRect(
            rx + TILE * 2, ry + TILE * 1,
            TILE * 6, TILE * 2, 3,
          );
          g.lineStyle(0.5, 0x8b2222, 0.35);
          g.strokeRoundedRect(
            rx + TILE * 2, ry + TILE * 1,
            TILE * 6, TILE * 2, 3,
          );

          // Large executive desk (back wall)
          g.fillStyle(0x5a3a1a);
          g.fillRoundedRect(rx + TILE * 3, ry + TILE * 0.3, TILE * 4, TILE * 1.4, 2);
          // Desk surface highlight
          g.fillStyle(0x7a5a3a, 0.4);
          g.fillRect(rx + TILE * 3.2, ry + TILE * 0.5, TILE * 3.6, TILE * 0.3);

          // Big monitor
          g.fillStyle(0x222222);
          g.fillRect(rx + TILE * 4.2, ry + TILE * 0.1, TILE * 1.6, TILE * 0.9);
          g.fillStyle(0x44aadd, 0.5);
          g.fillRect(rx + TILE * 4.3, ry + TILE * 0.2, TILE * 1.4, TILE * 0.7);
          // Monitor stand
          g.fillStyle(0x333333);
          g.fillRect(rx + TILE * 4.8, ry + TILE * 1.0, TILE * 0.4, TILE * 0.3);

          // Leather chair (dark brown circle)
          g.fillStyle(0x3a2a1a);
          g.fillCircle(rx + TILE * 5, ry + TILE * 2.0, TILE * 0.4);
          g.fillStyle(0x4a3a2a, 0.6);
          g.fillCircle(rx + TILE * 5, ry + TILE * 2.0, TILE * 0.25);

          // Bookshelf on right wall
          g.fillStyle(0x6a4a2a);
          g.fillRect(rx + rw - TILE * 1.8, ry + TILE * 0.2, TILE * 1.5, TILE * 2.8);
          // Shelf lines
          g.lineStyle(0.5, 0x5a3a1a, 0.6);
          for (let s = 0; s < 4; s++) {
            const sy = ry + TILE * 0.6 + s * TILE * 0.65;
            g.lineBetween(rx + rw - TILE * 1.7, sy, rx + rw - TILE * 0.4, sy);
          }
          // Coloured book spines
          const bookColors = [0x2244aa, 0xaa2222, 0x22aa44, 0xaaaa22, 0x8822aa];
          for (let s = 0; s < 4; s++) {
            const sy = ry + TILE * 0.3 + s * TILE * 0.65;
            for (let b = 0; b < 4; b++) {
              g.fillStyle(bookColors[(s + b) % bookColors.length], 0.7);
              g.fillRect(
                rx + rw - TILE * 1.6 + b * TILE * 0.3,
                sy,
                TILE * 0.2,
                TILE * 0.55,
              );
            }
          }

          // Window on back wall
          g.fillStyle(0xa8d8ea, 0.6);
          g.fillRect(rx + TILE * 0.5, ry + TILE * 0.3, TILE * 2, TILE * 1.2);
          g.lineStyle(0.8, 0x8ab8ca, 0.8);
          g.strokeRect(rx + TILE * 0.5, ry + TILE * 0.3, TILE * 2, TILE * 1.2);
          g.lineBetween(
            rx + TILE * 1.5, ry + TILE * 0.3,
            rx + TILE * 1.5, ry + TILE * 1.5,
          );

          // Nameplate on desk
          g.fillStyle(0xd4af37);
          g.fillRect(rx + TILE * 3.5, ry + TILE * 1.4, TILE * 1.2, TILE * 0.25);
          this.add.text(
            rx + TILE * 4.1, ry + TILE * 1.42,
            "BOSS", {
              fontSize: "4px",
              color: "#3a2a1a",
              fontFamily: "sans-serif",
            },
          ).setOrigin(0.5, 0);

          // Walls and door
          this.drawRoomWalls(g, room, "left");
          this.drawRoomLabel(rx, ry - 6, "Boss Office");
        }

        /* ---- Server Room ---- */

        private drawServerRoom(
          g: Phaser.GameObjects.Graphics,
          cfg: OfficeConfig,
        ) {
          if (!cfg.serverRoom) return;
          const room = cfg.serverRoom;
          const rx = room.col * TILE;
          const ry = room.row * TILE;
          const rw = room.w * TILE;
          const rh = room.h * TILE;

          // Dark floor
          for (let r = room.row; r < room.row + room.h; r++) {
            for (let c = room.col; c < room.col + room.w; c++) {
              const shade = (r + c) % 2 === 0 ? 0x3a3a4a : 0x38384a;
              g.fillStyle(shade);
              g.fillRect(c * TILE, r * TILE, TILE, TILE);
            }
          }

          // Blue tint overlay
          const blueOverlay = this.add.graphics();
          blueOverlay.fillStyle(0x2244aa, 0.08);
          blueOverlay.fillRect(rx, ry, rw, rh);

          // Server racks (tall rectangles)
          const rackColors = [0x2a2a2a, 0x333333, 0x2a2a2a];
          for (let i = 0; i < 3; i++) {
            const rackX = rx + TILE * 0.5 + i * TILE * 1.5;
            const rackY = ry + TILE * 0.3;
            const rackW = TILE * 1.0;
            const rackH = TILE * 3.0;

            // Rack body
            g.fillStyle(rackColors[i]);
            g.fillRect(rackX, rackY, rackW, rackH);
            // Rack border
            g.lineStyle(0.5, 0x555555, 0.6);
            g.strokeRect(rackX, rackY, rackW, rackH);

            // Blinking indicator lights (coloured dots)
            const lightColors = [0x00ff44, 0x44aaff, 0xff8800, 0x00ff44, 0x44aaff];
            for (let l = 0; l < 5; l++) {
              const lx = rackX + TILE * 0.2;
              const ly = rackY + TILE * 0.3 + l * TILE * 0.55;
              g.fillStyle(lightColors[l], 0.9);
              g.fillCircle(lx, ly, 1.5);
              // Second light
              g.fillStyle(lightColors[(l + 2) % 5], 0.7);
              g.fillCircle(lx + TILE * 0.6, ly, 1.5);
            }

            // Ventilation lines
            g.lineStyle(0.3, 0x555555, 0.4);
            for (let v = 0; v < 6; v++) {
              const vy = rackY + TILE * 0.2 + v * TILE * 0.5;
              g.lineBetween(rackX + 2, vy, rackX + rackW - 2, vy);
            }
          }

          // Cable tray (across top)
          g.fillStyle(0x444444);
          g.fillRect(rx + TILE * 0.3, ry + TILE * 0.1, rw - TILE * 0.6, 3);
          // Cables (coloured lines from tray down)
          const cableColors = [0x2266dd, 0xdd6622, 0x22aa44];
          for (let cb = 0; cb < 3; cb++) {
            g.lineStyle(0.5, cableColors[cb], 0.5);
            const cx = rx + TILE * 1.0 + cb * TILE * 1.5;
            g.lineBetween(cx, ry + TILE * 0.1, cx, ry + TILE * 0.3);
          }

          // Walls and door
          this.drawRoomWalls(g, room, "left");
          this.drawRoomLabel(rx, ry - 6, "Server Room");
        }

        /* ---- Archives Room ---- */

        private drawArchives(
          g: Phaser.GameObjects.Graphics,
          cfg: OfficeConfig,
        ) {
          if (!cfg.archives) return;
          const room = cfg.archives;
          const rx = room.col * TILE;
          const ry = room.row * TILE;
          const rw = room.w * TILE;
          const rh = room.h * TILE;

          // Slightly darker warm floor
          for (let r = room.row; r < room.row + room.h; r++) {
            for (let c = room.col; c < room.col + room.w; c++) {
              const shade = (r + c) % 2 === 0 ? 0xb8a080 : 0xb49c7c;
              g.fillStyle(shade);
              g.fillRect(c * TILE, r * TILE, TILE, TILE);
            }
          }

          // Dim warm light overlay
          const warmOverlay = this.add.graphics();
          warmOverlay.fillStyle(0xaa8844, 0.05);
          warmOverlay.fillRect(rx, ry, rw, rh);

          // Filing cabinets (2 rows)
          for (let row = 0; row < 2; row++) {
            for (let cab = 0; cab < 4; cab++) {
              const cx = rx + TILE * 0.4 + cab * TILE * 1.4;
              const cy = ry + TILE * 0.3 + row * TILE * 1.8;
              const cw = TILE * 1.0;
              const ch = TILE * 1.5;

              // Cabinet body
              g.fillStyle(row === 0 ? 0x888888 : 0x7a7a7a);
              g.fillRect(cx, cy, cw, ch);
              g.lineStyle(0.5, 0x666666, 0.5);
              g.strokeRect(cx, cy, cw, ch);

              // Drawer lines
              g.lineStyle(0.4, 0x666666, 0.6);
              for (let d = 1; d <= 3; d++) {
                g.lineBetween(cx + 1, cy + d * (ch / 4), cx + cw - 1, cy + d * (ch / 4));
              }
              // Drawer handles
              for (let d = 0; d < 4; d++) {
                g.fillStyle(0xaaaaaa, 0.7);
                g.fillRect(cx + cw / 2 - 2, cy + d * (ch / 4) + (ch / 8) - 1, 4, 2);
              }
            }
          }

          // Boxes on floor (bottom-right corner)
          const boxColors = [0x8b6b4a, 0x9a7a5a, 0x7a5a3a];
          for (let b = 0; b < 3; b++) {
            g.fillStyle(boxColors[b]);
            g.fillRect(
              rx + rw - TILE * 1.5 + b * TILE * 0.35,
              ry + rh - TILE * 0.9,
              TILE * 0.6,
              TILE * 0.6,
            );
            g.lineStyle(0.3, 0x5a4a3a, 0.4);
            g.strokeRect(
              rx + rw - TILE * 1.5 + b * TILE * 0.35,
              ry + rh - TILE * 0.9,
              TILE * 0.6,
              TILE * 0.6,
            );
          }

          // Walls and door
          this.drawRoomWalls(g, room, "left");
          this.drawRoomLabel(rx, ry - 6, "Archives");
        }

        /* ---- Lounge / Break Room ---- */

        private drawLounge(
          g: Phaser.GameObjects.Graphics,
          cfg: OfficeConfig,
        ) {
          if (!cfg.lounge) return;
          const room = cfg.lounge;
          const rx = room.col * TILE;
          const ry = room.row * TILE;
          const rw = room.w * TILE;
          const rh = room.h * TILE;

          // Warm floor
          for (let r = room.row; r < room.row + room.h; r++) {
            for (let c = room.col; c < room.col + room.w; c++) {
              const shade = (r + c) % 2 === 0 ? 0xc8a878 : 0xc4a474;
              g.fillStyle(shade);
              g.fillRect(c * TILE, r * TILE, TILE, TILE);
            }
          }

          // Couch 1 (left side, facing right)
          g.fillStyle(0x5a6a9a);
          g.fillRoundedRect(rx + TILE * 0.5, ry + TILE * 0.5, TILE * 1.2, TILE * 2.5, 3);
          g.fillStyle(0x4a5a8a, 0.5);
          g.fillRect(rx + TILE * 0.5, ry + TILE * 0.5, TILE * 1.2, TILE * 0.4);
          g.fillRect(rx + TILE * 0.5, ry + TILE * 2.6, TILE * 1.2, TILE * 0.4);

          // Couch 2 (right side, facing left)
          g.fillStyle(0x5a6a9a);
          g.fillRoundedRect(rx + TILE * 4.5, ry + TILE * 0.5, TILE * 1.2, TILE * 2.5, 3);
          g.fillStyle(0x4a5a8a, 0.5);
          g.fillRect(rx + TILE * 4.5, ry + TILE * 0.5, TILE * 1.2, TILE * 0.4);
          g.fillRect(rx + TILE * 4.5, ry + TILE * 2.6, TILE * 1.2, TILE * 0.4);

          // Coffee table between couches
          g.fillStyle(0x7a5a3a);
          g.fillRoundedRect(rx + TILE * 2.2, ry + TILE * 1.0, TILE * 1.8, TILE * 1.5, 2);
          g.fillStyle(0x9a7a5a, 0.3);
          g.fillRect(rx + TILE * 2.4, ry + TILE * 1.2, TILE * 1.4, TILE * 0.2);

          // Wall-mounted TV (top wall)
          g.fillStyle(0x111111);
          g.fillRect(rx + TILE * 2.5, ry + TILE * 0.05, TILE * 2.0, TILE * 0.15);
          g.fillRect(rx + TILE * 2.2, ry - TILE * 0.2, TILE * 2.6, TILE * 0.2);
          // TV screen (in wall)
          try {
            this.add.image(rx + TILE * 3.5, ry + 2, 'tv')
              .setOrigin(0.5, 0)
              .setScale(0.3);
          } catch {
            g.fillStyle(0x222244);
            g.fillRect(rx + TILE * 2.5, ry + 2, TILE * 2, TILE * 0.8);
          }

          // Vending machine (right side)
          g.fillStyle(0x2244aa);
          g.fillRect(rx + TILE * 6.5, ry + TILE * 0.3, TILE * 1.2, TILE * 2.0);
          g.lineStyle(0.5, 0x1a3388, 0.6);
          g.strokeRect(rx + TILE * 6.5, ry + TILE * 0.3, TILE * 1.2, TILE * 2.0);
          // Display window
          g.fillStyle(0xaaddff, 0.3);
          g.fillRect(rx + TILE * 6.6, ry + TILE * 0.4, TILE * 1.0, TILE * 1.0);
          // Coloured product rows
          const vendColors = [0xdd2222, 0x22dd22, 0xddaa22, 0x2222dd];
          for (let v = 0; v < 4; v++) {
            g.fillStyle(vendColors[v], 0.7);
            g.fillRect(rx + TILE * 6.7 + v * TILE * 0.22, ry + TILE * 0.5, TILE * 0.15, TILE * 0.8);
          }
          // Coin slot
          g.fillStyle(0x333333);
          g.fillRect(rx + TILE * 7.1, ry + TILE * 1.6, TILE * 0.2, TILE * 0.1);

          // Potted plants
          const plantPositions = [
            [rx + rw - TILE * 0.6, ry + rh - TILE * 0.8],
            [rx + TILE * 0.4, ry + rh - TILE * 0.6],
          ];
          for (const [px, py] of plantPositions) {
            g.fillStyle(0x8a5a3a);
            g.fillRect(px - 3, py + 2, 8, 5);
            g.fillStyle(0x4a8a3a, 0.85);
            g.fillCircle(px + 1, py - 2, 5);
            g.fillStyle(0x5aaa4a, 0.7);
            g.fillCircle(px - 2, py, 4);
            g.fillCircle(px + 4, py, 4);
          }

          // Walls and door
          this.drawRoomWalls(g, room, "left");
          this.drawRoomLabel(rx, ry - 6, "Lounge");
        }

        /* ---- Restrooms ---- */

        private drawRestrooms(
          g: Phaser.GameObjects.Graphics,
          cfg: OfficeConfig,
        ) {
          if (!cfg.restrooms) return;
          const room = cfg.restrooms;
          const rx = room.col * TILE;
          const ry = room.row * TILE;
          const rw = room.w * TILE;
          const rh = room.h * TILE;

          // Grey floor
          for (let r = room.row; r < room.row + room.h; r++) {
            for (let c = room.col; c < room.col + room.w; c++) {
              const shade = (r + c) % 2 === 0 ? 0xaaaaaa : 0xa6a6a6;
              g.fillStyle(shade);
              g.fillRect(c * TILE, r * TILE, TILE, TILE);
            }
          }

          // Two doors side by side
          const doorW = TILE * 1.0;
          const doorH = TILE * 1.8;
          const doorGap = TILE * 0.4;
          const doorsStartX = rx + (rw - doorW * 2 - doorGap) / 2;
          const doorY = ry + TILE * 0.8;

          // Door M
          g.fillStyle(0x8b6b4a);
          g.fillRect(doorsStartX, doorY, doorW, doorH);
          g.lineStyle(0.5, 0x6a4a2a, 0.8);
          g.strokeRect(doorsStartX, doorY, doorW, doorH);
          // Handle
          g.fillStyle(0xd4af37);
          g.fillCircle(doorsStartX + doorW - 4, doorY + doorH * 0.55, 2);

          this.add.text(
            doorsStartX + doorW / 2, doorY + doorH * 0.3,
            "M", {
              fontSize: "8px",
              color: "#ffffff",
              fontFamily: "sans-serif",
              fontStyle: "bold",
            },
          ).setOrigin(0.5, 0.5);

          // Door F
          const door2X = doorsStartX + doorW + doorGap;
          g.fillStyle(0x8b6b4a);
          g.fillRect(door2X, doorY, doorW, doorH);
          g.lineStyle(0.5, 0x6a4a2a, 0.8);
          g.strokeRect(door2X, doorY, doorW, doorH);
          g.fillStyle(0xd4af37);
          g.fillCircle(door2X + doorW - 4, doorY + doorH * 0.55, 2);

          this.add.text(
            door2X + doorW / 2, doorY + doorH * 0.3,
            "F", {
              fontSize: "8px",
              color: "#ffffff",
              fontFamily: "sans-serif",
              fontStyle: "bold",
            },
          ).setOrigin(0.5, 0.5);

          // Walls and door
          this.drawRoomWalls(g, room, "left");
          this.drawRoomLabel(rx, ry - 6, "Restrooms");
        }

        /* ---------------------------------------------------------- */
        /*  Sprite animations (corrected frame layout)                 */
        /* ---------------------------------------------------------- */

        private createAnimations() {
          for (let i = 0; i < NUM_CHARS; i++) {
            const key = `char_${i}`;

            // Frames 0-2: walk down, 3-6: idle/extra down
            // Frames 7-9: walk up, 10-13: idle/extra up
            // Frames 14-16: walk right, 17-20: idle/extra right
            // Walk-left: walk-right frames + flipX

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

            // Idle frames: single static frame
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

          // Possibly regenerate config if team size changed
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
            const targetX = pos.col * TILE + TILE * 0.5;
            const targetY = pos.row * TILE;

            const charKey = `char_${i % NUM_CHARS}`;
            const existing = this.agentContainers.get(agent.agentId);

            if (!existing) {
              // Create new agent
              // Shadow ellipse under sprite
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

              // Rich speech bubble
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

              // Auto-hide bubble after delay
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
              // Update existing agent
              const { container, sprite, bubble } = existing;

              // Update bubble if state changed
              if (existing.lastState !== agent.state) {
                // Play sound on task completion
                if (
                  agent.state === "done" ||
                  agent.state === "waiting_for_approval"
                ) {
                  try {
                    this.sound.play("task-complete", { volume: 0.3 });
                  } catch {
                    /* sound may not be loaded */
                  }
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

                // Reset auto-hide timer
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

              // Move if destination changed
              if (existing.goalRow !== pos.row || existing.goalCol !== pos.col) {
                existing.goalRow = pos.row;
                existing.goalCol = pos.col;

                // If already walking, interrupt — we'll start a new path
                // from the agent's current grid cell
                if (existing.walking) {
                  this.tweens.killTweensOf(container);
                  existing.walking = false;
                }

                // Compute A* path from current cell to target cell
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
                  // No valid path — teleport as fallback so agent isn't stuck
                  container.x = targetX;
                  container.y = targetY;
                  container.setDepth(pos.row);
                  existing.lastRow = pos.row;
                  existing.lastCol = pos.col;
                }
                // path.length === 1 means already at destination — nothing to do
              }
            }
          }

          // Remove agents no longer in snapshot
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
          let stepIndex = 1; // path[0] is the current cell

          const stepNext = () => {
            const freshEntry = this.agentContainers.get(agentId);
            if (!freshEntry || !freshEntry.walking) return;
            if (stepIndex >= path.length) {
              // Arrived at destination
              freshEntry.walking = false;
              // Idle in last direction
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

            const tx = to.col * TILE + TILE * 0.5;
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
                // Small pause between steps for natural look
                this.time.delayedCall(20, stepNext);
              },
            });
          };

          stepNext();
        }

        /** Determine animation direction for a single grid step. */
        private walkDirection(
          from: { row: number; col: number },
          to: { row: number; col: number },
        ): { anim: "down" | "up" | "right"; flipX: boolean } {
          const dr = to.row - from.row;
          const dc = to.col - from.col;
          if (dr > 0) return { anim: "down", flipX: false };
          if (dr < 0) return { anim: "up", flipX: false };
          if (dc > 0) return { anim: "right", flipX: false };
          // dc < 0: moving left → use right animation flipped
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

          // Fit entire office in view (no clipping)
          const zoomX = cw / this.worldW;
          const zoomY = ch / this.worldH;
          const zoom = Math.min(zoomX, zoomY);

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
