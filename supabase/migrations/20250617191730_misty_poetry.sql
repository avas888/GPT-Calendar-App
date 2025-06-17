/*
  # Fix Personal Management Policies

  This migration fixes the RLS policies for the personal table to allow proper
  creation, reading, updating, and deletion of personal records.

  ## Changes Made:
  1. Drop all existing policies on personal table
  2. Create new comprehensive policies that work with the is_admin_user function
  3. Ensure proper permissions for authenticated users and service role
  4. Add development-friendly anonymous access policies
*/

-- Drop all existing policies on personal table to start fresh
DROP POLICY IF EXISTS "Admins can manage personal" ON public.personal;
DROP POLICY IF EXISTS "Allow anonymous delete for development" ON public.personal;
DROP POLICY IF EXISTS "Allow anonymous insert for development" ON public.personal;
DROP POLICY IF EXISTS "Allow anonymous read for development" ON public.personal;
DROP POLICY IF EXISTS "Allow anonymous update for development" ON public.personal;
DROP POLICY IF EXISTS "Allow initial setup" ON public.personal;
DROP POLICY IF EXISTS "Everyone can read active personal" ON public.personal;
DROP POLICY IF EXISTS "Personal can read own record" ON public.personal;
DROP POLICY IF EXISTS "Admins can manage all personal operations" ON public.personal;
DROP POLICY IF EXISTS "Service role full access to personal" ON public.personal;

-- Create development-friendly policies for anonymous access
-- These allow the app to work without authentication during development
CREATE POLICY "Allow anonymous read for development"
  ON public.personal
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert for development"
  ON public.personal
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update for development"
  ON public.personal
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete for development"
  ON public.personal
  FOR DELETE
  TO anon
  USING (true);

-- Create policies for authenticated users
-- Allow admins to manage all personal records
CREATE POLICY "Admins can manage personal"
  ON public.personal
  FOR ALL
  TO authenticated
  USING (
    -- Allow if user is admin OR if no admin exists yet (initial setup)
    public.is_admin_user() OR 
    NOT EXISTS (SELECT 1 FROM public.user_roles WHERE rol = 'admin')
  )
  WITH CHECK (
    -- Same condition for inserts/updates
    public.is_admin_user() OR 
    NOT EXISTS (SELECT 1 FROM public.user_roles WHERE rol = 'admin')
  );

-- Allow everyone to read active personal (for booking purposes)
CREATE POLICY "Everyone can read active personal"
  ON public.personal
  FOR SELECT
  TO authenticated
  USING (activo = true);

-- Allow personal to read their own record
CREATE POLICY "Personal can read own record"
  ON public.personal
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Ensure service role has full access (for migrations and admin operations)
CREATE POLICY "Service role full access to personal"
  ON public.personal
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions to ensure the policies work
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal TO authenticated;
GRANT ALL ON public.personal TO service_role;

GRANT SELECT ON public.user_roles TO anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Ensure the personal table has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_personal_user_id ON public.personal(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_activo ON public.personal(activo);
CREATE INDEX IF NOT EXISTS idx_personal_nombre ON public.personal(nombre);

-- Add helpful comment
COMMENT ON TABLE public.personal IS 'Staff/personnel table with RLS policies allowing admin management and public reading of active records';