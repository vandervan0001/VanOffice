const CELL = 32;

interface FurnitureProps {
  type:
    | "desk"
    | "plant"
    | "coffee"
    | "whiteboard"
    | "meeting-table"
    | "window"
    | "clock"
    | "poster"
    | "chair"
    | "bookshelf"
    | "water-cooler"
    | "printer"
    | "couch"
    | "rug"
    | "lamp"
    | "filing-cabinet"
    | "monitor-big";
  row: number;
  col: number;
}

// Pixel-art desk with monitor (colored screen), keyboard, mug, sticky note, and plant
function DeskSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 96 64" style={{ imageRendering: "pixelated" }}>
      {/* Desk surface — warm wood */}
      <rect x="0" y="20" width="96" height="28" rx="2" fill="#c4a46c" />
      <rect x="2" y="22" width="92" height="2" fill="#d4b47c" />
      {/* Wood grain lines */}
      <line x1="10" y1="24" x2="10" y2="46" stroke="#b8944a" strokeWidth="0.5" opacity="0.4" />
      <line x1="30" y1="24" x2="30" y2="46" stroke="#b8944a" strokeWidth="0.5" opacity="0.4" />
      <line x1="60" y1="24" x2="60" y2="46" stroke="#b8944a" strokeWidth="0.5" opacity="0.4" />
      {/* Desk legs */}
      <rect x="4" y="48" width="6" height="16" fill="#a88a50" />
      <rect x="86" y="48" width="6" height="16" fill="#a88a50" />
      {/* Monitor stand */}
      <rect x="22" y="22" width="8" height="4" fill="#4a4a4a" />
      <rect x="18" y="25" width="16" height="2" fill="#5a5a5a" />
      {/* Monitor frame */}
      <rect x="10" y="2" width="30" height="22" rx="1" fill="#2a2a3a" />
      {/* Monitor screen — blue-green tint with code-like lines */}
      <rect x="12" y="4" width="26" height="16" fill="#1a3a5a" />
      <rect x="12" y="4" width="26" height="1" fill="#2a6aa0" opacity="0.7" />
      <rect x="13" y="6" width="14" height="1" fill="#4ac8ff" opacity="0.6" />
      <rect x="13" y="8" width="20" height="1" fill="#4affa0" opacity="0.5" />
      <rect x="13" y="10" width="10" height="1" fill="#4ac8ff" opacity="0.6" />
      <rect x="13" y="12" width="18" height="1" fill="#ffcc44" opacity="0.5" />
      <rect x="13" y="14" width="8" height="1" fill="#4ac8ff" opacity="0.6" />
      {/* Screen glow reflection */}
      <rect x="12" y="4" width="8" height="4" fill="#ffffff" opacity="0.07" rx="0.5" />
      {/* Keyboard */}
      <rect x="50" y="26" width="24" height="8" rx="1" fill="#d8d0c8" />
      <rect x="52" y="28" width="4" height="1" fill="#a0988a" />
      <rect x="58" y="28" width="4" height="1" fill="#a0988a" />
      <rect x="64" y="28" width="4" height="1" fill="#a0988a" />
      <rect x="52" y="30" width="4" height="1" fill="#a0988a" />
      <rect x="58" y="30" width="4" height="1" fill="#a0988a" />
      <rect x="64" y="30" width="4" height="1" fill="#a0988a" />
      <rect x="54" y="32" width="12" height="1" fill="#b8b0a8" />
      {/* Coffee mug */}
      <rect x="80" y="18" width="10" height="10" rx="2" fill="#e8e0d0" />
      <rect x="89" y="20" width="4" height="6" rx="2" fill="none" stroke="#e8e0d0" strokeWidth="1.5" />
      <rect x="81" y="20" width="8" height="3" rx="1" fill="#c84a2a" opacity="0.4" />
      {/* Steam */}
      <path d="M83 16 Q84 12 83 10" fill="none" stroke="#d0c8b8" strokeWidth="0.8" opacity="0.5" />
      <path d="M86 15 Q87 11 86 9" fill="none" stroke="#d0c8b8" strokeWidth="0.8" opacity="0.4" />
      {/* Sticky note — yellow */}
      <rect x="44" y="18" width="8" height="7" rx="0.5" fill="#ffd966" />
      <rect x="45" y="20" width="6" height="1" fill="#c4a830" opacity="0.6" />
      <rect x="45" y="22" width="4" height="1" fill="#c4a830" opacity="0.6" />
      {/* Small plant on desk */}
      <rect x="74" y="14" width="6" height="6" rx="1" fill="#8a5a3a" />
      <ellipse cx="77" cy="13" rx="4" ry="3" fill="#3a9a4a" />
      <ellipse cx="74" cy="14" rx="3" ry="2" fill="#4aaa5a" />
      <ellipse cx="80" cy="13" rx="3" ry="2" fill="#2a8a3a" />
    </svg>
  );
}

// Plant with 3 variations based on position
function PlantSprite({ w, h, variant = 0 }: { w: number; h: number; variant?: number }) {
  if (variant % 3 === 1) {
    // Tall plant
    return (
      <svg width={w} height={h} viewBox="0 0 32 32" style={{ imageRendering: "pixelated" }}>
        {/* Pot */}
        <rect x="10" y="22" width="12" height="10" rx="2" fill="#c47a4a" />
        <rect x="8" y="21" width="16" height="3" rx="1" fill="#d48a5a" />
        <rect x="12" y="22" width="8" height="3" fill="#5a3a1a" />
        {/* Tall stem */}
        <rect x="15" y="8" width="2" height="14" fill="#4a7a2a" />
        {/* Large leaves */}
        <ellipse cx="10" cy="12" rx="6" ry="3" fill="#3a9a4a" transform="rotate(-20 10 12)" />
        <ellipse cx="22" cy="10" rx="6" ry="3" fill="#5aaa5a" transform="rotate(20 22 10)" />
        <ellipse cx="8" cy="18" rx="5" ry="2.5" fill="#2a8a3a" transform="rotate(-30 8 18)" />
        <ellipse cx="24" cy="16" rx="5" ry="2.5" fill="#4aba4a" transform="rotate(30 24 16)" />
        <ellipse cx="16" cy="6" rx="4" ry="5" fill="#6aca5a" />
      </svg>
    );
  }
  if (variant % 3 === 2) {
    // Bushy plant
    return (
      <svg width={w} height={h} viewBox="0 0 32 32" style={{ imageRendering: "pixelated" }}>
        {/* Pot */}
        <rect x="9" y="23" width="14" height="9" rx="2" fill="#a07040" />
        <rect x="7" y="22" width="18" height="3" rx="1" fill="#b08050" />
        <rect x="11" y="23" width="10" height="3" fill="#4a3010" />
        {/* Bushy round foliage */}
        <ellipse cx="16" cy="14" rx="10" ry="9" fill="#4a9a3a" />
        <ellipse cx="10" cy="13" rx="6" ry="5" fill="#5aaa4a" />
        <ellipse cx="22" cy="13" rx="6" ry="5" fill="#3a8a2a" />
        <ellipse cx="16" cy="9" rx="7" ry="5" fill="#6aba5a" />
        <ellipse cx="16" cy="15" rx="8" ry="6" fill="#4aaa3a" />
        {/* Flower dots */}
        <circle cx="12" cy="10" r="1.5" fill="#ff9a4a" />
        <circle cx="20" cy="9" r="1.5" fill="#ffcc44" />
        <circle cx="16" cy="7" r="1.5" fill="#ff7a8a" />
      </svg>
    );
  }
  // Default: small cactus
  return (
    <svg width={w} height={h} viewBox="0 0 32 32" style={{ imageRendering: "pixelated" }}>
      {/* Pot */}
      <rect x="8" y="20" width="16" height="12" rx="2" fill="#c49a6a" />
      <rect x="6" y="19" width="20" height="3" rx="1" fill="#d4aa7a" />
      <rect x="10" y="20" width="12" height="3" fill="#6a4a2a" />
      {/* Cactus body */}
      <rect x="13" y="8" width="6" height="13" rx="3" fill="#4a9a3a" />
      {/* Cactus arms */}
      <rect x="7" y="12" width="6" height="3" rx="1.5" fill="#4a9a3a" />
      <rect x="7" y="9" width="3" height="5" rx="1.5" fill="#4a9a3a" />
      <rect x="19" y="14" width="6" height="3" rx="1.5" fill="#4a9a3a" />
      <rect x="22" y="11" width="3" height="5" rx="1.5" fill="#4a9a3a" />
      {/* Cactus spines */}
      <line x1="15" y1="10" x2="14" y2="8" stroke="#8acc7a" strokeWidth="0.5" />
      <line x1="17" y1="9" x2="17" y2="7" stroke="#8acc7a" strokeWidth="0.5" />
      <line x1="19" y1="10" x2="20" y2="8" stroke="#8acc7a" strokeWidth="0.5" />
      {/* Flower on top */}
      <circle cx="16" cy="8" r="2" fill="#ff7a9a" />
      <circle cx="16" cy="8" r="1" fill="#ffcc44" />
    </svg>
  );
}

function CoffeeMachineSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 32 64" style={{ imageRendering: "pixelated" }}>
      {/* Machine body — dark with highlight */}
      <rect x="2" y="4" width="28" height="40" rx="3" fill="#3a2a1a" />
      <rect x="4" y="4" width="4" height="40" rx="2" fill="#4a3a2a" opacity="0.5" />
      <rect x="4" y="6" width="24" height="14" rx="2" fill="#2a2018" />
      {/* Display screen */}
      <rect x="7" y="7" width="18" height="10" rx="1" fill="#1a3a1a" />
      <rect x="8" y="8" width="16" height="1" fill="#4aff8a" opacity="0.7" />
      {/* COFFEE text simulation */}
      <rect x="9" y="10" width="4" height="1" fill="#4aff8a" opacity="0.6" />
      <rect x="14" y="10" width="4" height="1" fill="#4aff8a" opacity="0.6" />
      <rect x="9" y="12" width="14" height="1" fill="#2acc5a" opacity="0.5" />
      {/* Buttons — colored */}
      <circle cx="10" cy="22" r="2" fill="#ff4a4a" />
      <circle cx="16" cy="22" r="2" fill="#ffcc44" />
      <circle cx="22" cy="22" r="2" fill="#4aff8a" />
      {/* Drip area */}
      <rect x="6" y="27" width="20" height="14" rx="1" fill="#1a1208" />
      <rect x="8" y="28" width="16" height="2" fill="#3a2808" />
      {/* Cup */}
      <rect x="9" y="32" width="14" height="9" rx="2" fill="#f0e8d8" />
      <rect x="10" y="33" width="12" height="4" rx="1" fill="#4a2a1a" opacity="0.15" />
      {/* Steam from cup */}
      <path d="M13 30 Q14 27 13 25" fill="none" stroke="#d0d0c0" strokeWidth="0.8" opacity="0.4" />
      <path d="M16 29 Q17 26 16 24" fill="none" stroke="#d0d0c0" strokeWidth="0.8" opacity="0.4" />
      {/* Base */}
      <rect x="0" y="44" width="32" height="6" rx="2" fill="#5a4a3a" />
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
      {/* Wooden frame */}
      <rect x="0" y="0" width="96" height="32" rx="2" fill="#b8844a" />
      <rect x="2" y="2" width="92" height="28" rx="1" fill="#f8f6f2" />
      {/* Column headers */}
      <rect x="5" y="4" width="22" height="3" rx="1" fill="#ff9a4a" opacity="0.8" />
      <rect x="35" y="4" width="22" height="3" rx="1" fill="#4ac8ff" opacity="0.8" />
      <rect x="65" y="4" width="22" height="3" rx="1" fill="#4aff9a" opacity="0.8" />
      {/* Divider lines */}
      <line x1="32" y1="4" x2="32" y2="28" stroke="#d0c8b8" strokeWidth="0.5" />
      <line x1="62" y1="4" x2="62" y2="28" stroke="#d0c8b8" strokeWidth="0.5" />
      {/* Sticky notes — brighter */}
      <rect x="5" y="9" width="14" height="10" rx="1" fill="#ffd966" />
      <rect x="6" y="11" width="12" height="1" fill="#c4a030" opacity="0.7" />
      <rect x="6" y="13" width="8" height="1" fill="#c4a030" opacity="0.5" />
      <rect x="21" y="9" width="10" height="10" rx="1" fill="#ff7a9a" />
      <rect x="22" y="11" width="8" height="1" fill="#c04070" opacity="0.7" />
      <rect x="35" y="9" width="14" height="10" rx="1" fill="#7a9aff" />
      <rect x="36" y="11" width="10" height="1" fill="#3a5acc" opacity="0.7" />
      <rect x="51" y="9" width="9" height="10" rx="1" fill="#ff9a4a" />
      <rect x="52" y="11" width="7" height="1" fill="#c05010" opacity="0.7" />
      <rect x="65" y="9" width="14" height="10" rx="1" fill="#4affcc" />
      <rect x="66" y="11" width="10" height="1" fill="#0a9a7a" opacity="0.7" />
      <rect x="81" y="9" width="10" height="10" rx="1" fill="#ccff4a" />
      <rect x="82" y="11" width="8" height="1" fill="#6a9a0a" opacity="0.7" />
      {/* Marker tray */}
      <rect x="2" y="28" width="92" height="3" rx="0.5" fill="#c49060" />
      <rect x="10" y="28.5" width="4" height="2" rx="0.5" fill="#ff4a4a" />
      <rect x="16" y="28.5" width="4" height="2" rx="0.5" fill="#4a9aff" />
      <rect x="22" y="28.5" width="4" height="2" rx="0.5" fill="#4aff7a" />
    </svg>
  );
}

function WindowSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 64 32" style={{ imageRendering: "pixelated" }}>
      {/* Warm wooden frame */}
      <rect x="0" y="0" width="64" height="32" rx="2" fill="#8a6a3a" />
      {/* Sky gradient — warm sunny */}
      <rect x="2" y="2" width="60" height="28" rx="1" fill="#a0d4f8" />
      {/* Sunlight warm tint at top */}
      <rect x="2" y="2" width="60" height="10" fill="#ffe8a0" opacity="0.35" />
      {/* Cross bars */}
      <rect x="30" y="2" width="4" height="28" fill="#9a7a4a" />
      <rect x="2" y="14" width="60" height="4" fill="#9a7a4a" />
      {/* Sky panes */}
      <rect x="4" y="4" width="25" height="9" fill="#c8e8ff" opacity="0.8" />
      <rect x="35" y="4" width="25" height="9" fill="#c8e8ff" opacity="0.8" />
      {/* Ground/landscape hints */}
      <rect x="4" y="19" width="25" height="9" fill="#8acc88" opacity="0.5" />
      <rect x="35" y="19" width="25" height="9" fill="#8acc88" opacity="0.5" />
      {/* Sunlight glow from window edges */}
      <rect x="2" y="2" width="8" height="28" fill="#ffe090" opacity="0.2" />
      <rect x="54" y="2" width="8" height="28" fill="#ffe090" opacity="0.2" />
      {/* Curtains — warm orange */}
      <rect x="0" y="0" width="6" height="32" rx="1" fill="#e88a3a" opacity="0.75" />
      <rect x="58" y="0" width="6" height="32" rx="1" fill="#e88a3a" opacity="0.75" />
      {/* Curtain fold lines */}
      <line x1="2" y1="0" x2="2" y2="32" stroke="#c06a1a" strokeWidth="0.5" opacity="0.5" />
      <line x1="4" y1="0" x2="4" y2="32" stroke="#c06a1a" strokeWidth="0.5" opacity="0.5" />
      <line x1="60" y1="0" x2="60" y2="32" stroke="#c06a1a" strokeWidth="0.5" opacity="0.5" />
      <line x1="62" y1="0" x2="62" y2="32" stroke="#c06a1a" strokeWidth="0.5" opacity="0.5" />
    </svg>
  );
}

function MeetingTableSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 128 64" style={{ imageRendering: "pixelated" }}>
      {/* Table shadow */}
      <ellipse cx="65" cy="42" rx="56" ry="8" fill="#8a6a3a" opacity="0.2" />
      {/* Table surface */}
      <ellipse cx="64" cy="24" rx="58" ry="18" fill="#a88040" />
      <ellipse cx="64" cy="22" rx="54" ry="15" fill="#c89860" />
      <ellipse cx="64" cy="20" rx="50" ry="12" fill="#d4a870" opacity="0.5" />
      {/* Table legs */}
      <rect x="20" y="34" width="8" height="24" fill="#9a7040" />
      <rect x="100" y="34" width="8" height="24" fill="#9a7040" />
      {/* Papers on table */}
      <rect x="28" y="15" width="16" height="10" rx="1" fill="#f8f0e0" />
      <rect x="29" y="16" width="14" height="1" fill="#a0c8e0" opacity="0.7" />
      <rect x="29" y="18" width="10" height="1" fill="#a0c8e0" opacity="0.5" />
      <rect x="30" y="17" width="12" height="7" rx="0.5" fill="#ff9a4a" opacity="0.2" />
      {/* Laptop */}
      <rect x="48" y="13" width="18" height="12" rx="1" fill="#2a2a3a" />
      <rect x="50" y="14" width="14" height="9" fill="#1a4a6a" />
      <rect x="50" y="14" width="14" height="1" fill="#2a7abf" opacity="0.7" />
      <rect x="46" y="24" width="22" height="2" rx="1" fill="#3a3a4a" />
      {/* Coffee cups */}
      <rect x="82" y="16" width="9" height="8" rx="2" fill="#fff0e0" />
      <rect x="90" y="18" width="3" height="5" rx="1.5" fill="none" stroke="#d8c8b0" strokeWidth="1" />
      <rect x="83" y="17" width="7" height="3" rx="0.5" fill="#6a3a1a" opacity="0.2" />
      <rect x="96" y="18" width="9" height="7" rx="2" fill="#fff0e0" />
      <rect x="97" y="19" width="7" height="3" rx="0.5" fill="#6a3a1a" opacity="0.2" />
      {/* Pens */}
      <rect x="66" y="17" width="10" height="2" rx="1" fill="#4a6aff" />
      <rect x="64" y="21" width="10" height="2" rx="1" fill="#ff4a6a" />
      {/* Colored papers */}
      <rect x="108" y="15" width="12" height="10" rx="1" fill="#f8e840" opacity="0.8" />
      <rect x="109" y="16" width="10" height="1" fill="#c4a010" opacity="0.6" />
    </svg>
  );
}

function ClockSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 32 32" style={{ imageRendering: "pixelated" }}>
      {/* Warm wood frame */}
      <circle cx="16" cy="16" r="15" fill="#b87a3a" />
      <circle cx="16" cy="16" r="13" fill="#c88a4a" />
      <circle cx="16" cy="16" r="11" fill="#f8f4ee" />
      <circle cx="16" cy="16" r="10" fill="#fffaf4" />
      {/* Hour marks */}
      <rect x="15" y="6" width="2" height="3" rx="0.5" fill="#4a3a2a" />
      <rect x="15" y="23" width="2" height="3" rx="0.5" fill="#4a3a2a" />
      <rect x="6" y="15" width="3" height="2" rx="0.5" fill="#4a3a2a" />
      <rect x="23" y="15" width="3" height="2" rx="0.5" fill="#4a3a2a" />
      {/* Minute marks */}
      <rect x="20" y="7" width="1" height="2" fill="#8a7a6a" opacity="0.6" />
      <rect x="11" y="7" width="1" height="2" fill="#8a7a6a" opacity="0.6" />
      <rect x="24" y="11" width="2" height="1" fill="#8a7a6a" opacity="0.6" />
      <rect x="24" y="20" width="2" height="1" fill="#8a7a6a" opacity="0.6" />
      <rect x="6" y="11" width="2" height="1" fill="#8a7a6a" opacity="0.6" />
      <rect x="6" y="20" width="2" height="1" fill="#8a7a6a" opacity="0.6" />
      {/* Hands */}
      <line x1="16" y1="16" x2="16" y2="8" stroke="#2a1a0a" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="16" x2="22" y2="16" stroke="#2a1a0a" strokeWidth="1.5" strokeLinecap="round" />
      {/* Second hand */}
      <line x1="16" y1="16" x2="10" y2="20" stroke="#e84a2a" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2" fill="#c84a2a" />
      <circle cx="16" cy="16" r="1" fill="#ffffff" />
    </svg>
  );
}

function PosterSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 32 32" style={{ imageRendering: "pixelated" }}>
      {/* Frame — warm orange-gold */}
      <rect x="0" y="0" width="32" height="32" rx="1" fill="#c88a3a" />
      <rect x="1" y="1" width="30" height="30" rx="1" fill="#f0e8d8" />
      {/* Sky */}
      <rect x="2" y="2" width="28" height="14" fill="#7ac4f0" />
      {/* Sun */}
      <circle cx="24" cy="7" r="3" fill="#ffdd44" />
      <line x1="24" y1="2" x2="24" y2="4" stroke="#ffdd44" strokeWidth="0.8" />
      <line x1="27" y1="4" x2="28.5" y2="2.5" stroke="#ffdd44" strokeWidth="0.8" />
      <line x1="29" y1="7" x2="31" y2="7" stroke="#ffdd44" strokeWidth="0.8" />
      {/* Clouds */}
      <ellipse cx="10" cy="6" rx="4" ry="2" fill="#ffffff" opacity="0.8" />
      <ellipse cx="13" cy="5" rx="3" ry="2" fill="#ffffff" opacity="0.8" />
      {/* Mountains */}
      <polygon points="4,16 10,6 16,16" fill="#7aaa8a" />
      <polygon points="12,16 20,4 28,16" fill="#5a8a6a" />
      <polygon points="0,16 6,10 14,16" fill="#4a7a5a" opacity="0.7" />
      {/* Snow caps */}
      <polygon points="10,6 12,9 8,9" fill="#f0f0f8" />
      <polygon points="20,4 22,8 18,8" fill="#f0f0f8" />
      {/* Ground */}
      <rect x="2" y="16" width="28" height="4" fill="#7aaa5a" />
      {/* TEAMWORK text area */}
      <rect x="2" y="20" width="28" height="10" fill="#fff8e8" />
      <rect x="5" y="22" width="22" height="2" rx="0.5" fill="#c88a3a" opacity="0.7" />
      <rect x="8" y="25" width="16" height="1.5" rx="0.5" fill="#e8a040" opacity="0.5" />
    </svg>
  );
}

// === NEW FURNITURE TYPES ===

function BookshelfSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 96 64" style={{ imageRendering: "pixelated" }}>
      {/* Shelf frame */}
      <rect x="0" y="0" width="96" height="64" rx="2" fill="#8a5a2a" />
      <rect x="3" y="3" width="90" height="58" rx="1" fill="#6a4a20" />
      {/* Shelf boards */}
      <rect x="3" y="30" width="90" height="4" fill="#7a5a2a" />
      {/* Books — top shelf */}
      {/* Book 1: red */}
      <rect x="6" y="6" width="8" height="22" rx="0.5" fill="#e84a3a" />
      <rect x="7" y="7" width="6" height="1" fill="#ff7a6a" opacity="0.5" />
      {/* Book 2: blue */}
      <rect x="15" y="9" width="7" height="19" rx="0.5" fill="#3a6aff" />
      <rect x="16" y="10" width="5" height="1" fill="#6a9aff" opacity="0.5" />
      {/* Book 3: yellow */}
      <rect x="23" y="6" width="9" height="22" rx="0.5" fill="#ffd940" />
      <rect x="24" y="7" width="7" height="1" fill="#ffe880" opacity="0.5" />
      {/* Book 4: green */}
      <rect x="33" y="8" width="8" height="20" rx="0.5" fill="#3aaa4a" />
      <rect x="34" y="9" width="6" height="1" fill="#7aca7a" opacity="0.5" />
      {/* Book 5: purple */}
      <rect x="42" y="7" width="7" height="21" rx="0.5" fill="#8a3abf" />
      <rect x="43" y="8" width="5" height="1" fill="#ba7aef" opacity="0.5" />
      {/* Book 6: orange */}
      <rect x="50" y="5" width="10" height="23" rx="0.5" fill="#ff8a2a" />
      <rect x="51" y="6" width="8" height="1" fill="#ffba6a" opacity="0.5" />
      {/* Book 7: teal */}
      <rect x="61" y="8" width="7" height="20" rx="0.5" fill="#2ab8aa" />
      {/* Book 8: pink */}
      <rect x="69" y="6" width="8" height="22" rx="0.5" fill="#ff6aaa" />
      {/* Book 9: light blue */}
      <rect x="78" y="9" width="7" height="19" rx="0.5" fill="#4adfff" />
      {/* Leaning book */}
      <rect x="85" y="8" width="5" height="20" rx="0.5" fill="#aaf060" transform="rotate(8 87 18)" />
      {/* Books — bottom shelf */}
      {/* Book 1 */}
      <rect x="6" y="35" width="10" height="22" rx="0.5" fill="#ff4a7a" />
      <rect x="7" y="36" width="8" height="1" fill="#ff8aaa" opacity="0.5" />
      {/* Book 2 */}
      <rect x="17" y="37" width="8" height="20" rx="0.5" fill="#4a8aff" />
      {/* Book 3 */}
      <rect x="26" y="35" width="11" height="22" rx="0.5" fill="#ffcc2a" />
      {/* Book 4 */}
      <rect x="38" y="36" width="9" height="21" rx="0.5" fill="#2acca0" />
      {/* Book 5 */}
      <rect x="48" y="35" width="8" height="22" rx="0.5" fill="#cc4aff" />
      {/* Book 6 */}
      <rect x="57" y="37" width="7" height="20" rx="0.5" fill="#ff7a2a" />
      {/* Book 7 */}
      <rect x="65" y="35" width="10" height="22" rx="0.5" fill="#2a8aff" />
      {/* Book 8 */}
      <rect x="76" y="36" width="8" height="21" rx="0.5" fill="#ff4a4a" />
      {/* Knick-knack: small trophy */}
      <rect x="86" y="50" width="7" height="7" rx="0.5" fill="#ffcc44" />
      <rect x="88" y="46" width="3" height="5" rx="0.5" fill="#ffd960" />
      {/* Bottom trim */}
      <rect x="0" y="60" width="96" height="4" rx="0" fill="#7a4a1a" />
    </svg>
  );
}

function WaterCoolerSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 32 64" style={{ imageRendering: "pixelated" }}>
      {/* Water bottle (blue jug on top) */}
      <ellipse cx="16" cy="8" rx="8" ry="5" fill="#2a9adf" opacity="0.9" />
      <rect x="10" y="6" width="12" height="16" rx="3" fill="#4ab8ff" opacity="0.85" />
      <rect x="11" y="7" width="10" height="14" rx="2" fill="#80d4ff" opacity="0.5" />
      {/* Water level */}
      <rect x="11" y="14" width="10" height="7" rx="1" fill="#2a9adf" opacity="0.4" />
      {/* Dispenser body */}
      <rect x="8" y="22" width="16" height="28" rx="2" fill="#e0e8f0" />
      <rect x="9" y="23" width="4" height="26" rx="1" fill="#f0f4f8" opacity="0.5" />
      {/* Buttons */}
      <rect x="12" y="34" width="8" height="4" rx="1" fill="#2a9aff" />
      <rect x="12" y="40" width="8" height="4" rx="1" fill="#ff4a4a" />
      {/* Spout */}
      <rect x="13" y="44" width="6" height="3" rx="1" fill="#c8d0d8" />
      <rect x="15" y="47" width="2" height="2" rx="0.5" fill="#4ab8ff" opacity="0.6" />
      {/* Cup holder area */}
      <rect x="6" y="48" width="20" height="4" rx="1" fill="#d0d8e0" />
      {/* Base */}
      <rect x="4" y="50" width="24" height="14" rx="2" fill="#c0ccd8" />
      <rect x="8" y="56" width="6" height="8" fill="#a8b8c8" />
      <rect x="18" y="56" width="6" height="8" fill="#a8b8c8" />
    </svg>
  );
}

function PrinterSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 96 64" style={{ imageRendering: "pixelated" }}>
      {/* Printer body */}
      <rect x="4" y="20" width="88" height="32" rx="3" fill="#d8d0c8" />
      <rect x="6" y="22" width="84" height="28" rx="2" fill="#e8e4de" />
      {/* Paper tray (input) — bottom */}
      <rect x="16" y="44" width="64" height="6" rx="1" fill="#c8c0b8" />
      <rect x="18" y="45" width="60" height="4" rx="0.5" fill="#f8f6f2" />
      {/* Paper in tray */}
      <rect x="20" y="45.5" width="56" height="3" fill="#ffffff" opacity="0.9" />
      {/* Paper output slot */}
      <rect x="20" y="18" width="56" height="4" rx="1" fill="#b8b0a8" />
      {/* Paper coming out */}
      <rect x="24" y="12" width="48" height="8" rx="0.5" fill="#ffffff" />
      <rect x="26" y="14" width="32" height="1" fill="#4a6aff" opacity="0.4" />
      <rect x="26" y="16" width="20" height="1" fill="#4a6aff" opacity="0.3" />
      {/* Control panel */}
      <rect x="60" y="26" width="26" height="14" rx="2" fill="#c8c0b8" />
      <rect x="62" y="28" width="14" height="8" rx="1" fill="#1a3a5a" />
      <rect x="63" y="29" width="12" height="1" fill="#4aff9a" opacity="0.7" />
      <rect x="63" y="31" width="8" height="1" fill="#4aff9a" opacity="0.5" />
      {/* Buttons */}
      <circle cx="80" cy="30" r="2" fill="#4aff4a" />
      <circle cx="80" cy="36" r="2" fill="#ff9a4a" />
      {/* Side highlight */}
      <rect x="6" y="22" width="4" height="28" rx="1" fill="#f0ece8" opacity="0.5" />
      {/* Legs */}
      <rect x="10" y="52" width="10" height="12" rx="1" fill="#c0b8b0" />
      <rect x="76" y="52" width="10" height="12" rx="1" fill="#c0b8b0" />
    </svg>
  );
}

function CouchSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 64 32" style={{ imageRendering: "pixelated" }}>
      {/* Couch back */}
      <rect x="0" y="4" width="64" height="18" rx="4" fill="#4a7abf" />
      <rect x="2" y="6" width="60" height="14" rx="3" fill="#5a8acf" />
      {/* Back cushion lines */}
      <line x1="33" y1="6" x2="33" y2="20" stroke="#3a6aaf" strokeWidth="1" />
      {/* Seat */}
      <rect x="4" y="18" width="56" height="10" rx="3" fill="#5a8acf" />
      <rect x="4" y="18" width="56" height="4" rx="2" fill="#6a9adf" />
      {/* Seat cushion divider */}
      <line x1="33" y1="18" x2="33" y2="28" stroke="#3a6aaf" strokeWidth="1" />
      {/* Armrests */}
      <rect x="0" y="8" width="6" height="20" rx="3" fill="#3a6aaf" />
      <rect x="58" y="8" width="6" height="20" rx="3" fill="#3a6aaf" />
      {/* Legs */}
      <rect x="4" y="26" width="6" height="6" rx="1" fill="#2a1a0a" />
      <rect x="54" y="26" width="6" height="6" rx="1" fill="#2a1a0a" />
      {/* Pillow on couch */}
      <rect x="38" y="8" width="16" height="12" rx="3" fill="#ff9a4a" />
      <rect x="39" y="9" width="14" height="10" rx="2" fill="#ffaa5a" />
      <line x1="46" y1="9" x2="46" y2="19" stroke="#e07820" strokeWidth="0.7" opacity="0.5" />
      <line x1="39" y1="14" x2="53" y2="14" stroke="#e07820" strokeWidth="0.7" opacity="0.5" />
    </svg>
  );
}

function RugSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 96 64" style={{ imageRendering: "pixelated" }}>
      {/* Base rug — deep red */}
      <rect x="2" y="2" width="92" height="60" rx="4" fill="#c83a3a" opacity="0.75" />
      {/* Fringe */}
      {[4,8,12,16,20,24,28,32,36,40,44,48,52,56,60,64,68,72,76,80,84,88,92].map((x, i) => (
        <line key={`ft${i}`} x1={x} y1="2" x2={x} y2="0" stroke="#e86a4a" strokeWidth="1" opacity="0.6" />
      ))}
      {[4,8,12,16,20,24,28,32,36,40,44,48,52,56,60,64,68,72,76,80,84,88,92].map((x, i) => (
        <line key={`fb${i}`} x1={x} y1="62" x2={x} y2="64" stroke="#e86a4a" strokeWidth="1" opacity="0.6" />
      ))}
      {/* Border pattern — gold */}
      <rect x="4" y="4" width="88" height="56" rx="3" fill="none" stroke="#e8c040" strokeWidth="2" opacity="0.7" />
      <rect x="8" y="8" width="80" height="48" rx="2" fill="none" stroke="#e8a030" strokeWidth="1" opacity="0.5" />
      {/* Diamond center motif */}
      <polygon points="48,16 60,32 48,48 36,32" fill="none" stroke="#e8c040" strokeWidth="1.5" opacity="0.7" />
      <polygon points="48,22 56,32 48,42 40,32" fill="#e8a030" opacity="0.35" />
      {/* Corner decorations */}
      <circle cx="14" cy="14" r="4" fill="#e8c040" opacity="0.4" />
      <circle cx="82" cy="14" r="4" fill="#e8c040" opacity="0.4" />
      <circle cx="14" cy="50" r="4" fill="#e8c040" opacity="0.4" />
      <circle cx="82" cy="50" r="4" fill="#e8c040" opacity="0.4" />
    </svg>
  );
}

function LampSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 32 64" style={{ imageRendering: "pixelated" }}>
      {/* Warm glow halo */}
      <ellipse cx="16" cy="14" rx="14" ry="10" fill="#ffe090" opacity="0.3" />
      {/* Lamp shade */}
      <polygon points="6,16 10,4 22,4 26,16" fill="#f0c860" />
      <polygon points="7,16 11,5 21,5 25,16" fill="#f8d870" />
      {/* Shade rim */}
      <rect x="5" y="14" width="22" height="3" rx="1" fill="#e0a820" />
      {/* Bulb */}
      <circle cx="16" cy="12" r="3" fill="#fffcc0" opacity="0.9" />
      <circle cx="16" cy="12" r="2" fill="#ffffff" opacity="0.7" />
      {/* Neck joint */}
      <rect x="14" y="16" width="4" height="4" rx="1" fill="#8a7060" />
      {/* Pole */}
      <rect x="15" y="20" width="2" height="32" fill="#7a6050" />
      {/* Pole joint */}
      <ellipse cx="16" cy="36" rx="4" ry="2" fill="#6a5040" />
      {/* Base */}
      <ellipse cx="16" cy="52" rx="8" ry="4" fill="#6a5040" />
      <rect x="10" y="50" width="12" height="3" rx="1" fill="#5a4030" />
      <ellipse cx="16" cy="53" rx="10" ry="5" fill="#5a4030" />
    </svg>
  );
}

function FilingCabinetSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 32 64" style={{ imageRendering: "pixelated" }}>
      {/* Cabinet body */}
      <rect x="2" y="2" width="28" height="60" rx="2" fill="#9a9a9a" />
      <rect x="4" y="4" width="24" height="56" rx="1" fill="#adadad" />
      <rect x="4" y="4" width="6" height="56" rx="0" fill="#b8b8b8" opacity="0.4" />
      {/* Drawer 1 */}
      <rect x="4" y="5" width="24" height="17" rx="1" fill="#b0b0b0" />
      <rect x="5" y="6" width="22" height="15" rx="0.5" fill="#c0c0c0" />
      <rect x="12" y="12" width="8" height="3" rx="1" fill="#808080" />
      {/* Drawer handle 1 */}
      <rect x="13" y="13" width="6" height="1.5" rx="0.5" fill="#606060" />
      {/* Colored tab on drawer 1 */}
      <rect x="22" y="7" width="4" height="3" rx="0.5" fill="#ff6a4a" />
      {/* Drawer 2 */}
      <rect x="4" y="23" width="24" height="17" rx="1" fill="#b0b0b0" />
      <rect x="5" y="24" width="22" height="15" rx="0.5" fill="#c0c0c0" />
      <rect x="12" y="30" width="8" height="3" rx="1" fill="#808080" />
      <rect x="13" y="31" width="6" height="1.5" rx="0.5" fill="#606060" />
      <rect x="22" y="25" width="4" height="3" rx="0.5" fill="#4a9aff" />
      {/* Drawer 3 */}
      <rect x="4" y="41" width="24" height="17" rx="1" fill="#b0b0b0" />
      <rect x="5" y="42" width="22" height="15" rx="0.5" fill="#c0c0c0" />
      <rect x="12" y="48" width="8" height="3" rx="1" fill="#808080" />
      <rect x="13" y="49" width="6" height="1.5" rx="0.5" fill="#606060" />
      <rect x="22" y="43" width="4" height="3" rx="0.5" fill="#4aff8a" />
    </svg>
  );
}

function BigMonitorSprite({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 128 96" style={{ imageRendering: "pixelated" }}>
      {/* Wall mount bracket */}
      <rect x="58" y="88" width="12" height="8" fill="#4a4a5a" />
      <rect x="50" y="90" width="28" height="4" rx="1" fill="#3a3a4a" />
      {/* Monitor frame */}
      <rect x="2" y="4" width="124" height="84" rx="4" fill="#1a1a2a" />
      <rect x="4" y="6" width="120" height="80" rx="3" fill="#2a2a3a" />
      {/* Screen */}
      <rect x="6" y="8" width="116" height="76" rx="2" fill="#0a1a2a" />
      {/* Dashboard display */}
      {/* Header bar */}
      <rect x="6" y="8" width="116" height="12" fill="#1a3a5a" />
      <rect x="10" y="11" width="30" height="6" rx="1" fill="#2a6abf" />
      <rect x="11" y="12" width="28" height="1" fill="#4a9aff" opacity="0.7" />
      <rect x="11" y="14" width="20" height="1" fill="#4a9aff" opacity="0.5" />
      {/* Status dots */}
      <circle cx="90" cy="14" r="3" fill="#4aff4a" />
      <circle cx="100" cy="14" r="3" fill="#ffcc44" />
      <circle cx="110" cy="14" r="3" fill="#ff4a4a" />
      {/* Charts area */}
      {/* Bar chart */}
      <rect x="10" y="24" width="30" height="50" rx="1" fill="#1a2a3a" />
      <rect x="12" y="44" width="6" height="28" fill="#4a9aff" opacity="0.8" />
      <rect x="20" y="36" width="6" height="36" fill="#4aff9a" opacity="0.8" />
      <rect x="28" y="50" width="6" height="22" fill="#4a9aff" opacity="0.8" />
      <rect x="10" y="72" width="30" height="1" fill="#4a6a8a" opacity="0.6" />
      {/* Line graph */}
      <rect x="44" y="24" width="40" height="50" rx="1" fill="#1a2a3a" />
      <polyline points="46,60 52,50 58,55 64,40 70,45 72,35 78,42 82,30" fill="none" stroke="#4aff9a" strokeWidth="1.5" opacity="0.9" />
      <polyline points="46,68 52,65 58,62 64,66 70,60 72,65 78,58 82,62" fill="none" stroke="#4a9aff" strokeWidth="1" opacity="0.7" />
      {/* Pie chart */}
      <rect x="88" y="24" width="30" height="30" rx="1" fill="#1a2a3a" />
      <circle cx="103" cy="39" r="12" fill="#1a3a5a" />
      <path d="M103 39 L103 27 A12 12 0 0 1 115 39 Z" fill="#4a9aff" opacity="0.9" />
      <path d="M103 39 L115 39 A12 12 0 0 1 103 51 Z" fill="#4aff9a" opacity="0.9" />
      <path d="M103 39 L103 51 A12 12 0 0 1 91 39 Z" fill="#ffcc44" opacity="0.9" />
      <path d="M103 39 L91 39 A12 12 0 0 1 103 27 Z" fill="#ff6a4a" opacity="0.9" />
      {/* Number display */}
      <rect x="88" y="58" width="30" height="16" rx="1" fill="#1a2a3a" />
      <rect x="90" y="60" width="26" height="6" rx="0.5" fill="#0a1a2a" />
      <rect x="91" y="61" width="14" height="4" rx="0.5" fill="#4aff9a" opacity="0.6" />
      {/* Bottom status bar */}
      <rect x="6" y="80" width="116" height="4" fill="#1a2a3a" />
      <rect x="8" y="81" width="40" height="2" rx="0.5" fill="#4a6a9a" opacity="0.5" />
      <rect x="100" y="81" width="20" height="2" rx="0.5" fill="#4aff9a" opacity="0.5" />
      {/* Bezel indicator */}
      <circle cx="64" cy="90" r="2" fill="#2a4a6a" />
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
    render: () => null,
  },
  bookshelf: {
    w: 3, h: 2,
    render: (w, h) => <BookshelfSprite w={w} h={h} />,
  },
  "water-cooler": {
    w: 1, h: 2,
    render: (w, h) => <WaterCoolerSprite w={w} h={h} />,
  },
  printer: {
    w: 3, h: 2,
    render: (w, h) => <PrinterSprite w={w} h={h} />,
  },
  couch: {
    w: 2, h: 1,
    render: (w, h) => <CouchSprite w={w} h={h} />,
  },
  rug: {
    w: 3, h: 2,
    render: (w, h) => <RugSprite w={w} h={h} />,
  },
  lamp: {
    w: 1, h: 2,
    render: (w, h) => <LampSprite w={w} h={h} />,
  },
  "filing-cabinet": {
    w: 1, h: 2,
    render: (w, h) => <FilingCabinetSprite w={w} h={h} />,
  },
  "monitor-big": {
    w: 4, h: 3,
    render: (w, h) => <BigMonitorSprite w={w} h={h} />,
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
