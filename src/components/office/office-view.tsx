import type { WorkspaceSnapshot } from "@/lib/types";
import { agentGridPosition } from "@/lib/state/office-layout";
import { AgentSprite } from "./agent-sprite";
import { Furniture } from "./furniture";
import { MeetingBubble } from "./meeting-bubble";

interface OfficeViewProps {
  snapshot: WorkspaceSnapshot | null;
}

const COLS = 22;
const ROWS = 14;
const CELL = 32;
const WIDTH = COLS * CELL;
const HEIGHT = ROWS * CELL;

// Agent display colors (warm, distinct, friendly)
const AGENT_COLORS = ["#4a90d9", "#d97a4a", "#5aaa6a", "#9a6abd", "#d9a04a"];

export function OfficeView({ snapshot }: OfficeViewProps) {
  return (
    <div
      className="office-container relative mx-auto overflow-hidden rounded-xl"
      style={{ width: WIDTH, height: HEIGHT }}
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

      {/* Back wall (rows 0-2) */}
      <div
        className="absolute left-0 right-0 top-0"
        style={{
          height: CELL * 2.5,
          backgroundColor: "#f0ebe3",
          borderBottom: "3px solid #c4b498",
        }}
      />

      {/* Wall furniture */}
      <Furniture type="window" row={0.5} col={2} />
      <Furniture type="window" row={0.5} col={6} />
      <Furniture type="window" row={0.5} col={11} />
      <Furniture type="clock" row={0.5} col={16} />
      <Furniture type="poster" row={0.5} col={19} />

      {/* Desks */}
      <Furniture type="desk" row={3} col={2} />
      <Furniture type="desk" row={3} col={7} />
      <Furniture type="desk" row={3} col={12} />
      <Furniture type="desk" row={6} col={2} />
      <Furniture type="desk" row={6} col={7} />

      {/* Decorations */}
      <Furniture type="coffee" row={3} col={19} />
      <Furniture type="plant" row={6} col={15} />
      <Furniture type="plant" row={12} col={19} />
      <Furniture type="whiteboard" row={8.5} col={15} />

      {/* Meeting room */}
      <Furniture type="meeting-table" row={10} col={7} />

      {/* Meeting room subtle floor tint */}
      <div
        className="absolute rounded-lg"
        style={{
          top: CELL * 9,
          left: CELL * 5,
          width: CELL * 8,
          height: CELL * 4.5,
          backgroundColor: "rgba(180, 160, 130, 0.15)",
          border: "1px dashed rgba(0,0,0,0.06)",
        }}
      />

      {/* Agents — staggered entry: 500ms between each */}
      {snapshot?.agents.map((agent, index) => {
        const pos = agentGridPosition(index, agent.state);
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
      {snapshot?.activeMeeting && (
        <MeetingBubble
          title={snapshot.activeMeeting.title}
          row={9}
          col={8}
        />
      )}
    </div>
  );
}
