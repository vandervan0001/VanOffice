import type { AgentState, WorkspaceSnapshot } from "@/lib/types";

export interface OfficeRoom {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
}

export interface AgentPlacement {
  agentId: string;
  label: string;
  role: string;
  state: AgentState;
  x: number;
  y: number;
  color: number;
}

export const OFFICE_ROOMS: OfficeRoom[] = [
  { id: "planning", label: "War Room", x: 24, y: 24, width: 220, height: 140, color: 0x2a5c8f },
  { id: "researching", label: "Research Desk", x: 272, y: 24, width: 220, height: 140, color: 0x2f7d4b },
  { id: "writing", label: "Writing Bay", x: 24, y: 196, width: 220, height: 140, color: 0x9c6935 },
  { id: "meeting", label: "Meeting Room", x: 272, y: 196, width: 220, height: 140, color: 0x7e4fa0 },
  { id: "waiting_for_approval", label: "Approval Queue", x: 520, y: 24, width: 160, height: 140, color: 0x7c5d2d },
  { id: "done", label: "Completed", x: 520, y: 196, width: 160, height: 140, color: 0x4b6b79 },
  { id: "idle", label: "Bench", x: 520, y: 356, width: 160, height: 92, color: 0x475569 },
];

function roomForState(state: AgentState) {
  return OFFICE_ROOMS.find((room) => room.id === state) ?? OFFICE_ROOMS[0];
}

export function deriveAgentPlacements(snapshot: WorkspaceSnapshot): AgentPlacement[] {
  const counters = new Map<string, number>();

  return snapshot.agents.map((agent, index) => {
    const room = roomForState(agent.state);
    const used = counters.get(room.id) ?? 0;
    counters.set(room.id, used + 1);

    return {
      agentId: agent.agentId,
      label: agent.displayName,
      role: agent.title,
      state: agent.state,
      x: room.x + 38 + (used % 2) * 72,
      y: room.y + 44 + Math.floor(used / 2) * 58 + index * 0,
      color:
        agent.state === "meeting"
          ? 0xffd166
          : agent.state === "researching"
            ? 0x80ed99
            : agent.state === "writing"
              ? 0xffb703
              : 0x8ecae6,
    };
  });
}
