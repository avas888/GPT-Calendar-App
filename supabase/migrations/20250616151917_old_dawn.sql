/*
  # Fix admin user creation RLS policy

  1. Security Updates
    - Add policy for admins to create new users
    - Ensure admins can manage user accounts
  
  2. Changes
    - Add "Admins can create users" policy to usuarios table
    - This allows admin users to create client accounts through the appointment form
*/

-- Add policy for admins to create new users
CREATE POLICY "Admins can create users"
  ON usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.rol = 'admin'
    )
  );

-- Add policy for admins to read all users (needed for the dropdown)
CREATE POLICY "Admins can read all users"
  ON usuarios
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.rol = 'admin'
    )
  );