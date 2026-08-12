import { Suspense } from "react";
import { CompareBoard } from "@/components/dashboard/CompareBoard";
import { Skeleton } from "@/components/ui/skeleton";

export default function ComparePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compare</h1>
        <p className="text-sm text-muted-foreground">
          Put up to 4 locations side by side to see where the air is worse.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}>
        <CompareBoard />
      </Suspense>
    </div>
  );
}
