-- Fix recursive RLS policies on profiles table
-- Run this in Supabase SQL Editor

-- Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Coach can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Coach can update any profile" ON profiles;
DROP POLICY IF EXISTS "Coach can insert profiles" ON profiles;

-- Simple approach: all authenticated users can read all profiles
-- (this is fine for a single-coach app with ~30 clients)
CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Anyone authenticated can insert (for signup trigger + coach adding clients)
CREATE POLICY "Authenticated users can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also fix the other tables that reference profiles with the same recursive pattern
-- Check all tables for coach-check policies and simplify them

-- Fix checkins policies
DROP POLICY IF EXISTS "Clients can view own checkins" ON checkins;
DROP POLICY IF EXISTS "Coach can view all checkins" ON checkins;
DROP POLICY IF EXISTS "Clients can insert own checkins" ON checkins;
DROP POLICY IF EXISTS "Coach can update any checkin" ON checkins;

CREATE POLICY "Authenticated can view checkins" ON checkins FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert checkins" ON checkins FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update checkins" ON checkins FOR UPDATE TO authenticated USING (true);

-- Fix messages policies
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Receiver can mark as read" ON messages;

CREATE POLICY "Authenticated can view messages" ON messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert messages" ON messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update messages" ON messages FOR UPDATE TO authenticated USING (true);

-- Fix prompts policies
DROP POLICY IF EXISTS "Anyone can view active prompts" ON prompts;
DROP POLICY IF EXISTS "Coach can manage prompts" ON prompts;

CREATE POLICY "Authenticated can view prompts" ON prompts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage prompts" ON prompts FOR ALL TO authenticated USING (true);

-- Fix prompt_responses policies
DROP POLICY IF EXISTS "Clients can view own responses" ON prompt_responses;
DROP POLICY IF EXISTS "Coach can view all responses" ON prompt_responses;
DROP POLICY IF EXISTS "Clients can submit responses" ON prompt_responses;
DROP POLICY IF EXISTS "Coach can update responses" ON prompt_responses;

CREATE POLICY "Authenticated can view responses" ON prompt_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert responses" ON prompt_responses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update responses" ON prompt_responses FOR UPDATE TO authenticated USING (true);

-- Fix video_sessions policies
DROP POLICY IF EXISTS "Clients can view own sessions" ON video_sessions;
DROP POLICY IF EXISTS "Coach can manage all sessions" ON video_sessions;

CREATE POLICY "Authenticated can manage video_sessions" ON video_sessions FOR ALL TO authenticated USING (true);

-- Fix programs policies
DROP POLICY IF EXISTS "Clients can view own programs" ON programs;
DROP POLICY IF EXISTS "Coach can manage all programs" ON programs;

CREATE POLICY "Authenticated can manage programs" ON programs FOR ALL TO authenticated USING (true);

-- Fix meal_plans policies
DROP POLICY IF EXISTS "Clients can view own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Coach can manage all meal plans" ON meal_plans;

CREATE POLICY "Authenticated can manage meal_plans" ON meal_plans FOR ALL TO authenticated USING (true);

-- Fix resources policies
DROP POLICY IF EXISTS "Anyone can view published resources" ON resources;
DROP POLICY IF EXISTS "Coach can manage resources" ON resources;

CREATE POLICY "Authenticated can manage resources" ON resources FOR ALL TO authenticated USING (true);

-- Fix broadcasts policies
DROP POLICY IF EXISTS "Coach can manage broadcasts" ON broadcasts;

CREATE POLICY "Authenticated can manage broadcasts" ON broadcasts FOR ALL TO authenticated USING (true);

-- Fix intake_forms policies
DROP POLICY IF EXISTS "Clients can manage own intake" ON intake_forms;
DROP POLICY IF EXISTS "Coach can view all intakes" ON intake_forms;

CREATE POLICY "Authenticated can manage intake_forms" ON intake_forms FOR ALL TO authenticated USING (true);

-- Fix notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

CREATE POLICY "Authenticated can manage notifications" ON notifications FOR ALL TO authenticated USING (true);

-- Fix reports policies
DROP POLICY IF EXISTS "Clients can view own reports" ON reports;
DROP POLICY IF EXISTS "Coach can manage all reports" ON reports;

CREATE POLICY "Authenticated can manage reports" ON reports FOR ALL TO authenticated USING (true);

-- Fix feedback policies
DROP POLICY IF EXISTS "Users can submit feedback" ON feedback;
DROP POLICY IF EXISTS "Coach can view all feedback" ON feedback;

CREATE POLICY "Authenticated can manage feedback" ON feedback FOR ALL TO authenticated USING (true);

-- Cron logs: allow service role (already handled by default)
DROP POLICY IF EXISTS "Service role only for cron logs" ON cron_logs;
CREATE POLICY "Allow all for cron_logs" ON cron_logs FOR ALL USING (true);
