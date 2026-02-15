-- ==========================================
-- Supabase Database Setup for Financial Agent
-- ==========================================

-- Create Plans Table
CREATE TABLE IF NOT EXISTS plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Investments Table
CREATE TABLE IF NOT EXISTS investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  house TEXT,
  amount NUMERIC DEFAULT 0,
  monthly NUMERIC DEFAULT 0,
  return_rate NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  fee_deposit NUMERIC DEFAULT 0,
  fee_annual NUMERIC DEFAULT 0,
  for_dream BOOLEAN DEFAULT false,
  include BOOLEAN DEFAULT true,
  gender TEXT,
  sub_tracks JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Dreams Table
CREATE TABLE IF NOT EXISTS dreams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  years INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- Enable Row Level Security (RLS)
-- ==========================================

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS Policies for PLANS
-- ==========================================

-- SELECT Policy
CREATE POLICY "Users can view own plans" ON plans
  FOR SELECT 
  USING (auth.uid() = user_id);

-- INSERT Policy
CREATE POLICY "Users can insert own plans" ON plans
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- UPDATE Policy
CREATE POLICY "Users can update own plans" ON plans
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- DELETE Policy
CREATE POLICY "Users can delete own plans" ON plans
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ==========================================
-- RLS Policies for INVESTMENTS
-- ==========================================

-- SELECT Policy
CREATE POLICY "Users can view own investments" ON investments
  FOR SELECT 
  USING (auth.uid() = user_id);

-- INSERT Policy
CREATE POLICY "Users can insert own investments" ON investments
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- UPDATE Policy
CREATE POLICY "Users can update own investments" ON investments
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- DELETE Policy
CREATE POLICY "Users can delete own investments" ON investments
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ==========================================
-- RLS Policies for DREAMS
-- ==========================================

-- SELECT Policy
CREATE POLICY "Users can view own dreams" ON dreams
  FOR SELECT 
  USING (auth.uid() = user_id);

-- INSERT Policy
CREATE POLICY "Users can insert own dreams" ON dreams
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- UPDATE Policy
CREATE POLICY "Users can update own dreams" ON dreams
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- DELETE Policy
CREATE POLICY "Users can delete own dreams" ON dreams
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ==========================================
-- DONE!
-- ==========================================
-- כל המשתמשים עכשיו יכולים לראות רק את הנתונים שלהם
