"use client";

import { useEffect, useRef } from "react";
import type { WorkspaceSnapshot, AgentState } from "@/lib/types";
import {
  generateOfficeConfig,
  agentGridPosition,
  type OfficeConfig,
} from "@/lib/state/office-layout";
import { findPath } from "@/lib/state/pathfinding";
import { generateTilemapJSON } from "@/lib/state/tilemap-generator";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface PhaserOfficeProps {
  snapshot: WorkspaceSnapshot | null;
}

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
/*  Constants                                                          */
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

        /* collision map for A* pathfinding (built from tilemap collision layer) */
        private collisionBlocked: Set<string> = new Set();

        /* tilemap reference for camera bounds */
        private map!: Phaser.Tilemaps.Tilemap;

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
          this.load.image("office-tiles", "/sprites/office-tileset.png");

          for (let i = 0; i < NUM_CHARS; i++) {
            this.load.spritesheet(`char_${i}`, `/assets/characters/char_${i}.png`, {
              frameWidth: 16,
              frameHeight: 32,
            });
          }

          this.load.audio("task-complete", "/assets/sounds/task-complete.wav");
        }

        /* ---------------------------------------------------------- */
        /*  create                                                     */
        /* ---------------------------------------------------------- */

        create() {
          const teamSize = snapshotRef.current?.agents.length ?? 4;
          this.officeConfig = generateOfficeConfig(Math.max(teamSize, 4));

          // Generate tilemap JSON and create Phaser tilemap
          const tilemapData = generateTilemapJSON(this.officeConfig, teamSize);
          this.map = this.make.tilemap({
            data: undefined,   // we set layers manually
            tileWidth: TILE,
            tileHeight: TILE,
            width: tilemapData.width,
            height: tilemapData.height,
          });

          // Add tileset image
          const tileset = this.map.addTilesetImage(
            "office",
            "office-tiles",
            TILE,
            TILE,
            0,
            0,
          );

          if (!tileset) {
            console.error("Failed to add tileset image");
            return;
          }

          // Create layers from the generated data
          for (const layerData of tilemapData.layers) {
            if (layerData.name === "collision") continue; // collision is data-only

            const layer = this.map.createBlankLayer(
              layerData.name,
              tileset,
              0,
              0,
              layerData.width,
              layerData.height,
              TILE,
              TILE,
            );
            if (!layer) continue;

            // Fill tiles from generated data
            for (let r = 0; r < layerData.height; r++) {
              for (let c = 0; c < layerData.width; c++) {
                const gid = layerData.data[r * layerData.width + c];
                if (gid > 0) {
                  layer.putTileAt(gid - 1, c, r); // putTileAt uses 0-based tile index
                }
              }
            }
          }

          // Build collision set from the collision layer
          const collisionLayer = tilemapData.layers.find((l) => l.name === "collision");
          if (collisionLayer) {
            this.collisionBlocked = new Set<string>();
            for (let r = 0; r < collisionLayer.height; r++) {
              for (let c = 0; c < collisionLayer.width; c++) {
                if (collisionLayer.data[r * collisionLayer.width + c] !== 0) {
                  this.collisionBlocked.add(`${r},${c}`);
                }
              }
            }
          }

          // Room labels
          this.drawRoomLabels();

          // Character animations
          this.createAnimations();

          // Sync agents from snapshot
          this.syncAgents();

          // Camera
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
        /*  Room labels                                                */
        /* ---------------------------------------------------------- */

        private drawRoomLabels() {
          const cfg = this.officeConfig;

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

        private drawRoomLabel(x: number, y: number, text: string) {
          this.add
            .text(x, y, text, {
              fontSize: "5px",
              color: "#8a7a6a",
              fontFamily: "sans-serif",
            })
            .setOrigin(0, 1)
            .setDepth(100);
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
              // Rebuild collision from tilemap generator
              const tilemapData = generateTilemapJSON(newCfg, agents.length);
              const collisionLayer = tilemapData.layers.find((l) => l.name === "collision");
              if (collisionLayer) {
                this.collisionBlocked = new Set<string>();
                for (let r = 0; r < collisionLayer.height; r++) {
                  for (let c = 0; c < collisionLayer.width; c++) {
                    if (collisionLayer.data[r * collisionLayer.width + c] !== 0) {
                      this.collisionBlocked.add(`${r},${c}`);
                    }
                  }
                }
              }
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
              container.setDepth(200 + pos.row); // above tilemap layers

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
                  container.setDepth(200 + pos.row);
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
                e.container.setDepth(200 + to.row);
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

          const mapW = this.map.widthInPixels;
          const mapH = this.map.heightInPixels;

          const zoomX = cw / mapW;
          const zoomY = ch / mapH;
          const zoom = Math.max(zoomX, zoomY * 0.95);

          cam.setZoom(zoom);
          cam.setBounds(0, 0, mapW, mapH);
          cam.centerOn(mapW / 2, mapH / 2);
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
