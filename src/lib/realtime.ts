import { createClient } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Subscribe to new messages for a specific user (as sender or receiver)
 */
export function subscribeToMessages(
  userId: string,
  onNewMessage: (message: any) => void
): RealtimeChannel {
  const supabase = createClient()

  return supabase
    .channel(`messages:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        const msg = payload.new
        if (msg.sender_id === userId || msg.receiver_id === userId) {
          onNewMessage(msg)
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        const msg = payload.new
        if (msg.sender_id === userId || msg.receiver_id === userId) {
          onNewMessage(msg)
        }
      }
    )
    .subscribe()
}

/**
 * Subscribe to prompt response changes
 */
export function subscribeToPromptResponses(
  onNewResponse: (response: any) => void
): RealtimeChannel {
  const supabase = createClient()

  return supabase
    .channel('prompt_responses')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'prompt_responses',
      },
      (payload) => {
        onNewResponse(payload.new)
      }
    )
    .subscribe()
}
