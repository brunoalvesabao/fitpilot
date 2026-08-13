import { Skeleton, SkeletonRow } from "@/components/skeleton";

export default function FinanceiroLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 px-4 pb-4 pt-6">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-6 w-1/2 self-center" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-2.5 w-full rounded-full" />
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
