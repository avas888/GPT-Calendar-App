/*
  # Fix user_roles RLS policies - Final Solution

  1. Complete cleanup of all existing policies
  2. Create only essential, non-recursive policies
  3. Ensure proper function permissions
  4. Add comprehensive documentation
*/

-- Drop ALL existing policies on user_roles table
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_roles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_roles', policy_record.policyname);
    END LOOP;
END $$;

-- Drop and recreate the user profile creation function with proper security
DROP FUNCTION IF EXISTS create_user_profile(uuid, text, text) CASCADE;

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
GRANT EXECUTE ON FUNCTION create_user_profile TO anon;

-- Ensure RLS is enabled
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create ONLY the essential policies that don't cause recursion

-- Policy 1: Allow users to read their own roles
CREATE POLICY "Users can read own roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Allow users to insert their own role record (for signup)
CREATE POLICY "Users can insert own role"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy 3: Allow the create_user_profile function to work
CREATE POLICY "Allow profile creation function"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add comprehensive documentation
COMMENT ON TABLE user_roles IS 'User roles table with simplified RLS policies to prevent infinite recursion. Admin operations should use service role key or be handled through application logic.';

COMMENT ON POLICY "Users can read own roles" ON user_roles IS 'Allows users to read their own role assignments without recursion.';

COMMENT ON POLICY "Users can insert own role" ON user_roles IS 'Allows users to create their initial role assignment during signup.';

COMMENT ON POLICY "Allow profile creation function" ON user_roles IS 'Allows the create_user_profile function to insert roles during user registration.';

-- Ensure admin configuration is set
INSERT INTO configuracion (key, valor) VALUES
  ('admin_email', 'admin@agendapro.com'),
  ('rls_policies_fixed', 'true'),
  ('last_policy_update', NOW()::text)
ON CONFLICT (key) DO UPDATE SET 
  valor = EXCLUDED.valor,
  updated_at = NOW();