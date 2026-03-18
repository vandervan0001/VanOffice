export function CommandInput() {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
        Orders
      </p>
      <input
        type="text"
        disabled
        placeholder="Give an instruction to the team..."
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-60"
      />
      <p className="text-center text-[10px] text-[var(--text-muted)]">
        Available in v2
      </p>
    </div>
  );
}
