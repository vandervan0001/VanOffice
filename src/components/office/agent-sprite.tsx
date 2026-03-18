import Image from "next/image";

import type { AgentState } from "@/lib/types";
import { STATE_BUBBLES } from "@/lib/state/office-layout";

interface AgentSpriteProps {
  displayName: string;
  state: AgentState;
  row: number;
  col: number;
  color: string; // CSS color for the agent token fallback
  entryDelay?: number; // ms delay for staggered entry animation
}

const CELL_SIZE = 32;

export function AgentSprite({
  displayName,
  state,
  row,
  col,
  color,
  entryDelay = 0,
}: AgentSpriteProps) {
  const bubble = STATE_BUBBLES[state];
  const top = row * CELL_SIZE;
  const left = col * CELL_SIZE;

  return (
    <div
      className="agent-enter absolute flex flex-col items-center"
      style={{
        top,
        left,
        width: CELL_SIZE * 2,
        transition: "top 0.8s ease-in-out, left 0.8s ease-in-out",
        animationDelay: `${entryDelay}ms`,
      }}
    >
      {/* State bubble */}
      {bubble && (
        <div className="mb-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 shadow-sm">
          <Image
            src={`/sprites/bubbles/${bubble}.svg`}
            alt={bubble}
            width={16}
            height={16}
          />
        </div>
      )}

      {/* Agent body — CSS fallback, swap for LPC sprite later */}
      <div
        className="flex h-10 w-8 items-center justify-center rounded-md text-[10px] font-bold text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        {displayName.slice(0, 2).toUpperCase()}
      </div>

      {/* Name label */}
      <span className="mt-0.5 text-[9px] font-medium text-[var(--foreground)]">
        {displayName}
      </span>
    </div>
  );
}
