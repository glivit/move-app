export default function NutritionLoading() {
  return (
    <div className="pb-28 animate-pulse">
      {/* Back button skeleton */}
      <div className="h-4 w-12 bg-[#F0F0EE] rounded mb-4 mt-2" />
      {/* Label + title */}
      <div className="h-3 w-16 bg-[#F0F0EE] rounded mb-2" />
      <div className="h-8 w-32 bg-[#F0F0EE] rounded mb-4" />
      {/* Date nav */}
      <div className="h-5 w-28 bg-[#F0F0EE] rounded mb-10" />
      {/* Big calorie number */}
      <div className="h-14 w-40 bg-[#F0F0EE] rounded mb-2" />
      <div className="h-4 w-28 bg-[#F0F0EE] rounded mb-5" />
      <div className="h-[3px] w-full bg-[#F0F0EE] rounded-full mb-14" />
      {/* Macro row */}
      <div className="border-t border-[#F0F0EE] pt-6 flex gap-6 mb-12">
        <div className="h-4 w-20 bg-[#F0F0EE] rounded" />
        <div className="h-4 w-24 bg-[#F0F0EE] rounded" />
        <div className="h-4 w-16 bg-[#F0F0EE] rounded" />
      </div>
      {/* Meals label */}
      <div className="h-3 w-24 bg-[#F0F0EE] rounded mb-4" />
      {/* Meal rows */}
      {[1, 2, 3].map(i => (
        <div key={i} className="py-5 border-t border-[#F0F0EE] flex items-center justify-between">
          <div>
            <div className="h-4 w-28 bg-[#F0F0EE] rounded mb-1.5" />
            <div className="h-3 w-20 bg-[#F0F0EE] rounded" />
          </div>
          <div className="h-4 w-12 bg-[#F0F0EE] rounded" />
        </div>
      ))}
    </div>
  )
}
