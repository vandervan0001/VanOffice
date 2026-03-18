import { useEffect, useMemo, useRef } from "react";

import type { WorkspaceSnapshot } from "@/lib/types";
import { agentGridPosition, generateOfficeConfig } from "@/lib/state/office-layout";
import { AgentSprite } from "./agent-sprite";
import { Furniture } from "./furniture";
import { MeetingBubble } from "./meeting-bubble";

interface OfficeViewProps {
  snapshot: WorkspaceSnapshot | null;
}

const CELL = 32;

// Agent display colors — enough for 20 agents
const AGENT_COLORS = [
  "#4a90d9", "#d97a4a", "#5aaa6a", "#9a6abd", "#d9a04a",
  "#d94a6a", "#4ab8d9", "#8aaa4a", "#6a5abd", "#d98a4a",
  "#4a7ad9", "#aa5a8a", "#5a9a8a", "#ba7a4a", "#6a8abd",
  "#4ad97a", "#d96a8a", "#8a6ad9", "#7aba5a", "#d9ba4a",
];

export function OfficeView({ snapshot }: OfficeViewProps) {
  const teamSize = snapshot?.agents.length ?? 0;
  const config = useMemo(() => generateOfficeConfig(Math.max(teamSize, 4)), [teamSize]);
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const WIDTH = config.cols * CELL;
  const HEIGHT = config.rows * CELL;

  // Auto-scale the pixel grid to fit the container
  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    function fit() {
      const cw = container!.clientWidth;
      const ch = container!.clientHeight;
      if (!cw || !ch) return;
      const scale = Math.min(cw / WIDTH, ch / HEIGHT);
      inner!.style.transform = `scale(${scale})`;
    }

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [WIDTH, HEIGHT]);

  return (
    <div
      ref={containerRef}
      className="office-container relative h-full w-full overflow-hidden"
    >
      {/* Inner scaled container — maintains pixel grid, scales to fit */}
      <div
        ref={innerRef}
        className="origin-top-left"
        style={{ width: WIDTH, height: HEIGHT }}
      >
      {/* Floor: warm parquet with grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#e0c898",
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent, transparent 31px, rgba(0,0,0,0.04) 31px, rgba(0,0,0,0.04) 32px), repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(0,0,0,0.04) 31px, rgba(0,0,0,0.04) 32px)",
        }}
      />

      {/* Sunlight gradient overlay from windows — lighter near top-left */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 25% 0%, rgba(255,220,120,0.18) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 65% 0%, rgba(255,210,100,0.12) 0%, transparent 60%)",
        }}
      />

      {/* Back wall — warmer color with subtle wallpaper texture */}
      <div
        className="absolute left-0 right-0 top-0"
        style={{
          height: CELL * 2.5,
          backgroundColor: "#f2e4d0",
          backgroundImage:
            "repeating-linear-gradient(135deg, transparent, transparent 16px, rgba(200,150,80,0.06) 16px, rgba(200,150,80,0.06) 17px), repeating-linear-gradient(45deg, transparent, transparent 16px, rgba(200,150,80,0.06) 16px, rgba(200,150,80,0.06) 17px)",
          borderBottom: "3px solid #c8a870",
        }}
      />

      {/* Baseboard — thin darker strip at wall/floor boundary */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: CELL * 2.5 + 3,
          height: 5,
          backgroundColor: "#a07840",
          opacity: 0.55,
        }}
      />

      {/* Wall furniture — on the back wall only (row 0-2), no overlap risk */}
      <Furniture type="window" row={0.5} col={1} />
      <Furniture type="window" row={0.5} col={5} />
      <Furniture type="window" row={0.5} col={9} />
      <Furniture type="clock" row={0.5} col={13} />
      <Furniture type="poster" row={0.5} col={15} />
      <Furniture type="monitor-big" row={-0.5} col={17} />

      {/* Dynamic desks — placed first so decorations avoid them */}
      {config.desks.map((desk, i) => (
        <Furniture key={`desk-${i}`} type="desk" row={desk.row - 1} col={desk.col - 1} />
      ))}

      {/* Right-side utility corridor (col 17-21) — below the wall */}
      <Furniture type="whiteboard" row={3} col={17} />
      <Furniture type="coffee" row={4.5} col={18} />
      <Furniture type="water-cooler" row={4.5} col={20} />
      <Furniture type="printer" row={7} col={18} />
      <Furniture type="filing-cabinet" row={7} col={21} />
      <Furniture type="lamp" row={9} col={21} />

      {/* Plants — tucked into corners and gaps, away from desks */}
      <Furniture type="plant" row={3} col={0} />
      <Furniture type="plant" row={3} col={16} />
      {teamSize > 5 && <Furniture type="plant" row={6} col={0} />}
      {teamSize > 5 && <Furniture type="plant" row={6} col={16} />}
      {teamSize > 9 && <Furniture type="plant" row={9} col={0} />}

      {/* Bookshelf — along the wall ABOVE the first desk row */}
      <Furniture type="bookshelf" row={3} col={1} />

      {/* Meeting rooms */}
      {config.meetingRooms.map((room, i) => (
        <div key={`meeting-room-${i}`}>
          {/* Room floor tint */}
          <div
            className="absolute rounded-lg"
            style={{
              top: room.row * CELL,
              left: room.col * CELL,
              width: room.w * CELL,
              height: room.h * CELL,
              backgroundColor: "rgba(160, 130, 100, 0.12)",
              border: "1px dashed rgba(160,120,60,0.18)",
            }}
          />
          {/* Rug under meeting table */}
          <Furniture
            type="rug"
            row={room.row + 0.3}
            col={room.col + (room.w - 3) / 2}
          />
          {/* Table */}
          <Furniture
            type="meeting-table"
            row={room.row + 0.5}
            col={room.col + (room.w - 4) / 2}
          />
        </div>
      ))}

      {/* Break room */}
      {config.breakRoom && (
        <div>
          <div
            className="absolute rounded-lg"
            style={{
              top: config.breakRoom.row * CELL,
              left: config.breakRoom.col * CELL,
              width: config.breakRoom.w * CELL,
              height: config.breakRoom.h * CELL,
              backgroundColor: "rgba(120, 180, 140, 0.1)",
              border: "1px dashed rgba(80,160,100,0.12)",
            }}
          />
          <Furniture type="coffee" row={config.breakRoom.row + 0.5} col={config.breakRoom.col + 1} />
          <Furniture type="couch" row={config.breakRoom.row + 1.5} col={config.breakRoom.col + 2} />
          <Furniture type="plant" row={config.breakRoom.row + 0.5} col={config.breakRoom.col + 4} />
          {/* Break room label */}
          <div
            className="absolute text-[8px] font-medium text-[var(--text-muted)]"
            style={{
              top: config.breakRoom.row * CELL - 12,
              left: config.breakRoom.col * CELL,
            }}
          >
            Break Room
          </div>
        </div>
      )}

      {/* Agents */}
      {snapshot?.agents.map((agent, index) => {
        const pos = agentGridPosition(index, agent.state, config);
        return (
          <AgentSprite
            key={agent.agentId}
            displayName={agent.displayName}
            state={agent.state}
            row={pos.row}
            col={pos.col}
            color={AGENT_COLORS[index % AGENT_COLORS.length]}
            entryDelay={index * 500}
            agentIndex={index}
          />
        );
      })}

      {/* Meeting bubble */}
      {snapshot?.activeMeeting && config.meetingRooms[0] && (
        <MeetingBubble
          title={snapshot.activeMeeting.title}
          row={config.meetingRooms[0].row}
          col={config.meetingRooms[0].col + 2}
        />
      )}
      </div>
    </div>
  );
}
