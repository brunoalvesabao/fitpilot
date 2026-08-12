export function StatTile({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: "blue";
}) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-card border border-border bg-surface p-3">
      <span
        className={`text-lg font-semibold ${emphasis === "blue" ? "text-blue" : "text-fg"}`}
      >
        {value}
      </span>
      <span className="text-xs text-fg-muted">{label}</span>
    </div>
  );
}
