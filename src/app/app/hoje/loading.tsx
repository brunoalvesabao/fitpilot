import { Skeleton, SkeletonRow, SkeletonStatTiles } from "@/components/skeleton";

export default function HojeLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 pb-2 pt-6">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="mt-2 h-4 w-1/3" />
      </div>
      <SkeletonStatTiles count={3} />
      <div className="mt-2">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
