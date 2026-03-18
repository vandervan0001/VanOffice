const CELL = 32;

interface FurnitureProps {
  type: "desk" | "plant" | "coffee" | "whiteboard" | "meeting-table" | "window" | "clock" | "poster";
  row: number;
  col: number;
}

const FURNITURE_STYLES: Record<FurnitureProps["type"], {
  w: number; h: number; bg: string; label: string; radius?: string;
}> = {
  desk: { w: 3, h: 2, bg: "#c4a46c", label: "Bureau", radius: "4px" },
  plant: { w: 1, h: 1, bg: "#6aaa5a", label: "🌿", radius: "50%" },
  coffee: { w: 1, h: 2, bg: "#8a6a4a", label: "☕", radius: "4px" },
  whiteboard: { w: 3, h: 1, bg: "#f0ebe3", label: "Task Board", radius: "2px" },
  "meeting-table": { w: 4, h: 2, bg: "#b8956a", label: "", radius: "8px" },
  window: { w: 2, h: 1, bg: "#d4eaf7", label: "", radius: "2px" },
  clock: { w: 1, h: 1, bg: "#f0ebe3", label: "🕐", radius: "50%" },
  poster: { w: 1, h: 1, bg: "#e8d8c4", label: "📋", radius: "2px" },
};

export function Furniture({ type, row, col }: FurnitureProps) {
  const style = FURNITURE_STYLES[type];

  return (
    <div
      className="absolute flex items-center justify-center text-xs"
      style={{
        top: row * CELL,
        left: col * CELL,
        width: style.w * CELL,
        height: style.h * CELL,
        backgroundColor: style.bg,
        borderRadius: style.radius,
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      {style.label && (
        <span className="text-[9px] text-[#5a4a3a] opacity-70">
          {style.label}
        </span>
      )}
    </div>
  );
}
