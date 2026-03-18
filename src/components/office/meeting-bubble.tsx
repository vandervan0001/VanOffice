interface MeetingBubbleProps {
  title: string;
  row: number;
  col: number;
}

const CELL = 32;

export function MeetingBubble({ title, row, col }: MeetingBubbleProps) {
  return (
    <div
      className="absolute z-10 -translate-y-full rounded-lg bg-white/95 px-2 py-1 shadow-sm"
      style={{
        top: row * CELL - 8,
        left: col * CELL,
      }}
    >
      <span className="text-[10px] font-medium text-[var(--foreground)]">
        {title}
      </span>
      {/* Triangle pointer */}
      <div
        className="absolute left-4 top-full h-0 w-0"
        style={{
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: "5px solid rgba(255,255,255,0.95)",
        }}
      />
    </div>
  );
}
