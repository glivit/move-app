import { Card } from '@/components/ui/Card'

function SkeletonLine({ width = '100%', height = '16px', className = '' }: { width?: string; height?: string; className?: string }) {
  return (
    <div
      className={`bg-gray-200 rounded animate-pulse ${className}`}
      style={{ width, height }}
    />
  )
}

export function BillingSkeleton() {
  return (
    <div className="space-y-6">
      {/* MRR Card Skeleton */}
      <Card padding="lg">
        <div className="text-center space-y-4">
          <SkeletonLine width="60%" height="14px" className="mx-auto" />
          <div className="flex items-baseline justify-center gap-2">
            <SkeletonLine width="200px" height="48px" />
            <SkeletonLine width="60px" height="20px" />
          </div>
        </div>
      </Card>

      {/* Stats Row Skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} padding="md">
            <div className="space-y-2">
              <SkeletonLine width="70%" height="12px" />
              <SkeletonLine width="40%" height="24px" />
            </div>
          </Card>
        ))}
      </div>

      {/* Table Skeleton */}
      <Card>
        <div className="space-y-4">
          {/* Table Header */}
          <div className="flex gap-4 pb-4 border-b border-border">
            <SkeletonLine width="25%" height="14px" />
            <SkeletonLine width="20%" height="14px" />
            <SkeletonLine width="20%" height="14px" />
            <SkeletonLine width="20%" height="14px" />
          </div>

          {/* Table Rows */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 items-center py-3 border-b border-border last:border-b-0">
              <div className="flex-1">
                <SkeletonLine width="80%" height="14px" className="mb-1" />
                <SkeletonLine width="60%" height="12px" />
              </div>
              <SkeletonLine width="80px" height="20px" />
              <SkeletonLine width="80px" height="20px" />
              <SkeletonLine width="100px" height="14px" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
