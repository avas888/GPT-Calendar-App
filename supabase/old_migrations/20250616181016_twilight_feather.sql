/*
  # Simplified Admin Setup Migration
  
  This migration focuses on:
  1. Creating a safe admin role check function
  2. Ensuring admin policies work correctly
  3. Avoiding complex data migrations that can cause issues
  
  Strategy: Let the application handle user creation through normal Supabase Auth flow
*/

-- Create a simple, safe admin check function
CREATE OR REPLACE FUNCTION is_admin_user(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
    -- Return false if no user ID provided
    IF check_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if user has admin role
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = check_user_id AND rol = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin_user TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user TO anon;

-- Update admin policies to use the safe function
-- Only update policies that are causing issues

-- USUARIOS - Allow admin management
DROP POLICY IF EXISTS "Admins can manage all users" ON usuarios;
CREATE POLICY "Admins can manage all users"
  ON usuarios
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- SERVICIOS
DROP POLICY IF EXISTS "Admins can manage services" ON servicios;
CREATE POLICY "Admins can manage services"
  ON servicios
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- PERSONAL  
DROP POLICY IF EXISTS "Admins can manage personal" ON personal;
CREATE POLICY "Admins can manage personal"
  ON personal
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- CITAS
DROP POLICY IF EXISTS "Admins can manage all appointments" ON citas;
CREATE POLICY "Admins can manage all appointments"
  ON citas
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- CONFIGURACION
DROP POLICY IF EXISTS "Admins can manage configuration" ON configuracion;
CREATE POLICY "Admins can manage configuration"
  ON configuracion
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Add configuration tracking
INSERT INTO configuracion (key, valor) VALUES
    ('admin_policies_simplified', NOW()::text),
    ('migration_approach', 'simplified_safe')
ON CONFLICT (key) DO UPDATE SET 
    valor = EXCLUDED.valor,
    updated_at = NOW();

-- Add helpful comment
COMMENT ON FUNCTION is_admin_user IS 'Safe admin check function without complex data migrations';