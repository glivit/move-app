/**
 * Loading skeleton for program view page
 * Shows program details and exercise cards loading
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

export function ProgramSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <SkeletonLine width="300px" height="28px" />
        <SkeletonLine width="500px" height="16px" className="mt-2" />
      </div>

      {/* Program Summary Card */}
      <Card padding="lg">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center space-y-2">
              <SkeletonLine width="60%" height="20px" className="mx-auto" />
              <SkeletonLine width="40%" height="24px" className="mx-auto" />
            </div>
          ))}
        </div>
      </Card>

      {/* Exercise Cards */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} padding="md">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <SkeletonLine width="50%" height="20px" />
                <SkeletonLine width="100%" height="16px" />
                <SkeletonLine width="80%" height="16px" />
              </div>
              <SkeletonLine width="80px" height="24px" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
