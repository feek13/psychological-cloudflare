-- Fix profiles table RLS policy to allow admin and teachers to view student profiles
-- Run this script in the Supabase SQL editor or via psql

-- First, check current policies on profiles table
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Drop existing restrictive policy (if exists)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users" ON profiles;

-- Create new policies

-- 1. Users can always view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- 2. Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. Teachers can view student profiles (simplified - allow teachers to see all students)
CREATE POLICY "Teachers can view student profiles"
ON profiles FOR SELECT
USING (
  -- Current user is a teacher
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'teacher'
  )
  AND
  -- Target profile is a student
  role = 'student'
);

-- 4. Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';
