import { Skeleton, SkeletonRow } from "@/components/skeleton";

export default function AlunosLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 pb-4 pt-6">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="mt-2 h-4 w-1/4" />
        <Skeleton className="mt-4 h-touch w-full" />
      </div>
      <div>
        {Array.from({ length: 8 }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
