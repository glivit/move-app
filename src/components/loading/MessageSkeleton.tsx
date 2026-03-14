/**
 * Loading skeleton for messages
 * Shows 5 animated skeleton message bubbles alternating left and right
 */
export function MessageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Message 1 - Left (Coach) */}
      <div className="flex justify-start">
        <div className="flex gap-3 max-w-xs">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Message 2 - Right (Client) */}
      <div className="flex justify-end">
        <div className="max-w-xs">
          <div className="space-y-2">
            <div className="h-4 w-44 bg-amber-100 rounded animate-pulse" />
            <div className="h-4 w-36 bg-amber-100 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Message 3 - Left (Coach) */}
      <div className="flex justify-start">
        <div className="flex gap-3 max-w-xs">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-56 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Message 4 - Right (Client) */}
      <div className="flex justify-end">
        <div className="max-w-xs">
          <div className="space-y-2">
            <div className="h-4 w-52 bg-amber-100 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Message 5 - Left (Coach) */}
      <div className="flex justify-start">
        <div className="flex gap-3 max-w-xs">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-44 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
