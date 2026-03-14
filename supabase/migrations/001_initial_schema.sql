-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('coach', 'client')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  package TEXT CHECK (package IN ('essential', 'performance', 'elite')),
  start_date DATE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'past_due', 'cancelled', 'trialing')),
  goals TEXT,
  medical_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly check-ins (body metrics)
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg NUMERIC,
  body_fat_pct NUMERIC,
  muscle_mass_kg NUMERIC,
  visceral_fat_level INTEGER,
  body_water_pct NUMERIC,
  bmi NUMERIC,
  chest_cm NUMERIC,
  waist_cm NUMERIC,
  hips_cm NUMERIC,
  left_arm_cm NUMERIC,
  right_arm_cm NUMERIC,
  left_thigh_cm NUMERIC,
  right_thigh_cm NUMERIC,
  left_calf_cm NUMERIC,
  right_calf_cm NUMERIC,
  photo_front_url TEXT,
  photo_back_url TEXT,
  photo_left_url TEXT,
  photo_right_url TEXT,
  coach_notes TEXT,
  coach_reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly/auto check-in messages
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('weekly_1', 'weekly_2', 'custom')),
  is_active BOOLEAN DEFAULT TRUE,
  send_day INTEGER CHECK (send_day BETWEEN 0 AND 6),
  send_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prompt_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 5),
  energy_score INTEGER CHECK (energy_score BETWEEN 1 AND 5),
  sleep_score INTEGER CHECK (sleep_score BETWEEN 1 AND 5),
  coach_seen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- In-app messaging
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'file')),
  file_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video call sessions
CREATE TABLE video_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  daily_room_url TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 20,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout programs
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  hevy_program_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal plans
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content JSONB,
  pdf_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resources library
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('video', 'pdf', 'article', 'tip')),
  content_url TEXT,
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT '{}',
  visible_to TEXT[] DEFAULT '{}',
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Broadcasts (coach → all/selected clients)
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_clients TEXT[] DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding intake
CREATE TABLE intake_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  primary_goal TEXT,
  secondary_goals TEXT[],
  training_experience TEXT,
  injuries_limitations TEXT,
  current_activity_level TEXT,
  preferred_training_days TEXT[],
  dietary_preferences TEXT,
  dietary_restrictions TEXT,
  sleep_hours_avg NUMERIC,
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
  motivation_statement TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_checkins_client_id ON checkins(client_id);
CREATE INDEX idx_checkins_date ON checkins(date DESC);
CREATE INDEX idx_prompt_responses_client_id ON prompt_responses(client_id);
CREATE INDEX idx_prompt_responses_prompt_id ON prompt_responses(prompt_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_video_sessions_client_id ON video_sessions(client_id);
CREATE INDEX idx_video_sessions_scheduled_at ON video_sessions(scheduled_at);
CREATE INDEX idx_programs_client_id ON programs(client_id);
CREATE INDEX idx_meal_plans_client_id ON meal_plans(client_id);
CREATE INDEX idx_resources_published ON resources(published) WHERE published = TRUE;
CREATE INDEX idx_intake_forms_client_id ON intake_forms(client_id);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_forms ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Profiles
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Coach can read all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);
CREATE POLICY "Coach can insert profiles" ON profiles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);
CREATE POLICY "Coach can update all profiles" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- RLS Policies: Check-ins
CREATE POLICY "Clients can view own checkins" ON checkins FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Clients can insert own checkins" ON checkins FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY "Coach can view all checkins" ON checkins FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);
CREATE POLICY "Coach can update all checkins" ON checkins FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- RLS Policies: Messages
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users can update own messages" ON messages FOR UPDATE USING (
  receiver_id = auth.uid()
);

-- RLS Policies: Prompts (coach manages, all can read)
CREATE POLICY "Anyone can read active prompts" ON prompts FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Coach can manage prompts" ON prompts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- RLS Policies: Prompt Responses
CREATE POLICY "Clients can view own responses" ON prompt_responses FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Clients can insert own responses" ON prompt_responses FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY "Coach can view all responses" ON prompt_responses FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);
CREATE POLICY "Coach can update all responses" ON prompt_responses FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- RLS Policies: Video Sessions
CREATE POLICY "Clients can view own sessions" ON video_sessions FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Coach can manage video sessions" ON video_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- RLS Policies: Programs
CREATE POLICY "Clients can view own programs" ON programs FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Coach can manage programs" ON programs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- RLS Policies: Meal Plans
CREATE POLICY "Clients can view own meal plans" ON meal_plans FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Coach can manage meal plans" ON meal_plans FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- RLS Policies: Resources (published resources visible to all, coach manages)
CREATE POLICY "Users can view published resources" ON resources FOR SELECT USING (published = TRUE);
CREATE POLICY "Coach can manage resources" ON resources FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- RLS Policies: Broadcasts
CREATE POLICY "Clients can view broadcasts" ON broadcasts FOR SELECT USING (TRUE);
CREATE POLICY "Coach can manage broadcasts" ON broadcasts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- RLS Policies: Intake Forms
CREATE POLICY "Clients can view own intake" ON intake_forms FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Clients can insert own intake" ON intake_forms FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY "Clients can update own intake" ON intake_forms FOR UPDATE USING (client_id = auth.uid());
CREATE POLICY "Coach can view all intakes" ON intake_forms FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE prompt_responses;
