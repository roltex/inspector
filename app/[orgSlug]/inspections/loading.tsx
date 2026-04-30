import { Card } from "@/components/ui/card";

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`}
      aria-hidden
    />
  );
}

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBar className="h-7 w-48" />
          <SkeletonBar className="h-4 w-64" />
        </div>
        <SkeletonBar className="h-11 w-40" />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBar key={i} className="h-[108px]" />
        ))}
      </div>

      {/* Toolbar */}
      <SkeletonBar className="h-12" />

      {/* Group sections */}
      {Array.from({ length: 3 }).map((_, g) => (
        <Card key={g} className="overflow-hidden">
          <div className="border-b px-5 py-2.5">
            <SkeletonBar className="h-5 w-40" />
          </div>
          <ul className="divide-y">
            {Array.from({ length: 4 }).map((__, r) => (
              <li
                key={r}
                className="flex items-center gap-3 px-5 py-4"
              >
                <SkeletonBar className="h-4 w-4 rounded-full" />
                <div className="flex-1 space-y-2">
                  <SkeletonBar className="h-4 w-1/2" />
                  <SkeletonBar className="h-3 w-2/3" />
                </div>
                <SkeletonBar className="h-6 w-20" />
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
