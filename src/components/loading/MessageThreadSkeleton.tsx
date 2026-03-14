/**
 * Loading skeleton for message thread with conversation header and message list
 */
export function MessageThreadSkeleton() {
  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Message 1 - Left */}
        <div className="flex justify-start">
          <div className="max-w-xs">
            <div className="space-y-2">
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Message 2 - Right */}
        <div className="flex justify-end">
          <div className="max-w-xs">
            <div className="h-4 w-44 bg-amber-100 rounded animate-pulse" />
          </div>
        </div>

        {/* Message 3 - Left */}
        <div className="flex justify-start">
          <div className="max-w-xs">
            <div className="space-y-2">
              <div className="h-4 w-56 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Message 4 - Right */}
        <div className="flex justify-end">
          <div className="max-w-xs">
            <div className="h-4 w-52 bg-amber-100 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border px-6 py-4">
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  )
}
