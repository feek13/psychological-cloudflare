-- Fix assessments table RLS policy to allow admin and teachers to view student assessments
-- Run this script in the Supabase SQL editor or via psql

-- First, check current policies on assessments table
-- SELECT * FROM pg_policies WHERE tablename = 'assessments';

-- Drop existing restrictive policies (if exists)
DROP POLICY IF EXISTS "Users can view own assessments" ON assessments;
DROP POLICY IF EXISTS "assessments_select_policy" ON assessments;
DROP POLICY IF EXISTS "Enable read access for users" ON assessments;

-- Create new policies

-- 1. Users can always view their own assessments
CREATE POLICY "Users can view own assessments"
ON assessments FOR SELECT
USING (auth.uid() = user_id);

-- 2. Admins can view all assessments
CREATE POLICY "Admins can view all assessments"
ON assessments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. Teachers can view all student assessments
CREATE POLICY "Teachers can view student assessments"
ON assessments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- 4. Users can insert their own assessments
DROP POLICY IF EXISTS "Users can insert own assessments" ON assessments;
CREATE POLICY "Users can insert own assessments"
ON assessments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5. Users can update their own assessments
DROP POLICY IF EXISTS "Users can update own assessments" ON assessments;
CREATE POLICY "Users can update own assessments"
ON assessments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'assessments';
