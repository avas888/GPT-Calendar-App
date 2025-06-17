/*
  # Fix Personal Table RLS Policies

  1. Security Updates
    - Update RLS policies for personal table to ensure proper admin access
    - Add missing is_admin_user function if needed
    - Ensure proper role checking mechanism

  2. Changes
    - Drop and recreate problematic policies
    - Add comprehensive admin access policy
    - Ensure service role access for initial setup
*/

-- First, let's ensure we have the is_admin_user function
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user has admin role
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = auth.uid() 
    AND rol = 'admin'
  );
END;
$$;

-- Drop existing problematic policies for personal table
DROP POLICY IF EXISTS "Admins can manage personal" ON personal;
DROP POLICY IF EXISTS "Allow initial setup" ON personal;

-- Create comprehensive admin policy for personal table
CREATE POLICY "Admins can manage all personal operations"
  ON personal
  FOR ALL
  TO authenticated
  USING (
    -- Allow if user is admin OR if no admin exists yet (initial setup)
    public.is_admin_user() OR 
    NOT EXISTS (SELECT 1 FROM user_roles WHERE rol = 'admin')
  )
  WITH CHECK (
    -- Same condition for inserts/updates
    public.is_admin_user() OR 
    NOT EXISTS (SELECT 1 FROM user_roles WHERE rol = 'admin')
  );

-- Ensure service role has full access (for migrations and admin operations)
CREATE POLICY "Service role full access to personal"
  ON personal
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON personal TO authenticated;
GRANT ALL ON personal TO service_role;