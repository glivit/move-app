'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  message_type: string
  file_url: string | null
  read_at: string | null
  created_at: string
}

/**
 * Hook to subscribe to real-time messages for a conversation between two users.
 * Loads initial messages and updates in real-time.
 */
export function useMessageSubscription(userId: string, otherUserId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Load initial messages
  useEffect(() => {
    async function loadMessages() {
      const supabase = createClient()
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
        )
        .order('created_at', { ascending: true })

      if (data) setMessages(data as Message[])
      setLoading(false)
    }

    if (userId && otherUserId) {
      loadMessages()
    }
  }, [userId, otherUserId])

  // Subscribe to real-time changes
  useEffect(() => {
    if (!userId || !otherUserId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`conversation:${[userId, otherUserId].sort().join('-')}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new as Message
          const isRelevant =
            (msg.sender_id === userId && msg.receiver_id === otherUserId) ||
            (msg.sender_id === otherUserId && msg.receiver_id === userId)
          if (isRelevant) {
            setMessages((prev) => {
              // Avoid duplicates (optimistic + realtime)
              if (prev.some((m) => m.id === msg.id)) return prev
              return [...prev, msg]
            })
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
          const msg = payload.new as Message
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? msg : m))
          )
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, otherUserId])

  // Send a message
  const sendMessage = useCallback(
    async (content: string, messageType: string = 'text', fileUrl?: string) => {
      const supabase = createClient()

      // Optimistic update
      const optimisticMsg: Message = {
        id: `temp-${Date.now()}`,
        sender_id: userId,
        receiver_id: otherUserId,
        content,
        message_type: messageType,
        file_url: fileUrl || null,
        read_at: null,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, optimisticMsg])

      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: userId,
          receiver_id: otherUserId,
          content,
          message_type: messageType,
          file_url: fileUrl || null,
        })
        .select()
        .single()

      if (error) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
        return { error }
      }

      // Replace optimistic with real message
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? (data as Message) : m))
      )
      return { data }
    },
    [userId, otherUserId]
  )

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    const supabase = createClient()
    const unread = messages.filter(
      (m) => m.sender_id === otherUserId && !m.read_at
    )
    if (unread.length === 0) return

    const ids = unread.map((m) => m.id)
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
  }, [messages, otherUserId])

  return { messages, loading, sendMessage, markAsRead }
}

/**
 * Hook to get conversation list with last message for coach inbox
 */
export function useConversationList(coachId: string) {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const supabase = createClient()

    // Get all messages involving the coach
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${coachId},receiver_id.eq.${coachId}`)
      .order('created_at', { ascending: false })

    if (!messages) {
      setLoading(false)
      return
    }

    // Group by client (the other person in the conversation)
    const conversationMap = new Map<string, any>()
    for (const msg of messages) {
      const clientId = msg.sender_id === coachId ? msg.receiver_id : msg.sender_id
      if (!conversationMap.has(clientId)) {
        conversationMap.set(clientId, {
          clientId,
          lastMessage: msg,
          unreadCount: 0,
        })
      }
      if (msg.sender_id !== coachId && !msg.read_at) {
        const conv = conversationMap.get(clientId)
        conv.unreadCount++
      }
    }

    // Get client profiles
    const clientIds = Array.from(conversationMap.keys())
    if (clientIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, package')
        .in('id', clientIds)

      if (profiles) {
        for (const profile of profiles) {
          const conv = conversationMap.get(profile.id)
          if (conv) {
            conv.client = profile
          }
        }
      }
    }

    // Sort by last message time
    const sorted = Array.from(conversationMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessage.created_at).getTime() -
        new Date(a.lastMessage.created_at).getTime()
    )

    setConversations(sorted)
    setLoading(false)
  }, [coachId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Subscribe to new messages for real-time updates
  useEffect(() => {
    if (!coachId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`inbox:${coachId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [coachId, refresh])

  return { conversations, loading, refresh }
}
