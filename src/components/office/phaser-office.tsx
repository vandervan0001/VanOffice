"use client";

import { useEffect, useRef } from "react";
import type { WorkspaceSnapshot, AgentState } from "@/lib/types";
import {
  generateOfficeConfig,
  agentGridPosition,
  type OfficeConfig,
} from "@/lib/state/office-layout";

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

    import("phaser").then((Phaser) => {
      if (destroyed || !containerRef.current) return;

      /* ============================================================ */
      /*  OfficeScene                                                  */
      /* ============================================================ */

      class OfficeScene extends Phaser.Scene {
        private officeConfig!: OfficeConfig;
        private worldW = 0;
        private worldH = 0;

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
          const winCols = [1, 5, 9];
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
            const dx = (desk.col - 1) * TILE;
            const dy = (desk.row - 1) * TILE;

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
            [0, 5],
            [16, 3],
            [0, 8],
            [16, cfg.rows - 3],
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

              // Move if position changed
              if (existing.lastRow !== pos.row || existing.lastCol !== pos.col) {
                const dx = targetX - container.x;
                const dy = targetY - container.y;

                // Determine walk direction
                let walkDir: "down" | "up" | "right" = "down";
                let isLeft = false;
                if (Math.abs(dy) > Math.abs(dx)) {
                  walkDir = dy > 0 ? "down" : "up";
                } else {
                  walkDir = "right";
                  isLeft = dx < 0;
                }

                // Flip sprite for left movement
                sprite.setFlipX(isLeft);

                sprite.play(`${charKey}_walk_${walkDir}`);

                this.tweens.add({
                  targets: container,
                  x: targetX,
                  y: targetY,
                  duration: 600,
                  ease: "Sine.easeInOut",
                  onComplete: () => {
                    // Stop walk and show idle frame facing arrival direction
                    sprite.play(`${charKey}_idle_${walkDir}`);
                    if (walkDir !== "right") {
                      sprite.setFlipX(false);
                    }
                  },
                });

                container.setDepth(pos.row);
                existing.lastRow = pos.row;
                existing.lastCol = pos.col;
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
        /*  Camera                                                     */
        /* ---------------------------------------------------------- */

        private fitCamera() {
          const cam = this.cameras.main;
          const cw = this.scale.width;
          const ch = this.scale.height;
          if (!cw || !ch) return;

          const zoomX = cw / this.worldW;
          const zoomY = ch / this.worldH;
          const zoom = Math.min(zoomX, zoomY);

          cam.setZoom(zoom);
          cam.centerOn(this.worldW / 2, this.worldH / 2);
        }
      }

      /* ============================================================ */
      /*  Boot Phaser                                                  */
      /* ============================================================ */

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current!,
        width: containerRef.current!.clientWidth || 800,
        height: containerRef.current!.clientHeight || 600,
        scene: [OfficeScene],
        pixelArt: true,
        scale: { mode: Phaser.Scale.RESIZE },
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
