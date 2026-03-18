const CELL = 32;

interface FurnitureProps {
  type: "desk" | "plant" | "coffee" | "whiteboard" | "meeting-table" | "window" | "clock" | "poster" | "chair";
  row: number;
  col: number;
}

// Pixel-art desk with monitor, keyboard, and mug
function DeskSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 96 64" style={{ imageRendering: "pixelated" }}>
      {/* Desk surface */}
      <rect x="0" y="20" width="96" height="28" rx="2" fill="#c4a46c" />
      <rect x="2" y="22" width="92" height="2" fill="#d4b47c" />
      {/* Desk legs */}
      <rect x="4" y="48" width="6" height="16" fill="#a88a50" />
      <rect x="86" y="48" width="6" height="16" fill="#a88a50" />
      {/* Monitor */}
      <rect x="10" y="2" width="30" height="22" rx="1" fill="#3a3a3a" />
      <rect x="12" y="4" width="26" height="16" fill="#6aaard" />
      <rect x="12" y="4" width="26" height="16" fill="#8ab8d0" />
      <rect x="22" y="22" width="8" height="4" fill="#4a4a4a" />
      <rect x="18" y="25" width="16" height="2" fill="#5a5a5a" />
      {/* Keyboard */}
      <rect x="50" y="26" width="24" height="8" rx="1" fill="#d8d0c8" />
      <rect x="52" y="28" width="4" height="1" fill="#b8b0a8" />
      <rect x="58" y="28" width="4" height="1" fill="#b8b0a8" />
      <rect x="64" y="28" width="4" height="1" fill="#b8b0a8" />
      <rect x="52" y="30" width="4" height="1" fill="#b8b0a8" />
      <rect x="58" y="30" width="4" height="1" fill="#b8b0a8" />
      {/* Coffee mug */}
      <rect x="80" y="18" width="10" height="10" rx="2" fill="#e8e0d0" />
      <rect x="89" y="20" width="4" height="6" rx="2" fill="none" stroke="#e8e0d0" strokeWidth="1.5" />
      {/* Steam */}
      <path d="M83 16 Q84 12 83 10" fill="none" stroke="#d0c8b8" strokeWidth="0.8" opacity="0.5" />
      <path d="M86 15 Q87 11 86 9" fill="none" stroke="#d0c8b8" strokeWidth="0.8" opacity="0.4" />
    </svg>
  );
}

function PlantSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 32 32" style={{ imageRendering: "pixelated" }}>
      {/* Pot */}
      <rect x="8" y="20" width="16" height="12" rx="2" fill="#c49a6a" />
      <rect x="6" y="19" width="20" height="3" rx="1" fill="#d4aa7a" />
      {/* Soil */}
      <rect x="10" y="20" width="12" height="3" fill="#6a4a2a" />
      {/* Leaves */}
      <ellipse cx="16" cy="14" rx="8" ry="6" fill="#5a9a4a" />
      <ellipse cx="12" cy="12" rx="5" ry="4" fill="#6aaa5a" />
      <ellipse cx="20" cy="11" rx="5" ry="4" fill="#4a8a3a" />
      <ellipse cx="16" cy="8" rx="4" ry="3" fill="#7aba6a" />
    </svg>
  );
}

function CoffeeMachineSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 32 64" style={{ imageRendering: "pixelated" }}>
      {/* Machine body */}
      <rect x="2" y="4" width="28" height="40" rx="3" fill="#5a4a3a" />
      <rect x="4" y="6" width="24" height="14" rx="2" fill="#3a3028" />
      {/* Display */}
      <rect x="8" y="8" width="16" height="8" rx="1" fill="#2a5a3a" />
      <rect x="10" y="10" width="4" height="1" fill="#4aba6a" />
      <rect x="10" y="12" width="8" height="1" fill="#4aba6a" />
      {/* Drip area */}
      <rect x="8" y="28" width="16" height="12" rx="1" fill="#4a3a2a" />
      {/* Cup */}
      <rect x="10" y="32" width="12" height="8" rx="2" fill="#f0e8d8" />
      {/* Base */}
      <rect x="0" y="44" width="32" height="6" rx="2" fill="#6a5a4a" />
      {/* Table under */}
      <rect x="0" y="50" width="32" height="14" rx="1" fill="#b89868" />
      <rect x="4" y="56" width="6" height="8" fill="#a08050" />
      <rect x="22" y="56" width="6" height="8" fill="#a08050" />
    </svg>
  );
}

function WhiteboardSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 96 32" style={{ imageRendering: "pixelated" }}>
      {/* Frame */}
      <rect x="0" y="0" width="96" height="32" rx="2" fill="#e8e0d4" />
      <rect x="2" y="2" width="92" height="28" fill="#f8f4ee" />
      {/* Content lines (task board look) */}
      <rect x="6" y="6" width="20" height="3" rx="1" fill="#d4c4a4" />
      <rect x="6" y="12" width="16" height="2" fill="#e8dcc8" />
      <rect x="6" y="16" width="24" height="2" fill="#e8dcc8" />
      {/* Sticky notes */}
      <rect x="36" y="5" width="12" height="10" rx="1" fill="#ffd966" />
      <rect x="50" y="5" width="12" height="10" rx="1" fill="#ff9a76" />
      <rect x="64" y="5" width="12" height="10" rx="1" fill="#7ac7e0" />
      <rect x="36" y="18" width="12" height="10" rx="1" fill="#a8d8a0" />
      <rect x="50" y="18" width="12" height="10" rx="1" fill="#ffd966" />
      {/* Text on stickies */}
      <rect x="38" y="8" width="8" height="1" fill="#c4a830" />
      <rect x="52" y="8" width="8" height="1" fill="#c47040" />
      <rect x="66" y="8" width="8" height="1" fill="#4a9ab0" />
    </svg>
  );
}

function WindowSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 64 32" style={{ imageRendering: "pixelated" }}>
      {/* Frame */}
      <rect x="0" y="0" width="64" height="32" rx="2" fill="#8a7a6a" />
      <rect x="2" y="2" width="60" height="28" rx="1" fill="#c8e4f4" />
      {/* Cross bars */}
      <rect x="30" y="2" width="4" height="28" fill="#9a8a7a" />
      <rect x="2" y="14" width="60" height="4" fill="#9a8a7a" />
      {/* Sky/light */}
      <rect x="4" y="4" width="25" height="9" fill="#d8f0ff" />
      <rect x="35" y="4" width="25" height="9" fill="#d8f0ff" />
      {/* Curtain hint */}
      <rect x="0" y="0" width="4" height="32" fill="#e8dcd0" opacity="0.6" />
      <rect x="60" y="0" width="4" height="32" fill="#e8dcd0" opacity="0.6" />
    </svg>
  );
}

function MeetingTableSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 128 64" style={{ imageRendering: "pixelated" }}>
      {/* Table surface */}
      <ellipse cx="64" cy="24" rx="58" ry="18" fill="#b89868" />
      <ellipse cx="64" cy="22" rx="54" ry="15" fill="#c8a878" />
      {/* Table legs */}
      <rect x="20" y="34" width="8" height="24" fill="#a08050" />
      <rect x="100" y="34" width="8" height="24" fill="#a08050" />
      {/* Items on table */}
      <rect x="30" y="16" width="14" height="8" rx="1" fill="#f0e8d8" />
      <rect x="50" y="14" width="10" height="10" rx="1" fill="#e0d8c8" />
      <rect x="80" y="16" width="14" height="8" rx="1" fill="#f0e8d8" />
      {/* Pens */}
      <rect x="66" y="18" width="8" height="2" rx="1" fill="#4a6a9a" />
      <rect x="64" y="22" width="10" height="2" rx="1" fill="#9a4a4a" />
    </svg>
  );
}

function ClockSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 32 32" style={{ imageRendering: "pixelated" }}>
      <circle cx="16" cy="16" r="14" fill="#f8f4ee" stroke="#8a7a6a" strokeWidth="2" />
      <circle cx="16" cy="16" r="12" fill="#fff" />
      {/* Hour marks */}
      <rect x="15" y="5" width="2" height="3" fill="#4a4a4a" />
      <rect x="15" y="24" width="2" height="3" fill="#4a4a4a" />
      <rect x="5" y="15" width="3" height="2" fill="#4a4a4a" />
      <rect x="24" y="15" width="3" height="2" fill="#4a4a4a" />
      {/* Hands */}
      <line x1="16" y1="16" x2="16" y2="8" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="16" x2="22" y2="16" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="1.5" fill="#c44a4a" />
    </svg>
  );
}

function PosterSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 32 32" style={{ imageRendering: "pixelated" }}>
      <rect x="2" y="2" width="28" height="28" rx="1" fill="#f0e8d8" stroke="#c4b498" strokeWidth="1" />
      {/* Mountain/landscape art */}
      <polygon points="8,22 16,10 24,22" fill="#7aaa8a" />
      <polygon points="4,22 10,14 18,22" fill="#5a8a6a" />
      <circle cx="22" cy="8" r="3" fill="#f0c860" />
      {/* Frame bottom text */}
      <rect x="8" y="24" width="16" height="2" rx="0.5" fill="#d4c4a4" />
    </svg>
  );
}

const FURNITURE_RENDERERS: Record<FurnitureProps["type"], {
  w: number; h: number;
  render: (w: number, h: number) => React.ReactNode;
}> = {
  desk: {
    w: 3, h: 2,
    render: (w, h) => <DeskSprite w={w} h={h} />,
  },
  plant: {
    w: 1, h: 1,
    render: (w, h) => <PlantSprite w={w} h={h} />,
  },
  coffee: {
    w: 1, h: 2,
    render: (w, h) => <CoffeeMachineSprite w={w} h={h} />,
  },
  whiteboard: {
    w: 3, h: 1,
    render: (w, h) => <WhiteboardSprite w={w} h={h} />,
  },
  "meeting-table": {
    w: 4, h: 2,
    render: (w, h) => <MeetingTableSprite w={w} h={h} />,
  },
  window: {
    w: 2, h: 1,
    render: (w, h) => <WindowSprite w={w} h={h} />,
  },
  clock: {
    w: 1, h: 1,
    render: (w, h) => <ClockSprite w={w} h={h} />,
  },
  poster: {
    w: 1, h: 1,
    render: (w, h) => <PosterSprite w={w} h={h} />,
  },
  chair: {
    w: 1, h: 1,
    render: () => null, // placeholder for future
  },
};

export function Furniture({ type, row, col }: FurnitureProps) {
  const config = FURNITURE_RENDERERS[type];

  return (
    <div
      className="absolute"
      style={{
        top: row * CELL,
        left: col * CELL,
        width: config.w * CELL,
        height: config.h * CELL,
      }}
    >
      {config.render(config.w * CELL, config.h * CELL)}
    </div>
  );
}
