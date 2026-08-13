export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-card bg-white/5 ${className}`} />;
}

export function SkeletonRow() {
  return (
    <div className="flex min-h-touch items-center gap-3 border-b border-border px-4 py-3">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonStatTiles({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-2 px-4 py-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-1 flex-col gap-2 rounded-card border border-border bg-surface p-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
