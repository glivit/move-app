export default function ClientLoading() {
  return (
    <div className="pb-28 animate-fade-in">
      {/* Hero section skeleton */}
      <div className="mb-10">
        <div className="h-3 w-16 bg-[#F0F0EE] rounded-full mb-3 animate-shimmer" />
        <div className="h-8 w-44 bg-[#F0F0EE] rounded-lg mb-8 animate-shimmer" />

        {/* Big number placeholder */}
        <div className="h-12 w-32 bg-[#F0F0EE] rounded-lg mb-2 animate-shimmer" />
        <div className="h-4 w-24 bg-[#F0F0EE] rounded-full mb-5 animate-shimmer" />

        {/* Thin progress bar */}
        <div className="w-full h-[3px] bg-[#F0F0EE] rounded-full animate-shimmer" />
      </div>

      {/* Macro row skeleton */}
      <div className="flex border-t border-[#F0F0EE] pt-6 mb-12">
        {[1, 2, 3].map(i => (
          <div key={i} className={`flex-1 ${i > 1 ? 'pl-5 border-l border-[#F0F0EE]' : ''}`}>
            <div className="h-5 w-10 bg-[#F0F0EE] rounded mb-1.5 animate-shimmer" />
            <div className="h-3 w-14 bg-[#F0F0EE] rounded-full mb-1.5 animate-shimmer" />
            <div className="h-2.5 w-8 bg-[#F0F0EE] rounded-full animate-shimmer" />
          </div>
        ))}
      </div>

      {/* Section label */}
      <div className="h-3 w-20 bg-[#F0F0EE] rounded-full mb-4 animate-shimmer" />

      {/* List rows skeleton */}
      <div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-3.5 py-4 border-t border-[#F0F0EE]">
            <div className="w-7 h-7 rounded-full bg-[#F0F0EE] shrink-0 animate-shimmer" />
            <div className="flex-1">
              <div className="h-4 w-28 bg-[#F0F0EE] rounded mb-1.5 animate-shimmer" />
              <div className="h-3 w-20 bg-[#F0F0EE] rounded-full animate-shimmer" />
            </div>
            <div className="h-4 w-12 bg-[#F0F0EE] rounded animate-shimmer" />
          </div>
        ))}
      </div>
    </div>
  )
}
