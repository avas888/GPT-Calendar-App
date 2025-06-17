/*
  # Fix Personal Table RLS Policies

  1. Security Updates
    - Update existing is_admin_user function to handle edge cases
    - Fix personal table policies to allow admin operations
    - Ensure proper permissions for authenticated users

  2. Changes
    - Update is_admin_user function with better error handling
    - Replace problematic personal table policies
    - Add proper grants for table access
*/

-- Update the existing is_admin_user function to handle edge cases better
-- We'll create a new version that's more robust
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if the current authenticated user has admin role
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND rol = 'admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return false if any error occurs
    RETURN false;
END;
$$;

-- Drop existing problematic policies for personal table only
DROP POLICY IF EXISTS "Admins can manage personal" ON public.personal;
DROP POLICY IF EXISTS "Allow initial setup" ON public.personal;
DROP POLICY IF EXISTS "Admins can manage all personal operations" ON public.personal;
DROP POLICY IF EXISTS "Service role full access to personal" ON public.personal;

-- Create comprehensive admin policy for personal table
CREATE POLICY "Admins can manage all personal operations"
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

-- Ensure service role has full access (for migrations and admin operations)
CREATE POLICY "Service role full access to personal"
  ON public.personal
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.personal TO authenticated;
GRANT ALL ON public.personal TO service_role;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Ensure the personal table has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_personal_user_id ON public.personal(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_activo ON public.personal(activo);