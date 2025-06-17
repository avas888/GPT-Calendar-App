/*
  # Fix user_roles RLS policies

  1. Security Changes
    - Update RLS policies for user_roles table to allow proper role management
    - Add policy for admins to manage all user roles
    - Fix policy for users to read their own roles (handle case when no roles exist)
    - Add policy for initial admin setup when no admin exists

  2. Policy Updates
    - Remove restrictive policies that prevent role assignment
    - Add comprehensive policies for different user scenarios
    - Ensure first user can become admin even without existing admin
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;
DROP POLICY IF EXISTS "Allow profile creation function" ON user_roles;

-- Create comprehensive policies for user_roles table

-- Allow admins to manage all user roles
CREATE POLICY "Admins can manage all user roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.rol = 'admin'
    )
  );

-- Allow users to read their own roles (returns empty if no roles exist)
CREATE POLICY "Users can read own roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow role creation when no admin exists (for initial setup)
CREATE POLICY "Allow initial admin creation"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND rol = 'admin' AND NOT EXISTS (
      SELECT 1 FROM user_roles WHERE rol = 'admin'
    )) OR
    (user_id = auth.uid() AND rol != 'admin')
  );

-- Allow users to insert their own non-admin roles
CREATE POLICY "Users can insert own non-admin roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND rol != 'admin'
  );

-- Allow role updates for admins and self-updates for non-admin roles
CREATE POLICY "Allow role updates"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (
    -- Admins can update any role
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.rol = 'admin'
    ) OR
    -- Users can update their own non-admin roles
    (user_id = auth.uid() AND rol != 'admin')
  )
  WITH CHECK (
    -- Admins can set any role
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.rol = 'admin'
    ) OR
    -- Users can only set their own non-admin roles
    (user_id = auth.uid() AND rol != 'admin')
  );