export default function ActivityLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-pulse">
        <div className="h-9 w-36 bg-[#E5E1D9] rounded-xl" />
        <div className="h-4 w-52 bg-[#E5E1D9] rounded mt-2" />
      </div>

      {/* Activity feed */}
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E5E1D9] shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-40 bg-[#E5E1D9] rounded mb-2" />
                <div className="h-3 w-64 bg-[#E5E1D9] rounded mb-1" />
                <div className="h-3 w-20 bg-[#E5E1D9] rounded" />
              </div>
              <div className="h-5 w-16 bg-[#E5E1D9] rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
