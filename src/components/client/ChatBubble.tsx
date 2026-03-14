'use client'

interface ChatBubbleProps {
  message: {
    id: string
    content: string
    type: string
    image_url?: string
    created_at: string
    sender_id: string
  }
  isCoach: boolean
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function ChatBubble({ message, isCoach }: ChatBubbleProps) {
  const time = formatTime(message.created_at)

  if (isCoach) {
    return (
      <div className="flex justify-start">
        <div className="flex flex-col max-w-[78%]">
          <div className="bg-client-surface-muted rounded-[20px] rounded-bl-[4px] px-4 py-3">
            {message.type === 'image' && message.image_url ? (
              <img
                src={message.image_url}
                alt="Message image"
                className="rounded-xl max-w-[240px] h-auto object-cover"
              />
            ) : (
              <p className="text-[15px] text-text-primary">{message.content}</p>
            )}
          </div>
          <span className="text-[11px] text-client-text-muted mt-1 px-2">{time}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-end">
      <div className="flex flex-col max-w-[78%] items-end">
        <div className="bg-accent rounded-[20px] rounded-br-[4px] px-4 py-3">
          {message.type === 'image' && message.image_url ? (
            <img
              src={message.image_url}
              alt="Message image"
              className="rounded-xl max-w-[240px] h-auto object-cover"
            />
          ) : (
            <p className="text-[15px] text-white">{message.content}</p>
          )}
        </div>
        <span className="text-[11px] text-white/60 mt-1 px-2">{time}</span>
      </div>
    </div>
  )
}
