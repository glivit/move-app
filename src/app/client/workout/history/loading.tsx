export default function HistoryLoading() {
  return (
    <div className="pb-28 animate-pulse">
      {/* Back button skeleton */}
      <div className="h-5 w-20 bg-[#F0F0EE] rounded-md mb-7 mt-2" />

      {/* Title skeleton */}
      <div className="h-8 w-40 bg-[#F0F0EE] rounded-lg mb-6" />

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#F8F8F6] rounded-xl p-3 h-[68px]" />
        ))}
      </div>

      {/* Tab switcher */}
      <div className="h-10 bg-[#F0F0EE] rounded-xl mb-8" />

      {/* Calendar skeleton */}
      <div className="mb-10">
        <div className="h-5 w-32 bg-[#F0F0EE] rounded-md mx-auto mb-5" />
        <div className="grid grid-cols-7 gap-[3px]">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="aspect-square bg-[#F8F8F6] rounded-lg" />
          ))}
        </div>
      </div>

      {/* Workout list skeleton */}
      <div className="h-4 w-36 bg-[#F0F0EE] rounded-md mb-4" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-4 border-t border-[#F0F0EE]">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-[#F0F0EE] rounded-md" />
            <div className="h-3 w-48 bg-[#F8F8F6] rounded-md" />
          </div>
          <div className="w-4 h-4 bg-[#F0F0EE] rounded" />
        </div>
      ))}
    </div>
  )
}
