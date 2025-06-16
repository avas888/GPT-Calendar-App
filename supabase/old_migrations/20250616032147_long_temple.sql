/*
  # Fix Authentication and User Profile Creation

  1. Database Functions
    - Create `create_user_profile()` function for handling user registration
    - Handles both regular users and admin accounts
    - Includes proper conflict resolution

  2. Security Policies
    - Update existing policies or create new ones safely
    - Ensure users can create their own profiles and roles
    - Handle admin role assignment

  3. Configuration
    - Set admin email configuration
*/

-- Drop the existing trigger and function that might be causing issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a simpler function that can be called from the application
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

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can create own profile" ON usuarios;
DROP POLICY IF EXISTS "Users can create own role" ON user_roles;

-- Create the policies for usuarios table
CREATE POLICY "Users can create own profile"
  ON usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create the policies for user_roles table  
CREATE POLICY "Users can create own role"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Ensure the admin email configuration is set
INSERT INTO configuracion (key, valor) VALUES
  ('admin_email', 'admin@agendapro.com')
ON CONFLICT (key) DO UPDATE SET valor = EXCLUDED.valor;