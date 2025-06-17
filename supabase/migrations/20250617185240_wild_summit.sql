/*
  # Fix infinite recursion in user_roles RLS policies

  1. Problem
    - Current RLS policies on user_roles table are causing infinite recursion
    - Policies are trying to query user_roles table to determine access, creating circular dependency
    - This breaks all database operations and causes session timeouts

  2. Solution
    - Drop all existing problematic policies on user_roles table
    - Create simplified policies that don't cause recursion
    - Use direct user ID comparisons instead of role-based checks where possible
    - Create a safe admin check function that doesn't cause recursion

  3. Changes
    - Remove recursive policies
    - Add simple, non-recursive policies for user_roles access
    - Ensure users can read their own roles
    - Allow safe admin operations
*/

-- Drop all existing policies on user_roles to start fresh
DROP POLICY IF EXISTS "Admins can manage all user roles" ON user_roles;
DROP POLICY IF EXISTS "Allow anonymous delete user_roles (dev)" ON user_roles;
DROP POLICY IF EXISTS "Allow anonymous insert user_roles (dev)" ON user_roles;
DROP POLICY IF EXISTS "Allow anonymous read user_roles (dev)" ON user_roles;
DROP POLICY IF EXISTS "Allow anonymous update user_roles (dev)" ON user_roles;
DROP POLICY IF EXISTS "Allow initial admin creation" ON user_roles;
DROP POLICY IF EXISTS "Allow role updates" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own non-admin roles" ON user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;

-- Create a safe function to check if user is admin without recursion
-- This function will be used by other tables, not by user_roles itself
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND rol = 'admin'
  );
$$;

-- Create simple, non-recursive policies for user_roles table
-- These policies do NOT use the is_admin_user() function to avoid recursion

-- Allow anonymous access for development (temporary)
CREATE POLICY "Allow anonymous read user_roles (dev)"
  ON user_roles
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert user_roles (dev)"
  ON user_roles
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update user_roles (dev)"
  ON user_roles
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete user_roles (dev)"
  ON user_roles
  FOR DELETE
  TO anon
  USING (true);

-- Allow authenticated users to read their own roles
CREATE POLICY "Users can read own roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to insert their own non-admin roles
CREATE POLICY "Users can insert own non-admin roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND rol != 'admin');

-- Allow users to update their own non-admin roles
CREATE POLICY "Users can update own non-admin roles"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND rol != 'admin')
  WITH CHECK (user_id = auth.uid() AND rol != 'admin');

-- Special policy for initial admin creation (first user becomes admin)
CREATE POLICY "Allow initial admin creation"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND rol = 'admin' 
    AND NOT EXISTS (
      SELECT 1 FROM user_roles WHERE rol = 'admin'
    )
  );

-- Allow service role (backend) to manage all user roles
-- This is for administrative operations that need to be done server-side
CREATE POLICY "Service role can manage all user roles"
  ON user_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update the is_admin_user function comment to clarify its usage
COMMENT ON FUNCTION is_admin_user() IS 'Safe function to check if current user is admin. Should NOT be used in user_roles table policies to avoid recursion.';