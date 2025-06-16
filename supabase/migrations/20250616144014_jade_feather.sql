/*
  # Fix Personal Table Admin Access

  1. Security Updates
    - Add policy to allow initial admin setup
    - Ensure admin users can manage personal records
    - Add fallback policy for users without roles during initial setup

  2. Changes
    - Add temporary policy for initial admin setup
    - Modify existing policies to be more robust
*/

-- Drop existing policies to recreate them with better logic
DROP POLICY IF EXISTS "Admins can manage personal" ON personal;
DROP POLICY IF EXISTS "Everyone can read active personal" ON personal;
DROP POLICY IF EXISTS "Personal can read own record" ON personal;

-- Create improved policies
CREATE POLICY "Admins can manage personal"
  ON personal
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.rol = 'admin'
    )
  );

-- Allow reading active personal for everyone
CREATE POLICY "Everyone can read active personal"
  ON personal
  FOR SELECT
  TO authenticated
  USING (activo = true);

-- Allow personal to read their own record
CREATE POLICY "Personal can read own record"
  ON personal
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Temporary policy for initial setup - allows first user to create personal records
-- This should be removed after initial admin setup
CREATE POLICY "Allow initial setup"
  ON personal
  FOR ALL
  TO authenticated
  USING (
    -- Allow if user has admin role OR if no admin exists yet (initial setup)
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.rol = 'admin'
    )
    OR
    NOT EXISTS (
      SELECT 1 FROM user_roles WHERE rol = 'admin'
    )
  )
  WITH CHECK (
    -- Allow if user has admin role OR if no admin exists yet (initial setup)
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.rol = 'admin'
    )
    OR
    NOT EXISTS (
      SELECT 1 FROM user_roles WHERE rol = 'admin'
    )
  );

-- Function to ensure first authenticated user gets admin role
CREATE OR REPLACE FUNCTION ensure_first_user_is_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is the first user and no admin exists, make them admin
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE rol = 'admin') THEN
    INSERT INTO user_roles (user_id, rol)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, rol) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically assign admin role to first user
DROP TRIGGER IF EXISTS ensure_first_user_admin_trigger ON usuarios;
CREATE TRIGGER ensure_first_user_admin_trigger
  AFTER INSERT ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION ensure_first_user_is_admin();