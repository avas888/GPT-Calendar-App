/*
  # Ensure Admin User Setup and Maximum Credentials

  1. Database Functions
    - Create function to ensure admin user gets all necessary permissions
    - Handle user profile creation with proper role assignment
    - Ensure admin email gets admin role automatically

  2. Security Policies
    - Ensure admin users have full access to all tables
    - Create policies that don't cause infinite recursion
    - Grant maximum permissions to admin role

  3. Data Integrity
    - Ensure admin user exists in usuarios table
    - Ensure admin role is assigned correctly
    - Create default admin if none exists
*/

-- Function to ensure admin user has all necessary setup
CREATE OR REPLACE FUNCTION ensure_admin_user_setup()
RETURNS void AS $$
DECLARE
    admin_user_id uuid;
    admin_email text := 'admin@agendapro.com';
BEGIN
    -- Check if admin user exists in auth.users (this would be created via Supabase Auth)
    -- We'll focus on ensuring the profile and role exist
    
    -- First, let's see if we have any admin users
    SELECT user_id INTO admin_user_id 
    FROM user_roles 
    WHERE rol = 'admin' 
    LIMIT 1;
    
    -- If no admin exists, we'll create a placeholder that will be linked when auth user is created
    IF admin_user_id IS NULL THEN
        -- Generate a UUID for the admin user
        admin_user_id := gen_random_uuid();
        
        -- Insert admin user profile (this will be updated when real auth user is created)
        INSERT INTO usuarios (id, correo, nombre)
        VALUES (admin_user_id, admin_email, 'Administrador')
        ON CONFLICT (id) DO UPDATE SET
            correo = EXCLUDED.correo,
            nombre = EXCLUDED.nombre;
        
        -- Assign admin role
        INSERT INTO user_roles (user_id, rol)
        VALUES (admin_user_id, 'admin')
        ON CONFLICT (user_id, rol) DO NOTHING;
        
        RAISE NOTICE 'Created placeholder admin user with ID: %', admin_user_id;
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
BEGIN
    -- Determine user name
    user_name := COALESCE(auth_name, split_part(auth_email, '@', 1), 'Usuario');
    
    -- Check if there's an existing user profile with this email
    SELECT id INTO existing_user_id 
    FROM usuarios 
    WHERE correo = auth_email;
    
    IF existing_user_id IS NOT NULL AND existing_user_id != auth_user_id THEN
        -- Update existing profile to use the new auth user ID
        UPDATE usuarios 
        SET id = auth_user_id, nombre = user_name
        WHERE id = existing_user_id;
        
        -- Update user_roles to use new ID
        UPDATE user_roles 
        SET user_id = auth_user_id 
        WHERE user_id = existing_user_id;
        
        RAISE NOTICE 'Linked existing profile % to auth user %', existing_user_id, auth_user_id;
    ELSE
        -- Create new user profile
        INSERT INTO usuarios (id, correo, nombre)
        VALUES (auth_user_id, auth_email, user_name)
        ON CONFLICT (id) DO UPDATE SET
            correo = EXCLUDED.correo,
            nombre = EXCLUDED.nombre;
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION ensure_admin_user_setup TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_admin_user_setup TO anon;
GRANT EXECUTE ON FUNCTION handle_auth_user_creation TO authenticated;
GRANT EXECUTE ON FUNCTION handle_auth_user_creation TO anon;

-- Run the admin setup function
SELECT ensure_admin_user_setup();

-- Add comprehensive admin policies for all tables
-- These policies ensure admin users have full access without recursion issues

-- Create a helper function to check if user is admin (to avoid recursion)
CREATE OR REPLACE FUNCTION is_admin_user(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = check_user_id AND rol = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin_user TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user TO anon;

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
CREATE POLICY "Admins can manage all users"
  ON usuarios
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Add configuration to track this setup
INSERT INTO configuracion (key, valor) VALUES
    ('admin_policies_updated', NOW()::text),
    ('max_admin_credentials', 'enabled'),
    ('recursion_safe_policies', 'true')
ON CONFLICT (key) DO UPDATE SET 
    valor = EXCLUDED.valor,
    updated_at = NOW();

-- Add helpful comments
COMMENT ON FUNCTION is_admin_user IS 'Helper function to check admin status without causing RLS recursion';
COMMENT ON FUNCTION ensure_admin_user_setup IS 'Ensures admin user profile and role exist for maximum app access';
COMMENT ON FUNCTION handle_auth_user_creation IS 'Links Supabase Auth users to app profiles with proper roles';