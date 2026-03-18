import { useMemo } from "react";

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

  const WIDTH = config.cols * CELL;
  const HEIGHT = config.rows * CELL;

  return (
    <div
      className="office-container relative mx-auto overflow-hidden rounded-xl"
      style={{ width: WIDTH, height: HEIGHT, minHeight: 448 }}
    >
      {/* Floor: warm parquet */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#e8d8c0",
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent, transparent 31px, rgba(0,0,0,0.03) 31px, rgba(0,0,0,0.03) 32px), repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(0,0,0,0.03) 31px, rgba(0,0,0,0.03) 32px)",
        }}
      />

      {/* Back wall */}
      <div
        className="absolute left-0 right-0 top-0"
        style={{
          height: CELL * 2.5,
          backgroundColor: "#f0ebe3",
          borderBottom: "3px solid #c4b498",
        }}
      />

      {/* Wall furniture — scales with office width */}
      <Furniture type="window" row={0.5} col={2} />
      <Furniture type="window" row={0.5} col={6} />
      <Furniture type="window" row={0.5} col={11} />
      <Furniture type="clock" row={0.5} col={16} />
      <Furniture type="poster" row={0.5} col={19} />

      {/* Dynamic desks based on team size */}
      {config.desks.map((desk, i) => (
        <Furniture key={`desk-${i}`} type="desk" row={desk.row - 1} col={desk.col - 1} />
      ))}

      {/* Static decorations */}
      <Furniture type="coffee" row={3} col={19} />
      <Furniture type="plant" row={3} col={17} />
      {teamSize > 3 && <Furniture type="plant" row={6} col={17} />}
      {teamSize > 6 && <Furniture type="plant" row={9} col={17} />}

      {/* Task board on the wall */}
      <Furniture type="whiteboard" row={3} col={config.cols - 5} />

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
              backgroundColor: "rgba(180, 160, 130, 0.15)",
              border: "1px dashed rgba(0,0,0,0.06)",
            }}
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
              backgroundColor: "rgba(160, 180, 160, 0.12)",
              border: "1px dashed rgba(0,0,0,0.05)",
            }}
          />
          <Furniture type="coffee" row={config.breakRoom.row + 0.5} col={config.breakRoom.col + 1} />
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
  );
}
