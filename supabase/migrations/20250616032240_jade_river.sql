/*
  # Fix Authentication Setup

  1. Clean Setup
    - Drop any conflicting policies and functions
    - Create clean user profile creation function
    - Set up proper RLS policies
    - Configure admin email

  2. Security
    - Enable RLS on all tables
    - Create policies for user profile and role management
    - Grant proper permissions
*/

-- Clean up any existing conflicting objects
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS create_user_profile(uuid, text, text) CASCADE;

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can create own profile" ON usuarios;
DROP POLICY IF EXISTS "Users can create own role" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own profile" ON usuarios;
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;

-- Create the user profile creation function
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id uuid,
  user_email text,
  user_name text DEFAULT 'Usuario'
)
RETURNS void AS $$
BEGIN
  -- Insert into usuarios table
  INSERT INTO usuarios (id, correo, nombre)
  VALUES (user_id, user_email, user_name)
  ON CONFLICT (id) DO UPDATE SET
    correo = EXCLUDED.correo,
    nombre = EXCLUDED.nombre;
  
  -- Assign admin role if this is the admin email, otherwise assign cliente role
  INSERT INTO user_roles (user_id, rol)
  VALUES (
    user_id, 
    CASE 
      WHEN user_email = 'admin@agendapro.com' THEN 'admin'
      ELSE 'cliente'
    END
  )
  ON CONFLICT (user_id, rol) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile TO authenticated;

-- Create policies for usuarios table
CREATE POLICY "Users can insert own profile"
  ON usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policies for user_roles table  
CREATE POLICY "Users can insert own role"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Ensure the admin email configuration is set
INSERT INTO configuracion (key, valor) VALUES
  ('admin_email', 'admin@agendapro.com')
ON CONFLICT (key) DO UPDATE SET valor = EXCLUDED.valor;

-- Add a setup completion flag
INSERT INTO configuracion (key, valor) VALUES
  ('auth_setup_completed', 'true')
ON CONFLICT (key) DO UPDATE SET valor = EXCLUDED.valor;