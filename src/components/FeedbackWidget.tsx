'use client'

import { useState } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase'
import { reportError } from '@/lib/error-logger'
import { trackEvent } from '@/lib/analytics'

/**
 * FeedbackWidget: A small floating button that opens a modal for submitting feedback
 * Saves feedback to Supabase feedback table
 * Can be added to client and coach layouts
 */
export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!feedback.trim()) {
      reportError('Feedback is empty', { action: 'feedback_submission' })
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        reportError('User not authenticated', { action: 'feedback_submission' })
        setIsSubmitting(false)
        return
      }

      // Submit feedback
      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        content: feedback.trim(),
        type: 'general',
        url: typeof window !== 'undefined' ? window.location.pathname : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        created_at: new Date().toISOString(),
      })

      if (error) {
        reportError(error.message, {
          action: 'feedback_submission',
          error: error.code,
        })
        return
      }

      // Track event
      trackEvent('feedback_submitted', {
        feedbackLength: feedback.length,
      })

      setIsSubmitted(true)
      setFeedback('')

      // Close after 2 seconds
      setTimeout(() => {
        setIsOpen(false)
        setIsSubmitted(false)
      }, 2000)
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), {
        action: 'feedback_submission',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-accent text-white shadow-lg hover:bg-accent-dark transition-colors duration-[var(--transition-fast)]"
        aria-label="Send feedback"
        title="Feedback"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center">
          <div className="bg-bg rounded-t-2xl md:rounded-2xl w-full md:w-full md:max-w-md shadow-xl p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-text-primary">
                {isSubmitted ? 'Bedankt!' : 'Feedback sturen'}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-surface transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-text-secondary" />
              </button>
            </div>

            {/* Content */}
            {isSubmitted ? (
              <div className="space-y-2 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-sm text-text-primary">Je feedback is verzonden. Bedankt!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-text-muted">
                  Hoe kunnen we MŌVE beter voor je maken? Je suggesties helpen ons om te verbeteren.
                </p>

                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Schrijf hier je feedback..."
                  className="
                    w-full px-4 py-3 rounded-lg
                    bg-surface border border-border
                    text-text-primary placeholder:text-text-muted
                    transition-colors duration-[var(--transition-fast)]
                    focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                    disabled:opacity-50 disabled:cursor-not-allowed
                    resize-none
                    min-h-[120px] md:min-h-[150px]
                  "
                  disabled={isSubmitting}
                />

                {/* Character count */}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-muted">{feedback.length} characters</span>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={isSubmitting}
                    disabled={!feedback.trim() || isSubmitting}
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Sturen
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
