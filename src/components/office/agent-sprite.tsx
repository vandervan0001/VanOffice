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
  agentIndex?: number;
}

const CELL_SIZE = 32;

// Extended appearances — skin tones, hair styles, pants colors
interface AgentAppearance {
  hair: string;
  skin: string;
  pants: string;
  hairStyle: "short" | "long" | "bald" | "ponytail";
  accessory: "none" | "glasses" | "hat" | "tie";
}

// Deterministic appearance based on color/index
const AGENT_APPEARANCES: Record<string, AgentAppearance> = {
  "#4a90d9": { hair: "#3a2a1a", skin: "#f0c8a0", pants: "#2a4a7a", hairStyle: "short", accessory: "glasses" },
  "#d97a4a": { hair: "#8a2a1a", skin: "#e8c090", pants: "#5a3a1a", hairStyle: "long", accessory: "none" },
  "#5aaa6a": { hair: "#1a1a1a", skin: "#c8906a", pants: "#2a5a3a", hairStyle: "short", accessory: "tie" },
  "#9a6abd": { hair: "#6a3a1a", skin: "#f0d0a8", pants: "#4a2a6a", hairStyle: "ponytail", accessory: "none" },
  "#d9a04a": { hair: "#1a1a1a", skin: "#b87840", pants: "#5a4a1a", hairStyle: "bald", accessory: "glasses" },
  "#d94a6a": { hair: "#4a1a4a", skin: "#f0bea8", pants: "#6a2a4a", hairStyle: "long", accessory: "none" },
  "#4ab8d9": { hair: "#2a2a3a", skin: "#d4a878", pants: "#2a6a7a", hairStyle: "short", accessory: "hat" },
  "#8aaa4a": { hair: "#4a3a1a", skin: "#e8c090", pants: "#4a5a1a", hairStyle: "ponytail", accessory: "none" },
  "#6a5abd": { hair: "#1a1a2a", skin: "#c89060", pants: "#3a2a6a", hairStyle: "short", accessory: "glasses" },
  "#d98a4a": { hair: "#6a3a1a", skin: "#f4cc98", pants: "#6a4a1a", hairStyle: "long", accessory: "tie" },
};

function getAppearance(color: string, index = 0): AgentAppearance {
  if (AGENT_APPEARANCES[color]) return AGENT_APPEARANCES[color];
  // Fallback deterministic from index
  const hairStyles: AgentAppearance["hairStyle"][] = ["short", "long", "bald", "ponytail"];
  const accessories: AgentAppearance["accessory"][] = ["none", "glasses", "tie", "hat", "none"];
  const skins = ["#f0c8a0", "#e8b880", "#d4a060", "#c88850", "#b87040"];
  const hairs = ["#1a1a1a", "#4a3a1a", "#8a3a1a", "#6a4a1a", "#2a2a3a"];
  const pantsColors = ["#3a4a6a", "#4a3a2a", "#2a4a3a", "#4a3a4a", "#5a4a2a"];
  return {
    hair: hairs[index % hairs.length],
    skin: skins[index % skins.length],
    pants: pantsColors[index % pantsColors.length],
    hairStyle: hairStyles[index % hairStyles.length],
    accessory: accessories[index % accessories.length],
  };
}

// Hair shapes
function HairStanding({ hairStyle, hair, skin }: { hairStyle: AgentAppearance["hairStyle"]; hair: string; skin: string }) {
  if (hairStyle === "bald") {
    return (
      <>
        <rect x="4" y="1" width="8" height="2" rx="1" fill={skin} opacity="0.4" />
      </>
    );
  }
  if (hairStyle === "long") {
    return (
      <>
        <rect x="4" y="0" width="8" height="4" rx="1" fill={hair} />
        <rect x="3" y="1" width="10" height="3" fill={hair} />
        {/* Long hair hanging sides */}
        <rect x="3" y="3" width="2" height="6" rx="1" fill={hair} />
        <rect x="11" y="3" width="2" height="6" rx="1" fill={hair} />
      </>
    );
  }
  if (hairStyle === "ponytail") {
    return (
      <>
        <rect x="4" y="0" width="8" height="4" rx="1" fill={hair} />
        <rect x="3" y="1" width="10" height="3" fill={hair} />
        {/* Ponytail */}
        <rect x="11" y="2" width="3" height="5" rx="1" fill={hair} />
        <rect x="13" y="5" width="2" height="3" rx="1" fill={hair} />
      </>
    );
  }
  // Default: short
  return (
    <>
      <rect x="4" y="0" width="8" height="4" rx="1" fill={hair} />
      <rect x="3" y="2" width="10" height="2" fill={hair} />
    </>
  );
}

function HairSitting({ hairStyle, hair, skin }: { hairStyle: AgentAppearance["hairStyle"]; hair: string; skin: string }) {
  if (hairStyle === "bald") {
    return <rect x="4" y="1" width="8" height="1" rx="0.5" fill={skin} opacity="0.3" />;
  }
  if (hairStyle === "long") {
    return (
      <>
        <rect x="4" y="0" width="8" height="3" rx="1" fill={hair} />
        <rect x="3" y="1" width="10" height="2" fill={hair} />
        <rect x="3" y="2" width="2" height="5" rx="1" fill={hair} />
        <rect x="11" y="2" width="2" height="5" rx="1" fill={hair} />
      </>
    );
  }
  if (hairStyle === "ponytail") {
    return (
      <>
        <rect x="4" y="0" width="8" height="3" rx="1" fill={hair} />
        <rect x="3" y="1" width="10" height="2" fill={hair} />
        <rect x="11" y="1" width="3" height="4" rx="1" fill={hair} />
      </>
    );
  }
  return (
    <>
      <rect x="4" y="0" width="8" height="3" rx="1" fill={hair} />
      <rect x="3" y="1" width="10" height="2" fill={hair} />
    </>
  );
}

function Accessory({ accessory, color }: { accessory: AgentAppearance["accessory"]; color: string }) {
  if (accessory === "glasses") {
    return (
      <>
        <rect x="4.5" y="5" width="3" height="2" rx="0.8" fill="none" stroke="#3a3a3a" strokeWidth="0.6" />
        <rect x="8.5" y="5" width="3" height="2" rx="0.8" fill="none" stroke="#3a3a3a" strokeWidth="0.6" />
        <line x1="7.5" y1="6" x2="8.5" y2="6" stroke="#3a3a3a" strokeWidth="0.6" />
        <line x1="3" y1="6" x2="4.5" y2="6" stroke="#3a3a3a" strokeWidth="0.6" />
        <line x1="11.5" y1="6" x2="13" y2="6" stroke="#3a3a3a" strokeWidth="0.6" />
      </>
    );
  }
  if (accessory === "hat") {
    return (
      <>
        <rect x="3" y="0" width="10" height="2" rx="0.5" fill="#3a3a6a" />
        <rect x="4" y="-2" width="8" height="3" rx="0.5" fill="#4a4a8a" />
      </>
    );
  }
  if (accessory === "tie") {
    // Tie rendered on body area
    return (
      <>
        <polygon points="8,9 8.5,11 7.5,15 8.5,11 9,9" fill={color} opacity="0.3" />
        <rect x="7.5" y="9" width="1" height="6" rx="0.3" fill="#c84a3a" />
        <polygon points="7,14 8,16 9,14" fill="#c84a3a" />
      </>
    );
  }
  return null;
}

// Pixel-art character SVG — standing (meeting)
function PixelCharacter({ color, size = 40, appearance }: { color: string; size?: number; appearance: AgentAppearance }) {
  const { hair, skin, pants, hairStyle, accessory } = appearance;

  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 16 20"
      style={{ imageRendering: "pixelated" }}
    >
      {/* Hair */}
      <HairStanding hairStyle={hairStyle} hair={hair} skin={skin} />

      {/* Face / Head */}
      <rect x="4" y="3" width="8" height="6" rx="1" fill={skin} />

      {/* Eyes */}
      <rect x="5" y="5" width="2" height="2" rx="0.5" fill="#2a2a2a" />
      <rect x="9" y="5" width="2" height="2" rx="0.5" fill="#2a2a2a" />
      {/* Eye highlights */}
      <rect x="5.5" y="5" width="1" height="1" fill="#ffffff" opacity="0.6" />
      <rect x="9.5" y="5" width="1" height="1" fill="#ffffff" opacity="0.6" />

      {/* Accessories (glasses/hat) */}
      <Accessory accessory={accessory} color={color} />

      {/* Mouth (small smile) */}
      <rect x="6" y="7.5" width="4" height="0.5" rx="0.25" fill="#b8846a" />

      {/* Shirt / Body */}
      <rect x="3" y="9" width="10" height="6" rx="1" fill={color} />
      {/* Shirt highlight */}
      <rect x="3" y="9" width="3" height="6" rx="0.5" fill="#ffffff" opacity="0.12" />
      {/* Collar */}
      <rect x="7" y="9" width="2" height="2" fill={skin} />

      {/* Tie (if applicable) */}
      {accessory === "tie" && <Accessory accessory="tie" color={color} />}

      {/* Arms */}
      <rect x="1" y="10" width="3" height="4" rx="1" fill={color} />
      <rect x="12" y="10" width="3" height="4" rx="1" fill={color} />
      {/* Hands */}
      <rect x="1" y="13" width="2" height="2" rx="0.5" fill={skin} />
      <rect x="13" y="13" width="2" height="2" rx="0.5" fill={skin} />

      {/* Pants */}
      <rect x="4" y="14" width="8" height="3" fill={pants} />

      {/* Legs / Shoes */}
      <rect x="4" y="17" width="3" height="3" rx="0.5" fill="#2a2a2a" />
      <rect x="9" y="17" width="3" height="3" rx="0.5" fill="#2a2a2a" />
    </svg>
  );
}

// Sitting version (for desk work) — slightly compressed
function PixelCharacterSitting({ color, size = 36, appearance }: { color: string; size?: number; appearance: AgentAppearance }) {
  const { hair, skin, hairStyle, accessory } = appearance;

  return (
    <svg
      width={size}
      height={size * 0.9}
      viewBox="0 0 16 14"
      style={{ imageRendering: "pixelated" }}
    >
      {/* Hair */}
      <HairSitting hairStyle={hairStyle} hair={hair} skin={skin} />

      {/* Face */}
      <rect x="4" y="2" width="8" height="5" rx="1" fill={skin} />

      {/* Eyes */}
      <rect x="5" y="4" width="2" height="2" rx="0.5" fill="#2a2a2a" />
      <rect x="9" y="4" width="2" height="2" rx="0.5" fill="#2a2a2a" />
      <rect x="5.5" y="4" width="1" height="1" fill="#ffffff" opacity="0.6" />
      <rect x="9.5" y="4" width="1" height="1" fill="#ffffff" opacity="0.6" />

      {/* Accessories */}
      {accessory === "glasses" && (
        <>
          <rect x="4.5" y="4" width="3" height="2" rx="0.8" fill="none" stroke="#3a3a3a" strokeWidth="0.6" />
          <rect x="8.5" y="4" width="3" height="2" rx="0.8" fill="none" stroke="#3a3a3a" strokeWidth="0.6" />
          <line x1="7.5" y1="5" x2="8.5" y2="5" stroke="#3a3a3a" strokeWidth="0.6" />
        </>
      )}
      {accessory === "hat" && (
        <>
          <rect x="3" y="0" width="10" height="2" rx="0.5" fill="#3a3a6a" />
          <rect x="4" y="-1" width="8" height="2" rx="0.5" fill="#4a4a8a" />
        </>
      )}

      {/* Mouth */}
      <rect x="6" y="6" width="4" height="0.5" rx="0.25" fill="#b8846a" />

      {/* Body (shirt) */}
      <rect x="3" y="7" width="10" height="5" rx="1" fill={color} />
      {/* Shirt highlight */}
      <rect x="3" y="7" width="3" height="5" rx="0.5" fill="#ffffff" opacity="0.12" />
      {/* Collar */}
      <rect x="7" y="7" width="2" height="1.5" fill={skin} />

      {/* Tie on sitting */}
      {accessory === "tie" && (
        <rect x="7.5" y="8" width="1" height="4" rx="0.3" fill="#c84a3a" />
      )}

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
  agentIndex = 0,
}: AgentSpriteProps) {
  const bubble = STATE_BUBBLES[state];
  const top = row * CELL_SIZE;
  const left = col * CELL_SIZE;
  const isSitting = state !== "meeting";
  const appearance = getAppearance(color, agentIndex);

  // Stagger idle bob animation so all agents don't move in sync
  const bobDelay = (agentIndex * 0.7) % 3;

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
      {/* State bubble — floats gently */}
      {bubble && (
        <div
          className="bubble-float mb-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 shadow-sm"
          style={{ animationDelay: `${bobDelay * 0.5}s` }}
        >
          <Image
            src={`/sprites/bubbles/${bubble}.svg`}
            alt={bubble}
            width={12}
            height={12}
          />
        </div>
      )}

      {/* Pixel-art character with idle bob when sitting */}
      <div
        className={isSitting ? "agent-idle-bob" : undefined}
        style={isSitting ? { animationDelay: `${bobDelay}s` } : undefined}
      >
        {isSitting ? (
          <PixelCharacterSitting color={color} size={32} appearance={appearance} />
        ) : (
          <PixelCharacter color={color} size={28} appearance={appearance} />
        )}
      </div>

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
