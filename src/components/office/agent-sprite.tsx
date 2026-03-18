import Image from "next/image";

import type { AgentState } from "@/lib/types";
import { STATE_BUBBLES } from "@/lib/state/office-layout";

interface AgentSpriteProps {
  displayName: string;
  state: AgentState;
  row: number;
  col: number;
  color: string; // Primary shirt/body color
  entryDelay?: number;
}

const CELL_SIZE = 32;

// Each agent gets a unique appearance based on their color
const AGENT_APPEARANCES: Record<string, { hair: string; skin: string; pants: string }> = {
  "#4a90d9": { hair: "#3a2a1a", skin: "#f0c8a0", pants: "#3a5a8a" }, // Avery: brown hair, blue shirt
  "#d97a4a": { hair: "#8a3a1a", skin: "#e8c090", pants: "#5a4a3a" }, // Morgan: red hair, orange shirt
  "#5aaa6a": { hair: "#1a1a2a", skin: "#d4a878", pants: "#3a6a4a" }, // Taylor: dark hair, green shirt
  "#9a6abd": { hair: "#6a4a2a", skin: "#f0d0a8", pants: "#5a3a6a" }, // Jordan: light brown hair, purple shirt
  "#d9a04a": { hair: "#2a2a2a", skin: "#c8a070", pants: "#6a5a2a" }, // Riley: black hair, gold shirt
};

function getAppearance(color: string) {
  return AGENT_APPEARANCES[color] ?? { hair: "#3a2a1a", skin: "#f0c8a0", pants: "#4a4a5a" };
}

// Pixel-art character SVG in 3/4 GBA style (facing down/front)
function PixelCharacter({ color, size = 40 }: { color: string; size?: number }) {
  const { hair, skin, pants } = getAppearance(color);

  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 16 20"
      style={{ imageRendering: "pixelated" }}
    >
      {/* Hair (top of head) */}
      <rect x="4" y="0" width="8" height="4" rx="1" fill={hair} />
      <rect x="3" y="2" width="10" height="2" fill={hair} />

      {/* Face / Head */}
      <rect x="4" y="3" width="8" height="6" rx="1" fill={skin} />

      {/* Eyes */}
      <rect x="5" y="5" width="2" height="2" rx="0.5" fill="#2a2a2a" />
      <rect x="9" y="5" width="2" height="2" rx="0.5" fill="#2a2a2a" />
      {/* Eye highlights */}
      <rect x="5.5" y="5" width="1" height="1" fill="#ffffff" opacity="0.6" />
      <rect x="9.5" y="5" width="1" height="1" fill="#ffffff" opacity="0.6" />

      {/* Mouth (small smile) */}
      <rect x="6" y="7.5" width="4" height="0.5" rx="0.25" fill="#b8846a" />

      {/* Shirt / Body */}
      <rect x="3" y="9" width="10" height="6" rx="1" fill={color} />
      {/* Shirt collar detail */}
      <rect x="6" y="9" width="4" height="1.5" fill={color} opacity="0.8" />
      <rect x="7" y="9" width="2" height="2" fill={skin} />

      {/* Arms */}
      <rect x="1" y="10" width="3" height="4" rx="1" fill={color} />
      <rect x="12" y="10" width="3" height="4" rx="1" fill={color} />
      {/* Hands */}
      <rect x="1" y="13" width="2" height="2" rx="0.5" fill={skin} />
      <rect x="13" y="13" width="2" height="2" rx="0.5" fill={skin} />

      {/* Pants */}
      <rect x="4" y="14" width="8" height="3" fill={pants} />

      {/* Legs / Shoes */}
      <rect x="4" y="17" width="3" height="3" rx="0.5" fill="#4a3a2a" />
      <rect x="9" y="17" width="3" height="3" rx="0.5" fill="#4a3a2a" />
    </svg>
  );
}

// Sitting version (for desk work) — slightly compressed, no visible legs
function PixelCharacterSitting({ color, size = 36 }: { color: string; size?: number }) {
  const { hair, skin } = getAppearance(color);

  return (
    <svg
      width={size}
      height={size * 0.9}
      viewBox="0 0 16 14"
      style={{ imageRendering: "pixelated" }}
    >
      {/* Hair */}
      <rect x="4" y="0" width="8" height="3" rx="1" fill={hair} />
      <rect x="3" y="1" width="10" height="2" fill={hair} />

      {/* Face */}
      <rect x="4" y="2" width="8" height="5" rx="1" fill={skin} />

      {/* Eyes */}
      <rect x="5" y="4" width="2" height="2" rx="0.5" fill="#2a2a2a" />
      <rect x="9" y="4" width="2" height="2" rx="0.5" fill="#2a2a2a" />
      <rect x="5.5" y="4" width="1" height="1" fill="#ffffff" opacity="0.6" />
      <rect x="9.5" y="4" width="1" height="1" fill="#ffffff" opacity="0.6" />

      {/* Mouth */}
      <rect x="6" y="6" width="4" height="0.5" rx="0.25" fill="#b8846a" />

      {/* Body (shirt) */}
      <rect x="3" y="7" width="10" height="5" rx="1" fill={color} />
      {/* Collar */}
      <rect x="7" y="7" width="2" height="1.5" fill={skin} />

      {/* Arms resting on desk */}
      <rect x="1" y="8" width="3" height="3" rx="1" fill={color} />
      <rect x="12" y="8" width="3" height="3" rx="1" fill={color} />
      <rect x="1" y="10" width="2" height="2" rx="0.5" fill={skin} />
      <rect x="13" y="10" width="2" height="2" rx="0.5" fill={skin} />
    </svg>
  );
}

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
  const isSitting = state !== "meeting";

  return (
    <div
      className="agent-enter absolute flex flex-col items-center"
      style={{
        top,
        left,
        width: CELL_SIZE * 2,
        transition: "top 0.8s ease-in-out, left 0.8s ease-in-out",
        animationDelay: `${entryDelay}ms`,
        zIndex: row, // agents lower on screen render in front
      }}
    >
      {/* State bubble */}
      {bubble && (
        <div className="mb-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 shadow-sm">
          <Image
            src={`/sprites/bubbles/${bubble}.svg`}
            alt={bubble}
            width={12}
            height={12}
          />
        </div>
      )}

      {/* Pixel-art character */}
      {isSitting ? (
        <PixelCharacterSitting color={color} size={32} />
      ) : (
        <PixelCharacter color={color} size={28} />
      )}

      {/* Name label */}
      <span
        className="mt-0.5 rounded-sm bg-white/70 px-1 text-[8px] font-medium leading-tight text-[var(--foreground)]"
        style={{ textShadow: "0 0 2px rgba(255,255,255,0.8)" }}
      >
        {displayName}
      </span>
    </div>
  );
}
