import { Skeleton } from "@/components/skeleton";

export default function MaisLoading() {
  return (
    <div className="flex flex-col px-4 py-6">
      <Skeleton className="h-6 w-1/4" />
      <Skeleton className="mt-6 h-touch w-full" />
      <Skeleton className="mt-6 h-touch w-full" />
    </div>
  );
}
