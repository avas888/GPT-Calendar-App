/*
  # Fix user_roles RLS policies to prevent infinite recursion

  1. Security Changes
    - Drop ALL existing RLS policies on user_roles table
    - Re-create only essential, non-recursive policies
    - Add table comment for documentation

  2. Policies Created
    - Users can read own roles (safe, no recursion)
    - Users can insert own role (safe, no recursion)
    - Remove admin management policy (causes recursion)

  3. Notes
    - Admin operations should use service role key
    - This prevents infinite recursion in policy evaluation
*/

-- Drop ALL existing policies on user_roles table to ensure clean slate
DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;
DROP POLICY IF EXISTS "Users can create own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

-- Re-create only the essential, non-recursive policies

-- Policy 1: Allow users to read their own roles
CREATE POLICY "Users can read own roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Allow users to insert their own role record
CREATE POLICY "Users can insert own role"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Add documentation comment explaining the simplified approach
COMMENT ON TABLE user_roles IS 'RLS policies simplified to prevent infinite recursion. Admin operations should use service role key.';

-- Ensure RLS is enabled
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;