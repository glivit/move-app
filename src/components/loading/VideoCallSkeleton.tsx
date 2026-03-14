/**
 * Loading skeleton for video call interface
 * Shows video grid, controls, and participant list placeholders
 */
export function VideoCallSkeleton() {
  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      {/* Video Grid */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-gray-800 rounded-lg animate-pulse flex items-center justify-center"
          >
            <div className="w-16 h-16 rounded-full bg-gray-700" />
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-4 flex items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-700 animate-pulse" />
        <div className="w-12 h-12 rounded-full bg-gray-700 animate-pulse" />
        <div className="w-12 h-12 rounded-full bg-gray-700 animate-pulse" />
      </div>
    </div>
  )
}
