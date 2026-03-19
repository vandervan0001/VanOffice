"use client";

import { useEffect, useRef, useCallback } from "react";
import type { WorkspaceSnapshot, AgentState } from "@/lib/types";
import {
  generateOfficeConfig,
  agentGridPosition,
  type OfficeConfig,
  type RoomRect,
} from "@/lib/state/office-layout";
import { findPath } from "@/lib/state/pathfinding";
import { generateTilemapJSON } from "@/lib/state/tilemap-generator";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TILE = 16;
const NUM_CHARS = 6;
const WALK_SPEED = 48; // px/sec (3 tiles/sec)
const FRAME_DURATION = 0.15; // seconds per animation frame
const SITTING_OFFSET = 6; // px to shift down when sitting
const BUBBLE_DISPLAY_SEC = 8;

/* Character spritesheet: 112x96 => 7 cols x 3 rows of 16x32 frames
   Row 0 (frames 0-6): facing down
   Row 1 (frames 7-13): facing up
   Row 2 (frames 14-20): facing right

   Walk cycle: frames 0,1,2 (use [0,1,2,1] loop)
   Typing: frames 3,4 (2-frame loop)
   Reading: frames 5,6 (2-frame loop) */

const WALK_FRAMES = [0, 1, 2, 1];
const TYPE_FRAMES = [3, 4];
const READ_FRAMES = [5, 6];

const CHAR_W = 16;
const CHAR_H = 32;
const SHEET_COLS = 7;

/* Floor tile assignment by room type */
const FLOOR_TILES: Record<string, number> = {
  main: 0,
  boss: 3,
  server: 4,
  archives: 5,
  lounge: 6,
  restroom: 7,
  hallway: 8,
  meeting: 1,
  break: 2,
};

/* State -> character animation mapping */
const STATE_ANIM: Record<
  AgentState,
  "idle" | "typing" | "reading" | "walk"
> = {
  idle: "idle",
  planning: "typing",
  writing: "typing",
  researching: "reading",
  meeting: "idle",
  waiting_for_approval: "idle",
  done: "idle",
};

/* State -> bubble text (used only as fallback for initial spawn) */
const STATE_BUBBLE: Record<AgentState, string | null> = {
  idle: null,
  writing: "Drafting...",
  researching: "Researching...",
  planning: "Planning...",
  meeting: "In meeting",
  waiting_for_approval: "Awaiting review",
  done: "Done!",
};

/* ------------------------------------------------------------------ */
/*  Animation Queue types                                              */
/* ------------------------------------------------------------------ */

type AnimStep =
  | { type: "walk"; target: "desk" | "meeting"; minDuration: number }
  | { type: "sit"; animation: "typing" | "reading" | "idle"; minDuration: number }
  | { type: "stand"; animation: "idle"; minDuration: number }
  | { type: "bubble"; text: string; emoji: string; minDuration: number };

/**
 * Build a sequence of animation steps for a state transition.
 * Each task state maps to a choreographed sequence so agents
 * visibly walk, sit, work, and report results.
 */
function buildAnimSequence(_prev: AgentState, next: AgentState): AnimStep[] {
  switch (next) {
    case "planning":
      return [
        { type: "walk", target: "desk", minDuration: 0 },
        { type: "sit", animation: "typing", minDuration: 3000 },
        { type: "bubble", text: "Mission framed", emoji: "\uD83D\uDCCB", minDuration: 2000 },
      ];
    case "researching":
      return [
        { type: "walk", target: "meeting", minDuration: 0 },
        { type: "stand", animation: "idle", minDuration: 2000 },
        { type: "walk", target: "desk", minDuration: 0 },
        { type: "sit", animation: "reading", minDuration: 4000 },
        { type: "bubble", text: "Research done", emoji: "\uD83D\uDD0D", minDuration: 2000 },
      ];
    case "writing":
      return [
        { type: "walk", target: "desk", minDuration: 0 },
        { type: "sit", animation: "typing", minDuration: 5000 },
        { type: "bubble", text: "Draft ready", emoji: "\uD83D\uDCDD", minDuration: 2000 },
      ];
    case "meeting":
      return [
        { type: "walk", target: "meeting", minDuration: 0 },
        { type: "stand", animation: "idle", minDuration: 3000 },
        { type: "walk", target: "desk", minDuration: 0 },
        { type: "sit", animation: "typing", minDuration: 2000 },
      ];
    case "waiting_for_approval":
      return [
        { type: "walk", target: "desk", minDuration: 0 },
        { type: "sit", animation: "idle", minDuration: 0 },
        { type: "bubble", text: "Awaiting review", emoji: "\u23F3", minDuration: 0 },
      ];
    case "done":
      return [
        { type: "walk", target: "desk", minDuration: 0 },
        { type: "sit", animation: "idle", minDuration: 0 },
        { type: "bubble", text: "Complete \u2705", emoji: "\u2705", minDuration: 0 },
      ];
    case "idle":
    default:
      return [
        { type: "walk", target: "desk", minDuration: 0 },
        { type: "sit", animation: "idle", minDuration: 0 },
      ];
  }
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CharRuntime {
  agentId: string;
  displayName: string;
  charIndex: number; // 0-5
  agentIndex: number; // index in the agents array (for grid position lookups)
  x: number; // pixel position (world)
  y: number;
  targetX: number;
  targetY: number;
  lastState: AgentState;
  currentState: AgentState;
  animType: "idle" | "typing" | "reading" | "walk";
  direction: "down" | "up" | "right" | "left";
  frameIndex: number;
  frameTimer: number;
  sitting: boolean;
  path: Array<{ row: number; col: number }>;
  pathStep: number;
  bubbleText: string | null;
  bubbleTimer: number;
  goalRow: number;
  goalCol: number;
  gridRow: number;
  gridCol: number;
  /* Animation queue */
  animQueue: AnimStep[];
  currentAnimStep: AnimStep | null;
  stepStartTime: number;
}

interface FurnitureDraw {
  tileGid: number;
  row: number;
  col: number;
  zY: number;
}

interface ZDrawable {
  zY: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CanvasOfficeProps {
  snapshot: WorkspaceSnapshot | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CanvasOffice({ snapshot }: CanvasOfficeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<WorkspaceSnapshot | null>(null);
  const stateRef = useRef<{
    chars: Map<string, CharRuntime>;
    officeConfig: OfficeConfig | null;
    collisionBlocked: Set<string>;
    floorImages: HTMLImageElement[];
    floorLoaded: boolean[];
    wallImage: HTMLImageElement | null;
    wallLoaded: boolean;
    charImages: HTMLImageElement[];
    charLoaded: boolean[];
    furnitureItems: FurnitureDraw[];
    tilesetImage: HTMLImageElement | null;
    tilesetLoaded: boolean;
    zoom: number;
    lastTime: number;
    animFrame: number;
  }>({
    chars: new Map(),
    officeConfig: null,
    collisionBlocked: new Set(),
    floorImages: [],
    floorLoaded: [],
    wallImage: null,
    wallLoaded: false,
    charImages: [],
    charLoaded: [],
    furnitureItems: [],
    tilesetImage: null,
    tilesetLoaded: false,
    zoom: 2,
    lastTime: 0,
    animFrame: 0,
  });

  snapshotRef.current = snapshot;

  /* ---------------------------------------------------------------- */
  /*  Load assets                                                      */
  /* ---------------------------------------------------------------- */

  const loadAssets = useCallback(() => {
    const s = stateRef.current;

    // Floor tiles
    s.floorImages = [];
    s.floorLoaded = [];
    for (let i = 0; i <= 8; i++) {
      const img = new Image();
      s.floorImages.push(img);
      s.floorLoaded.push(false);
      img.onload = () => {
        s.floorLoaded[i] = true;
      };
      img.src = `/sprites/floors/floor_${i}.png`;
    }

    // Wall tile
    const wallImg = new Image();
    s.wallImage = wallImg;
    wallImg.onload = () => {
      s.wallLoaded = true;
    };
    wallImg.src = `/sprites/walls/wall_0.png`;

    // Characters
    s.charImages = [];
    s.charLoaded = [];
    for (let i = 0; i < NUM_CHARS; i++) {
      const img = new Image();
      s.charImages.push(img);
      s.charLoaded.push(false);
      img.onload = () => {
        s.charLoaded[i] = true;
      };
      img.src = `/sprites/chars/char_${i}.png`;
    }

    // Tileset (for furniture rendering from our tilemap-generator tile IDs)
    const tilesetImg = new Image();
    s.tilesetImage = tilesetImg;
    tilesetImg.onload = () => {
      s.tilesetLoaded = true;
    };
    tilesetImg.src = `/sprites/office-tileset.png`;
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Sync agents from snapshot                                        */
  /* ---------------------------------------------------------------- */

  const syncAgents = useCallback(() => {
    const snap = snapshotRef.current;
    const s = stateRef.current;
    if (!snap || !s.officeConfig) return;

    const cfg = s.officeConfig;
    const agents = snap.agents;

    // Rebuild config if team size changed
    if (agents.length > 0) {
      const newCfg = generateOfficeConfig(Math.max(agents.length, 4));
      if (newCfg.cols !== cfg.cols || newCfg.rows !== cfg.rows) {
        s.officeConfig = newCfg;
        rebuildCollision(s);
        rebuildFurniture(s);
      }
    }

    const seen = new Set<string>();

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      seen.add(agent.agentId);

      const pos = agentGridPosition(i, agent.state, s.officeConfig);
      const targetX = pos.col * TILE + TILE / 2;
      const targetY = pos.row * TILE + TILE / 2;
      const charKey = i % NUM_CHARS;

      const existing = s.chars.get(agent.agentId);

      if (!existing) {
        // Create new character — spawn at desk, no queue
        const deskPos = agentGridPosition(i, "idle", s.officeConfig);
        const spawnX = deskPos.col * TILE + TILE / 2;
        const spawnY = deskPos.row * TILE + TILE / 2;
        const bubbleText = STATE_BUBBLE[agent.state];
        const ch: CharRuntime = {
          agentId: agent.agentId,
          displayName: agent.displayName,
          charIndex: charKey,
          agentIndex: i,
          x: spawnX,
          y: spawnY,
          targetX,
          targetY,
          lastState: agent.state,
          currentState: agent.state,
          animType: STATE_ANIM[agent.state],
          direction: "down",
          frameIndex: 0,
          frameTimer: 0,
          sitting: agent.state !== "idle" && agent.state !== "meeting" && agent.state !== "done",
          path: [],
          pathStep: 0,
          bubbleText: bubbleText,
          bubbleTimer: bubbleText ? BUBBLE_DISPLAY_SEC : 0,
          goalRow: deskPos.row,
          goalCol: deskPos.col,
          gridRow: deskPos.row,
          gridCol: deskPos.col,
          animQueue: [],
          currentAnimStep: null,
          stepStartTime: 0,
        };
        // If the agent isn't idle on spawn, enqueue the sequence
        if (agent.state !== "idle") {
          ch.animQueue = buildAnimSequence("idle", agent.state);
        }
        s.chars.set(agent.agentId, ch);
      } else {
        // Update existing
        existing.currentState = agent.state;
        existing.displayName = agent.displayName;
        existing.charIndex = charKey;
        existing.agentIndex = i;

        if (existing.lastState !== agent.state) {
          const prevState = existing.lastState;
          existing.lastState = agent.state;

          // "done" clears queue and goes straight to desk + done bubble
          if (agent.state === "done") {
            existing.animQueue = [];
            existing.currentAnimStep = null;
            existing.path = [];
            existing.pathStep = 0;
          }

          // Enqueue the new animation sequence (appended to existing queue)
          const steps = buildAnimSequence(prevState, agent.state);
          existing.animQueue.push(...steps);
        }
      }
    }

    // Remove departed agents
    for (const id of s.chars.keys()) {
      if (!seen.has(id)) {
        s.chars.delete(id);
      }
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Update loop (movement + animation)                               */
  /* ---------------------------------------------------------------- */

  /**
   * Resolve a walk target ("desk" or "meeting") into a grid position
   * for a given character using the current office config.
   */
  const resolveWalkTarget = useCallback(
    (ch: CharRuntime, target: "desk" | "meeting"): { row: number; col: number } => {
      const s = stateRef.current;
      const cfg = s.officeConfig!;
      if (target === "meeting") {
        const pos = agentGridPosition(ch.agentIndex, "meeting", cfg);
        return { row: pos.row, col: pos.col };
      }
      const pos = agentGridPosition(ch.agentIndex, "idle", cfg);
      return { row: pos.row, col: pos.col };
    },
    [],
  );

  /**
   * Try to dequeue and start the next animation step for a character.
   * Returns true if a step was started.
   */
  const dequeueStep = useCallback(
    (ch: CharRuntime): boolean => {
      if (ch.animQueue.length === 0) return false;
      const s = stateRef.current;

      const step = ch.animQueue.shift()!;
      ch.currentAnimStep = step;
      ch.stepStartTime = performance.now();

      switch (step.type) {
        case "walk": {
          const goal = resolveWalkTarget(ch, step.target);
          // Already at target? Skip walk.
          if (ch.gridRow === goal.row && ch.gridCol === goal.col) {
            ch.currentAnimStep = null;
            return dequeueStep(ch); // try next step immediately
          }
          const path = findPath(
            s.officeConfig!.rows,
            s.officeConfig!.cols,
            s.collisionBlocked,
            { row: ch.gridRow, col: ch.gridCol },
            goal,
          );
          if (path.length > 1) {
            ch.path = path;
            ch.pathStep = 1;
            ch.animType = "walk";
            ch.sitting = false;
          } else {
            // No valid path — snap and move on
            ch.x = goal.col * TILE + TILE / 2;
            ch.y = goal.row * TILE + TILE / 2;
            ch.gridRow = goal.row;
            ch.gridCol = goal.col;
            ch.currentAnimStep = null;
            return dequeueStep(ch);
          }
          break;
        }
        case "sit":
          ch.animType = step.animation;
          ch.sitting = true;
          ch.direction = "down";
          ch.frameIndex = 0;
          break;
        case "stand":
          ch.animType = step.animation === "idle" ? "idle" : "idle";
          ch.sitting = false;
          ch.direction = "down";
          ch.frameIndex = 0;
          break;
        case "bubble":
          ch.bubbleText = `${step.emoji} ${step.text}`;
          // persistent bubble if minDuration === 0
          ch.bubbleTimer = step.minDuration > 0 ? step.minDuration / 1000 : BUBBLE_DISPLAY_SEC;
          break;
      }
      return true;
    },
    [resolveWalkTarget],
  );

  const update = useCallback(
    (dt: number) => {
      const s = stateRef.current;

      for (const ch of s.chars.values()) {
        // Bubble timer (only count down if timer is positive and not a persistent bubble)
        if (ch.bubbleTimer > 0) {
          ch.bubbleTimer -= dt;
          if (ch.bubbleTimer <= 0) {
            ch.bubbleText = null;
          }
        }

        // --- Animation queue processing ---
        const step = ch.currentAnimStep;

        if (!step) {
          // No active step — try to dequeue
          dequeueStep(ch);
        }

        if (ch.currentAnimStep) {
          const elapsed = performance.now() - ch.stepStartTime;

          switch (ch.currentAnimStep.type) {
            case "walk": {
              // Walk tile-by-tile along the A* path
              if (ch.path.length > 0 && ch.pathStep < ch.path.length) {
                const target = ch.path[ch.pathStep];
                const tx = target.col * TILE + TILE / 2;
                const ty = target.row * TILE + TILE / 2;

                const dx = tx - ch.x;
                const dy = ty - ch.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const moveStep = WALK_SPEED * dt;

                if (Math.abs(dx) > Math.abs(dy)) {
                  ch.direction = dx > 0 ? "right" : "left";
                } else {
                  ch.direction = dy > 0 ? "down" : "up";
                }

                if (dist <= moveStep) {
                  ch.x = tx;
                  ch.y = ty;
                  ch.gridRow = target.row;
                  ch.gridCol = target.col;
                  ch.pathStep++;

                  if (ch.pathStep >= ch.path.length) {
                    // Arrived — complete walk step
                    ch.path = [];
                    ch.pathStep = 0;
                    ch.direction = "down";
                    ch.frameIndex = 0;
                    ch.animType = "idle";
                    ch.currentAnimStep = null;
                  }
                } else {
                  ch.x += (dx / dist) * moveStep;
                  ch.y += (dy / dist) * moveStep;
                }
              } else {
                // path exhausted (edge case)
                ch.currentAnimStep = null;
              }
              break;
            }
            case "sit":
            case "stand": {
              // Wait for minDuration, then complete
              if (elapsed >= ch.currentAnimStep.minDuration) {
                ch.currentAnimStep = null;
              }
              break;
            }
            case "bubble": {
              // Wait for minDuration, then complete
              if (ch.currentAnimStep.minDuration > 0 && elapsed >= ch.currentAnimStep.minDuration) {
                ch.currentAnimStep = null;
              } else if (ch.currentAnimStep.minDuration === 0) {
                // persistent bubble — complete step immediately (bubble stays via bubbleTimer)
                ch.currentAnimStep = null;
              }
              break;
            }
          }
        }

        // Animation frame cycling
        ch.frameTimer += dt;
        if (ch.frameTimer >= FRAME_DURATION) {
          ch.frameTimer -= FRAME_DURATION;
          ch.frameIndex++;
        }
      }
    },
    [dequeueStep],
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const render = useCallback((ctx: CanvasRenderingContext2D) => {
    const s = stateRef.current;
    const cfg = s.officeConfig;
    if (!cfg) return;

    const canvas = ctx.canvas;
    const cw = canvas.width;
    const ch = canvas.height;

    // Integer zoom — fit the map into the container, no clipping
    const zoomX = cw / (cfg.cols * TILE);
    const zoomY = ch / (cfg.rows * TILE);
    // Use the smaller to fit entirely, but minimum 1
    const zoom = Math.max(1, Math.floor(Math.min(zoomX, zoomY)));
    s.zoom = zoom;

    const tileS = TILE * zoom;
    const mapW = cfg.cols * tileS;
    const mapH = cfg.rows * tileS;
    const offsetX = Math.floor((cw - mapW) / 2);
    const offsetY = Math.floor((ch - mapH) / 2);

    // Clear
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = "#f0e8d8";
    ctx.fillRect(0, 0, cw, ch);

    ctx.imageSmoothingEnabled = false;

    // ---- Floor tiles ----
    drawFloors(ctx, s, cfg, offsetX, offsetY, zoom);

    // ---- Walls ----
    drawWalls(ctx, s, cfg, offsetX, offsetY, zoom);

    // ---- Z-sorted drawables: furniture + characters ----
    const drawables: ZDrawable[] = [];

    // Furniture from tileset
    if (s.tilesetLoaded && s.tilesetImage) {
      for (const f of s.furnitureItems) {
        const tileIndex = f.tileGid - 1; // GID is 1-indexed
        if (tileIndex < 0) continue;
        const srcCol = tileIndex % 8;
        const srcRow = Math.floor(tileIndex / 8);
        const fRow = f.row;
        const fCol = f.col;
        const fzY = f.zY;
        drawables.push({
          zY: fzY,
          draw: (c) => {
            c.drawImage(
              s.tilesetImage!,
              srcCol * 32,
              srcRow * 32,
              32,
              32,
              offsetX + fCol * tileS,
              offsetY + fRow * tileS,
              tileS,
              tileS,
            );
          },
        });
      }
    }

    // Characters
    for (const charR of s.chars.values()) {
      const img = s.charImages[charR.charIndex];
      if (!img || !s.charLoaded[charR.charIndex]) continue;

      const cx = charR.x;
      const cy = charR.y;
      const sittingOff = charR.sitting ? SITTING_OFFSET : 0;

      // Character is drawn anchored at bottom-center
      const drawX = Math.round(offsetX + cx * zoom - (CHAR_W * zoom) / 2);
      const drawY = Math.round(
        offsetY + (cy + sittingOff) * zoom - CHAR_H * zoom,
      );

      const charZY = cy + TILE / 2 + 0.5;

      // Determine sprite frame
      let frameInRow = 0;
      let row = 0;
      switch (charR.animType) {
        case "walk": {
          const walkIdx = charR.frameIndex % WALK_FRAMES.length;
          frameInRow = WALK_FRAMES[walkIdx];
          break;
        }
        case "typing": {
          const typeIdx = charR.frameIndex % TYPE_FRAMES.length;
          frameInRow = TYPE_FRAMES[typeIdx];
          break;
        }
        case "reading": {
          const readIdx = charR.frameIndex % READ_FRAMES.length;
          frameInRow = READ_FRAMES[readIdx];
          break;
        }
        case "idle":
        default:
          frameInRow = 0;
          break;
      }

      // Direction -> row
      switch (charR.direction) {
        case "down":
          row = 0;
          break;
        case "up":
          row = 1;
          break;
        case "right":
        case "left":
          row = 2;
          break;
      }

      const srcX = frameInRow * CHAR_W;
      const srcY = row * CHAR_H;
      const flipX = charR.direction === "left";

      const capturedDrawX = drawX;
      const capturedDrawY = drawY;

      drawables.push({
        zY: charZY,
        draw: (c) => {
          c.save();
          if (flipX) {
            c.translate(capturedDrawX + CHAR_W * zoom, capturedDrawY);
            c.scale(-1, 1);
            c.drawImage(
              img,
              srcX,
              srcY,
              CHAR_W,
              CHAR_H,
              0,
              0,
              CHAR_W * zoom,
              CHAR_H * zoom,
            );
          } else {
            c.drawImage(
              img,
              srcX,
              srcY,
              CHAR_W,
              CHAR_H,
              capturedDrawX,
              capturedDrawY,
              CHAR_W * zoom,
              CHAR_H * zoom,
            );
          }
          c.restore();
        },
      });
    }

    // Sort by zY ascending (back to front)
    drawables.sort((a, b) => a.zY - b.zY);
    for (const d of drawables) {
      d.draw(ctx);
    }

    // ---- Speech bubbles (always on top) ----
    drawBubbles(ctx, s, offsetX, offsetY, zoom);

    // ---- Room labels ----
    drawRoomLabels(ctx, cfg, offsetX, offsetY, zoom);

    // ---- Name labels ----
    drawNameLabels(ctx, s, offsetX, offsetY, zoom);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Floor drawing                                                    */
  /* ---------------------------------------------------------------- */

  function drawFloors(
    ctx: CanvasRenderingContext2D,
    s: typeof stateRef.current,
    cfg: OfficeConfig,
    offsetX: number,
    offsetY: number,
    zoom: number,
  ) {
    const tileS = TILE * zoom;

    // Build room map: which floor tile index for each cell
    const floorMap: number[][] = [];
    for (let r = 0; r < cfg.rows; r++) {
      floorMap[r] = [];
      for (let c = 0; c < cfg.cols; c++) {
        // Default: checkerboard
        floorMap[r][c] = (r + c) % 2 === 0 ? 0 : 1;
      }
    }

    // Overlay room floors
    const roomFloors: Array<[RoomRect | null, number]> = [
      [cfg.bossOffice, FLOOR_TILES.boss],
      [cfg.serverRoom, FLOOR_TILES.server],
      [cfg.archives, FLOOR_TILES.archives],
      [cfg.lounge, FLOOR_TILES.lounge],
      [cfg.restrooms, FLOOR_TILES.restroom],
      [cfg.hallway, FLOOR_TILES.hallway],
    ];

    for (const room of cfg.meetingRooms) {
      roomFloors.push([room, FLOOR_TILES.meeting]);
    }
    if (cfg.breakRoom) {
      roomFloors.push([cfg.breakRoom, FLOOR_TILES.break]);
    }

    for (const [room, floorIdx] of roomFloors) {
      if (!room) continue;
      for (let r = room.row; r < room.row + room.h; r++) {
        for (let c = room.col; c < room.col + room.w; c++) {
          if (r >= 0 && r < cfg.rows && c >= 0 && c < cfg.cols) {
            floorMap[r][c] = floorIdx;
          }
        }
      }
    }

    // Draw floor tiles
    for (let r = 0; r < cfg.rows; r++) {
      for (let c = 0; c < cfg.cols; c++) {
        const idx = floorMap[r][c];
        const img = s.floorImages[idx];
        if (img && s.floorLoaded[idx]) {
          ctx.drawImage(
            img,
            offsetX + c * tileS,
            offsetY + r * tileS,
            tileS,
            tileS,
          );
        } else {
          // Fallback color
          ctx.fillStyle = idx === 0 ? "#c8b898" : idx === 1 ? "#b8a888" : "#a09080";
          ctx.fillRect(offsetX + c * tileS, offsetY + r * tileS, tileS, tileS);
        }
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Wall drawing                                                     */
  /* ---------------------------------------------------------------- */

  function drawWalls(
    ctx: CanvasRenderingContext2D,
    s: typeof stateRef.current,
    cfg: OfficeConfig,
    offsetX: number,
    offsetY: number,
    zoom: number,
  ) {
    const tileS = TILE * zoom;
    const tilemapData = generateTilemapJSON(cfg, cfg.desks.length);
    const wallsLayer = tilemapData.layers.find((l) => l.name === "walls");
    if (!wallsLayer) return;

    // wall_0.png is 64x128 => 4 cols x 4 rows of 16x32 wall tiles
    // We'll use a simpler approach: draw wall cells as colored rects
    // with the tileset if available
    if (s.tilesetLoaded && s.tilesetImage) {
      for (let r = 0; r < wallsLayer.height; r++) {
        for (let c = 0; c < wallsLayer.width; c++) {
          const gid = wallsLayer.data[r * wallsLayer.width + c];
          if (gid === 0) continue;
          const tileIndex = gid - 1;
          const srcCol = tileIndex % 8;
          const srcRow = Math.floor(tileIndex / 8);
          ctx.drawImage(
            s.tilesetImage,
            srcCol * 32,
            srcRow * 32,
            32,
            32,
            offsetX + c * tileS,
            offsetY + r * tileS,
            tileS,
            tileS,
          );
        }
      }
    } else {
      // Fallback: colored rects
      for (let r = 0; r < wallsLayer.height; r++) {
        for (let c = 0; c < wallsLayer.width; c++) {
          const gid = wallsLayer.data[r * wallsLayer.width + c];
          if (gid === 0) continue;
          ctx.fillStyle = "#6a5a4a";
          ctx.fillRect(offsetX + c * tileS, offsetY + r * tileS, tileS, tileS);
        }
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Speech bubbles                                                   */
  /* ---------------------------------------------------------------- */

  function drawBubbles(
    ctx: CanvasRenderingContext2D,
    s: typeof stateRef.current,
    offsetX: number,
    offsetY: number,
    zoom: number,
  ) {
    for (const ch of s.chars.values()) {
      if (!ch.bubbleText) continue;

      const bx = Math.round(offsetX + ch.x * zoom);
      const by = Math.round(
        offsetY + (ch.y - TILE) * zoom - (ch.sitting ? 0 : 4 * zoom),
      );

      const fontSize = Math.max(8, zoom * 4);
      ctx.font = `${fontSize}px sans-serif`;
      const metrics = ctx.measureText(ch.bubbleText);
      const textW = metrics.width;
      const textH = fontSize + 2;
      const padX = 4 * zoom;
      const padY = 2 * zoom;
      const boxW = textW + padX * 2;
      const boxH = textH + padY * 2;
      const boxX = bx - boxW / 2;
      const boxY = by - boxH;

      // Background
      ctx.fillStyle = "rgba(40, 40, 50, 0.85)";
      const radius = 3 * zoom;
      roundRect(ctx, boxX, boxY, boxW, boxH, radius);
      ctx.fill();

      // Pointer triangle
      ctx.beginPath();
      ctx.moveTo(bx - 3 * zoom, boxY + boxH);
      ctx.lineTo(bx, boxY + boxH + 3 * zoom);
      ctx.lineTo(bx + 3 * zoom, boxY + boxH);
      ctx.closePath();
      ctx.fill();

      // Text
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ch.bubbleText, bx, boxY + boxH / 2);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Room labels                                                      */
  /* ---------------------------------------------------------------- */

  function drawRoomLabels(
    ctx: CanvasRenderingContext2D,
    cfg: OfficeConfig,
    offsetX: number,
    offsetY: number,
    zoom: number,
  ) {
    const fontSize = Math.max(6, zoom * 3);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = "rgba(120, 100, 80, 0.7)";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";

    const tileS = TILE * zoom;

    const labels: Array<[RoomRect | null, string]> = [
      [cfg.bossOffice, "Boss Office"],
      [cfg.serverRoom, "Server Room"],
      [cfg.archives, "Archives"],
      [cfg.lounge, "Lounge"],
      [cfg.restrooms, "Restrooms"],
      [cfg.breakRoom, "Kitchen & Lounge"],
    ];
    for (let i = 0; i < cfg.meetingRooms.length; i++) {
      labels.push([cfg.meetingRooms[i], `Meeting ${i + 1}`]);
    }

    for (const [room, text] of labels) {
      if (!room) continue;
      ctx.fillText(
        text,
        offsetX + room.col * tileS + 2,
        offsetY + room.row * tileS - 1,
      );
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Name labels                                                      */
  /* ---------------------------------------------------------------- */

  function drawNameLabels(
    ctx: CanvasRenderingContext2D,
    s: typeof stateRef.current,
    offsetX: number,
    offsetY: number,
    zoom: number,
  ) {
    const fontSize = Math.max(6, zoom * 3);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    for (const ch of s.chars.values()) {
      const sx = Math.round(offsetX + ch.x * zoom);
      const sy = Math.round(
        offsetY + (ch.y + (ch.sitting ? SITTING_OFFSET : 0)) * zoom + 2,
      );

      const name = ch.displayName;
      const metrics = ctx.measureText(name);
      const tw = metrics.width;
      const padX = 2 * zoom;
      const padY = 1 * zoom;

      // Background
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.fillRect(
        sx - tw / 2 - padX,
        sy - padY,
        tw + padX * 2,
        fontSize + padY * 2,
      );

      // Text
      ctx.fillStyle = "#3a3a3a";
      ctx.fillText(name, sx, sy);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */

  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ---------------------------------------------------------------- */
  /*  Setup effect                                                     */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = stateRef.current;

    // Load assets
    loadAssets();

    // Initial office config
    const teamSize = snapshotRef.current?.agents.length ?? 4;
    s.officeConfig = generateOfficeConfig(Math.max(teamSize, 4));
    rebuildCollision(s);
    rebuildFurniture(s);

    // Resize handling
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = 1; // Use 1 for pixel-perfect rendering
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // Game loop
    let rafId = 0;
    let stopped = false;

    const frame = (time: number) => {
      if (stopped) return;

      const dt =
        s.lastTime === 0
          ? 0
          : Math.min((time - s.lastTime) / 1000, 0.1);
      s.lastTime = time;

      // Sync agents from React state
      syncAgents();

      // Update
      update(dt);

      // Render
      ctx.imageSmoothingEnabled = false;
      render(ctx);

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [loadAssets, syncAgents, update, render]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", overflow: "hidden" }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", imageRendering: "pixelated" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collision & furniture rebuild (shared helpers)                      */
/* ------------------------------------------------------------------ */

function rebuildCollision(s: {
  officeConfig: OfficeConfig | null;
  collisionBlocked: Set<string>;
}) {
  if (!s.officeConfig) return;
  const cfg = s.officeConfig;
  const tilemapData = generateTilemapJSON(cfg, cfg.desks.length);
  const collisionLayer = tilemapData.layers.find(
    (l) => l.name === "collision",
  );
  if (!collisionLayer) return;

  s.collisionBlocked = new Set<string>();
  for (let r = 0; r < collisionLayer.height; r++) {
    for (let c = 0; c < collisionLayer.width; c++) {
      if (collisionLayer.data[r * collisionLayer.width + c] !== 0) {
        s.collisionBlocked.add(`${r},${c}`);
      }
    }
  }
}

function rebuildFurniture(s: {
  officeConfig: OfficeConfig | null;
  furnitureItems: FurnitureDraw[];
}) {
  if (!s.officeConfig) return;
  const cfg = s.officeConfig;
  const tilemapData = generateTilemapJSON(cfg, cfg.desks.length);
  const furnitureLayer = tilemapData.layers.find(
    (l) => l.name === "furniture",
  );
  if (!furnitureLayer) return;

  s.furnitureItems = [];
  for (let r = 0; r < furnitureLayer.height; r++) {
    for (let c = 0; c < furnitureLayer.width; c++) {
      const gid = furnitureLayer.data[r * furnitureLayer.width + c];
      if (gid !== 0) {
        s.furnitureItems.push({
          tileGid: gid,
          row: r,
          col: c,
          zY: (r + 1) * TILE, // bottom of tile
        });
      }
    }
  }
}
