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

const STATE_EMOJI: Record<AgentState, string> = {
  idle: "",
  writing: "\u{1f4bb}",
  researching: "\u{1f50d}",
  planning: "\u{1f4dd}",
  waiting_for_approval: "\u23f3",
  done: "\u2705",
  meeting: "\u{1f4ac}",
};

/* ------------------------------------------------------------------ */
/*  Tile size used by Phaser (half the HTML office's 32 px)            */
/* ------------------------------------------------------------------ */

const TILE = 16;
const NUM_CHARS = 6; // char_0 .. char_5

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
            nameLabel: Phaser.GameObjects.Text;
            emoteLabel: Phaser.GameObjects.Text;
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
        /*  Draw static office furniture/floors via Graphics           */
        /* ---------------------------------------------------------- */

        private drawOffice() {
          const g = this.add.graphics();
          const cfg = this.officeConfig;

          // --- Floor ---
          g.fillStyle(0xc8a878);
          g.fillRect(0, 0, this.worldW, this.worldH);

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

          // --- Desks ---
          for (const desk of cfg.desks) {
            const dx = (desk.col - 1) * TILE;
            const dy = (desk.row - 1) * TILE;
            // Desk surface
            g.fillStyle(0x8b6b4a);
            g.fillRect(dx, dy, TILE * 3, TILE * 1.8);
            // Highlight edge
            g.fillStyle(0xa0845c, 0.5);
            g.fillRect(dx, dy, TILE * 3, 2);
            // Monitor
            g.fillStyle(0x2a2a3a);
            g.fillRect(dx + TILE * 0.8, dy + TILE * 0.2, TILE * 1.4, TILE * 0.9);
            // Screen glow
            g.fillStyle(0x5588bb, 0.4);
            g.fillRect(dx + TILE * 0.9, dy + TILE * 0.3, TILE * 1.2, TILE * 0.7);
            // Monitor stand
            g.fillStyle(0x2a2a3a);
            g.fillRect(dx + TILE * 1.3, dy + TILE * 1.1, TILE * 0.4, TILE * 0.3);
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

            // Coffee machine
            g.fillStyle(0x6a4a3a);
            g.fillRect(bx + TILE * 0.5, by + TILE * 0.4, TILE * 0.8, TILE * 1);
            g.fillStyle(0xcc6644, 0.6);
            g.fillRect(bx + TILE * 0.6, by + TILE * 0.5, TILE * 0.3, TILE * 0.3);

            // Couch
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
        /*  Sprite animations                                          */
        /* ---------------------------------------------------------- */

        private createAnimations() {
          for (let i = 0; i < NUM_CHARS; i++) {
            const key = `char_${i}`;

            // Row 0: walk down (frames 0-6), row 1: walk up (7-13), row 2: walk right (14-20)
            // Idle = middle frame of each row
            this.anims.create({
              key: `${key}_walk_down`,
              frames: this.anims.generateFrameNumbers(key, { start: 0, end: 6 }),
              frameRate: 8,
              repeat: -1,
            });

            this.anims.create({
              key: `${key}_walk_up`,
              frames: this.anims.generateFrameNumbers(key, { start: 7, end: 13 }),
              frameRate: 8,
              repeat: -1,
            });

            this.anims.create({
              key: `${key}_walk_right`,
              frames: this.anims.generateFrameNumbers(key, { start: 14, end: 20 }),
              frameRate: 8,
              repeat: -1,
            });

            this.anims.create({
              key: `${key}_idle_down`,
              frames: [{ key, frame: 3 }],
              frameRate: 1,
            });

            this.anims.create({
              key: `${key}_idle_up`,
              frames: [{ key, frame: 10 }],
              frameRate: 1,
            });

            this.anims.create({
              key: `${key}_idle_right`,
              frames: [{ key, frame: 17 }],
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
              // Redraw would need clearing – for now keep same config after create
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
              const sprite = this.add.sprite(0, 0, charKey, 3);
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

              const emoji = STATE_EMOJI[agent.state] || "";
              const emoteLabel = this.add.text(0, -34, emoji, {
                fontSize: "9px",
                align: "center",
                backgroundColor: emoji ? "rgba(255,255,255,0.85)" : undefined,
                padding: { x: 2, y: 1 },
              });
              emoteLabel.setOrigin(0.5, 1);

              const container = this.add.container(targetX, targetY, [
                sprite,
                nameLabel,
                emoteLabel,
              ]);
              container.setDepth(pos.row);

              this.agentContainers.set(agent.agentId, {
                container,
                sprite,
                nameLabel,
                emoteLabel,
                lastRow: pos.row,
                lastCol: pos.col,
                lastState: agent.state,
              });
            } else {
              // Update existing agent
              const { container, sprite, emoteLabel } = existing;

              // Update emote if state changed
              if (existing.lastState !== agent.state) {
                const emoji = STATE_EMOJI[agent.state] || "";
                emoteLabel.setText(emoji);
                emoteLabel.setBackgroundColor(
                  emoji ? "rgba(255,255,255,0.85)" : "transparent",
                );
                existing.lastState = agent.state;
              }

              // Move if position changed
              if (existing.lastRow !== pos.row || existing.lastCol !== pos.col) {
                const dx = targetX - container.x;
                const dy = targetY - container.y;

                // Determine walk direction
                let walkDir: "down" | "up" | "right" = "down";
                if (Math.abs(dy) > Math.abs(dx)) {
                  walkDir = dy > 0 ? "down" : "up";
                } else {
                  walkDir = "right";
                }

                // Flip sprite for left movement
                if (dx < 0 && walkDir === "right") {
                  sprite.setFlipX(true);
                } else {
                  sprite.setFlipX(false);
                }

                sprite.play(`${charKey}_walk_${walkDir}`);

                this.tweens.add({
                  targets: container,
                  x: targetX,
                  y: targetY,
                  duration: 600,
                  ease: "Sine.easeInOut",
                  onComplete: () => {
                    sprite.play(`${charKey}_idle_down`);
                    sprite.setFlipX(false);
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
          const zoom = Math.max(zoomX, zoomY);

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
