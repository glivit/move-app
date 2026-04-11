-- Phase 3: allow 'voice' as a message_type so coach & client can send
-- audio messages via the existing /api/upload + message-attachments bucket.
--
-- The ChatInput component has been trying to insert message_type='voice'
-- for a while but was silently failing the CHECK constraint. This migration
-- expands the allowed set to include voice (for audio notes) alongside the
-- workout notification types added in 20260318.

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN (
    'text',
    'image',
    'video',
    'voice',
    'file',
    'workout_complete',
    'system'
  ));
