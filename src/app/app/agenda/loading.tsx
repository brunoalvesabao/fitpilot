import { Skeleton, SkeletonRow } from "@/components/skeleton";

export default function AgendaLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3 px-4 pb-3 pt-6">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-touch w-full" />
      </div>
      <div>
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
