interface SkeletonLineProps {
  width?: string
  height?: string
  className?: string
}

function SkeletonLine({ width = '100%', height = '16px', className = '' }: SkeletonLineProps) {
  return (
    <div
      className={`bg-gray-200 rounded animate-pulse ${className}`}
      style={{ width, height }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg p-5 space-y-3">
      <SkeletonLine width="40%" height="20px" />
      <SkeletonLine width="70%" />
      <SkeletonLine width="55%" />
    </div>
  )
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-white rounded-lg p-4 space-y-2">
      <SkeletonLine width="60%" height="12px" />
      <SkeletonLine width="40%" height="24px" />
    </div>
  )
}

export function ClientCardSkeleton() {
  return (
    <div className="bg-white rounded-lg p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonLine width="60%" height="16px" />
        <SkeletonLine width="30%" height="12px" />
      </div>
    </div>
  )
}

export function CheckInListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg p-5 animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <SkeletonLine width="30%" height="14px" />
            <SkeletonLine width="20%" height="14px" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="space-y-1">
                <SkeletonLine width="70%" height="10px" />
                <SkeletonLine width="50%" height="16px" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <SkeletonLine width="250px" height="28px" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      <CardSkeleton />
      <CardSkeleton />
    </div>
  )
}
