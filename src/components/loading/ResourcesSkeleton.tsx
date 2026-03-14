/**
 * Loading skeleton for resources page
 * Shows list of resource cards loading
 */
import { Card } from '@/components/ui/Card'

function SkeletonLine({ width = '100%', height = '16px', className = '' }: { width?: string; height?: string; className?: string }) {
  return (
    <div
      className={`bg-gray-200 rounded animate-pulse ${className}`}
      style={{ width, height }}
    />
  )
}

export function ResourcesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <SkeletonLine width="250px" height="28px" />
        <SkeletonLine width="400px" height="16px" className="mt-2" />
      </div>

      {/* Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} padding="md">
            <div className="space-y-3">
              <SkeletonLine width="40%" height="20px" />
              <SkeletonLine width="100%" height="16px" />
              <SkeletonLine width="100%" height="16px" />
              <SkeletonLine width="60%" height="16px" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
