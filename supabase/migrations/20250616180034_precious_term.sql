/*
  # Fix Admin Setup and Authentication Integration

  1. Functions
    - `ensure_admin_user_setup()` - Creates admin user and role if needed
    - `handle_auth_user_creation()` - Links Supabase Auth to app profiles
    - `is_admin_user()` - Helper function to check admin status safely

  2. Security
    - Updates all admin policies to use helper function
    - Prevents RLS recursion issues
    - Handles duplicate user scenarios

  3. Configuration
    - Tracks admin setup completion
    - Enables maximum admin credentials
*/

-- Function to ensure admin user has all necessary setup
CREATE OR REPLACE FUNCTION ensure_admin_user_setup()
RETURNS void AS $$
DECLARE
    admin_user_id uuid;
    admin_email text := 'admin@agendapro.com';
    existing_admin_id uuid;
BEGIN
    -- Check if admin user already exists by email
    SELECT id INTO existing_admin_id 
    FROM usuarios 
    WHERE correo = admin_email;
    
    -- Check if admin role exists
    SELECT user_id INTO admin_user_id 
    FROM user_roles 
    WHERE rol = 'admin' 
    LIMIT 1;
    
    -- If admin user exists but no admin role, assign the role
    IF existing_admin_id IS NOT NULL AND admin_user_id IS NULL THEN
        INSERT INTO user_roles (user_id, rol)
        VALUES (existing_admin_id, 'admin')
        ON CONFLICT (user_id, rol) DO NOTHING;
        
        RAISE NOTICE 'Assigned admin role to existing user: %', existing_admin_id;
    
    -- If no admin user exists at all, create placeholder
    ELSIF existing_admin_id IS NULL AND admin_user_id IS NULL THEN
        -- Generate a UUID for the admin user
        admin_user_id := gen_random_uuid();
        
        -- Insert admin user profile
        INSERT INTO usuarios (id, correo, nombre)
        VALUES (admin_user_id, admin_email, 'Administrador')
        ON CONFLICT (correo) DO UPDATE SET
            nombre = EXCLUDED.nombre;
        
        -- Get the actual ID (in case of conflict resolution)
        SELECT id INTO admin_user_id FROM usuarios WHERE correo = admin_email;
        
        -- Assign admin role
        INSERT INTO user_roles (user_id, rol)
        VALUES (admin_user_id, 'admin')
        ON CONFLICT (user_id, rol) DO NOTHING;
        
        RAISE NOTICE 'Created admin user with ID: %', admin_user_id;
    END IF;
    
    -- Ensure admin configuration is set
    INSERT INTO configuracion (key, valor) VALUES
        ('admin_email', admin_email),
        ('admin_setup_completed', 'true'),
        ('max_credentials_enabled', 'true')
    ON CONFLICT (key) DO UPDATE SET 
        valor = EXCLUDED.valor,
        updated_at = NOW();
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle auth user creation and link to existing profile
CREATE OR REPLACE FUNCTION handle_auth_user_creation(
    auth_user_id uuid,
    auth_email text,
    auth_name text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    existing_user_id uuid;
    user_name text;
    existing_by_email uuid;
    existing_by_id uuid;
BEGIN
    -- Determine user name
    user_name := COALESCE(auth_name, split_part(auth_email, '@', 1), 'Usuario');
    
    -- Check if there's an existing user profile with this email
    SELECT id INTO existing_by_email 
    FROM usuarios 
    WHERE correo = auth_email;
    
    -- Check if there's an existing user profile with this ID
    SELECT id INTO existing_by_id 
    FROM usuarios 
    WHERE id = auth_user_id;
    
    IF existing_by_email IS NOT NULL AND existing_by_email != auth_user_id THEN
        -- We have a conflict - existing profile with different ID
        -- Update the existing profile to use the auth user ID
        UPDATE usuarios 
        SET id = auth_user_id, nombre = user_name
        WHERE correo = auth_email;
        
        -- Update user_roles to use new ID
        UPDATE user_roles 
        SET user_id = auth_user_id 
        WHERE user_id = existing_by_email;
        
        RAISE NOTICE 'Linked existing profile % to auth user %', existing_by_email, auth_user_id;
        
    ELSIF existing_by_id IS NOT NULL THEN
        -- User exists with this ID, just update email and name
        UPDATE usuarios 
        SET correo = auth_email, nombre = user_name
        WHERE id = auth_user_id;
        
    ELSE
        -- No conflicts, create new user profile
        INSERT INTO usuarios (id, correo, nombre)
        VALUES (auth_user_id, auth_email, user_name);
    END IF;
    
    -- Ensure user has appropriate role
    INSERT INTO user_roles (user_id, rol)
    VALUES (
        auth_user_id,
        CASE 
            WHEN auth_email = 'admin@agendapro.com' THEN 'admin'
            ELSE 'cliente'
        END
    )
    ON CONFLICT (user_id, rol) DO NOTHING;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a helper function to check if user is admin (to avoid recursion)
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
GRANT EXECUTE ON FUNCTION ensure_admin_user_setup TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_admin_user_setup TO anon;
GRANT EXECUTE ON FUNCTION handle_auth_user_creation TO authenticated;
GRANT EXECUTE ON FUNCTION handle_auth_user_creation TO anon;
GRANT EXECUTE ON FUNCTION is_admin_user TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user TO anon;

-- Run the admin setup function
SELECT ensure_admin_user_setup();

-- Update admin policies for key tables using the helper function
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

-- USUARIOS
DROP POLICY IF EXISTS "Admins can read all users" ON usuarios;
DROP POLICY IF EXISTS "Admins can create users" ON usuarios;
DROP POLICY IF EXISTS "Admins can manage all users" ON usuarios;
CREATE POLICY "Admins can manage all users"
  ON usuarios
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- DISPONIBILIDAD
DROP POLICY IF EXISTS "Admins can manage availability" ON disponibilidad;
CREATE POLICY "Admins can manage availability"
  ON disponibilidad
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- AUSENCIAS
DROP POLICY IF EXISTS "Admins can manage absences" ON ausencias;
CREATE POLICY "Admins can manage absences"
  ON ausencias
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- TERCEROS
DROP POLICY IF EXISTS "Admins can manage terceros" ON terceros;
CREATE POLICY "Admins can manage terceros"
  ON terceros
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- FACTURAS
DROP POLICY IF EXISTS "Admins can manage all invoices" ON facturas;
CREATE POLICY "Admins can manage all invoices"
  ON facturas
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- INTEGRACIONES
DROP POLICY IF EXISTS "Admins can manage integrations" ON integraciones;
CREATE POLICY "Admins can manage integrations"
  ON integraciones
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Add configuration to track this setup
INSERT INTO configuracion (key, valor) VALUES
    ('admin_policies_updated', NOW()::text),
    ('max_admin_credentials', 'enabled'),
    ('recursion_safe_policies', 'true'),
    ('migration_syntax_fixed', 'true')
ON CONFLICT (key) DO UPDATE SET 
    valor = EXCLUDED.valor,
    updated_at = NOW();

-- Add helpful comments
COMMENT ON FUNCTION is_admin_user IS 'Helper function to check admin status without causing RLS recursion';
COMMENT ON FUNCTION ensure_admin_user_setup IS 'Ensures admin user profile and role exist for maximum app access, handles duplicates safely';
COMMENT ON FUNCTION handle_auth_user_creation IS 'Links Supabase Auth users to app profiles with proper roles, resolves ID conflicts';