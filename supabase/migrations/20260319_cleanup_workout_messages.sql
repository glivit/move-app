-- Remove all workout_complete and system messages from the messages table
-- These were incorrectly inserted as chat messages and should not appear in conversations
DELETE FROM messages WHERE message_type IN ('workout_complete', 'system');
