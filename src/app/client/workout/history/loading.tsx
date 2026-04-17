export default function HistoryLoading() {
  return (
    <div className="pb-28 animate-pulse">
      {/* Back button skeleton */}
      <div className="h-5 w-20 bg-[rgba(253,253,254,0.08)] rounded-md mb-7 mt-2" />

      {/* Title skeleton */}
      <div className="h-8 w-40 bg-[rgba(253,253,254,0.08)] rounded-lg mb-6" />

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[rgba(253,253,254,0.08)] rounded-xl p-3 h-[68px]" />
        ))}
      </div>

      {/* Tab switcher */}
      <div className="h-10 bg-[rgba(253,253,254,0.08)] rounded-xl mb-8" />

      {/* Calendar skeleton */}
      <div className="mb-10">
        <div className="h-5 w-32 bg-[rgba(253,253,254,0.08)] rounded-md mx-auto mb-5" />
        <div className="grid grid-cols-7 gap-[3px]">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="aspect-square bg-[rgba(253,253,254,0.08)] rounded-lg" />
          ))}
        </div>
      </div>

      {/* Workout list skeleton */}
      <div className="h-4 w-36 bg-[rgba(253,253,254,0.08)] rounded-md mb-4" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-4 border-t border-[rgba(253,253,254,0.08)]">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-[rgba(253,253,254,0.08)] rounded-md" />
            <div className="h-3 w-48 bg-[rgba(253,253,254,0.08)] rounded-md" />
          </div>
          <div className="w-4 h-4 bg-[rgba(253,253,254,0.08)] rounded" />
        </div>
      ))}
    </div>
  )
}
