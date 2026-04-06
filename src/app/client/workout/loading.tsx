export default function WorkoutLoading() {
  return (
    <div className="pb-28 animate-pulse">
      {/* Back button */}
      <div className="h-5 w-16 bg-[#F0F0EE] rounded-md mb-7 mt-2" />

      {/* Week label */}
      <div className="h-3 w-16 bg-[#F0F0EE] rounded-md mb-2" />

      {/* Title */}
      <div className="h-8 w-48 bg-[#F0F0EE] rounded-lg mb-8" />

      {/* Today's workout hero */}
      <div className="mb-10">
        <div className="h-3 w-24 bg-[#D46A3A]/20 rounded-md mb-3" />
        <div className="h-7 w-40 bg-[#F0F0EE] rounded-lg mb-1" />
        <div className="h-4 w-28 bg-[#F8F8F6] rounded-md mb-5" />
        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <div className="h-4 w-24 bg-[#F8F8F6] rounded-md" />
            <div className="h-4 w-16 bg-[#F8F8F6] rounded-md" />
          </div>
          <div className="h-10 w-24 bg-[#1A1917]/10 rounded-xl" />
        </div>
      </div>

      {/* Training days list */}
      <div className="h-3 w-32 bg-[#F0F0EE] rounded-md mb-4" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4 border-t border-[#F0F0EE]">
          <div className="w-9 h-9 bg-[#F0F0EE] rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-32 bg-[#F0F0EE] rounded-md" />
            <div className="h-3 w-40 bg-[#F8F8F6] rounded-md" />
          </div>
          <div className="w-4 h-4 bg-[#F0F0EE] rounded" />
        </div>
      ))}
    </div>
  )
}
