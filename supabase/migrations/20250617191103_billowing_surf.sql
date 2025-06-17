/*
  # Fix Personal Table RLS Policies

  1. Issues Fixed
    - Resolves RLS policy violations for personal table operations
    - Fixes function conflicts by properly dropping existing functions
    - Ensures admin users can manage personal records

  2. Changes
    - Drops and recreates is_admin_user function with proper signature
    - Updates personal table policies to allow admin operations
    - Adds service role access for administrative operations
*/

-- Drop existing is_admin_user function variants to avoid conflicts
DROP FUNCTION IF EXISTS public.is_admin_user();
DROP FUNCTION IF EXISTS public.is_admin_user(uuid);
DROP FUNCTION IF EXISTS is_admin_user();
DROP FUNCTION IF EXISTS is_admin_user(uuid);

-- Create the is_admin_user function with explicit signature
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if the current authenticated user has admin role
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND rol = 'admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return false if any error occurs (e.g., no auth context)
    RETURN false;
END;
$$;

-- Drop existing problematic policies for personal table
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
    public.is_admin_user() = true OR 
    NOT EXISTS (SELECT 1 FROM public.user_roles WHERE rol = 'admin')
  )
  WITH CHECK (
    -- Same condition for inserts/updates
    public.is_admin_user() = true OR 
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