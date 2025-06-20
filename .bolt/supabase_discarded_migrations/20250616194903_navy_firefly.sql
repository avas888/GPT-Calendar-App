/*
  # Create RPC Function for User Profile and Role Management

  1. New Function
    - `handle_auth_user_creation()` - Links Supabase Auth users to app profiles
    - Handles user profile creation and role assignment
    - Resolves conflicts and ensures data consistency

  2. Security
    - SECURITY DEFINER to allow function to bypass RLS
    - Proper error handling and logging
    - Safe upsert operations

  3. Features
    - Creates user profile in usuarios table
    - Assigns appropriate role (admin for admin@agendapro.com)
    - Handles existing users and conflicts
    - Returns success/failure status
*/

-- Create the RPC function to handle auth user creation
CREATE OR REPLACE FUNCTION handle_auth_user_creation(
  auth_user_id uuid,
  auth_email text,
  auth_name text DEFAULT 'Usuario'
)
RETURNS jsonb AS $$
DECLARE
  existing_user_id uuid;
  user_name text;
  result jsonb;
BEGIN
  -- Determine user name
  user_name := COALESCE(auth_name, split_part(auth_email, '@', 1), 'Usuario');
  
  -- Log the start of the function
  RAISE NOTICE 'RPC: handle_auth_user_creation called for user % with email %', auth_user_id, auth_email;
  
  -- Check if there's an existing user profile with this email
  SELECT id INTO existing_user_id 
  FROM usuarios 
  WHERE correo = auth_email;
  
  IF existing_user_id IS NOT NULL AND existing_user_id != auth_user_id THEN
    -- We have a conflict - existing profile with different ID
    RAISE NOTICE 'RPC: Found existing user with email % but different ID. Updating...', auth_email;
    
    -- Update the existing profile to use the auth user ID
    UPDATE usuarios 
    SET id = auth_user_id, nombre = user_name
    WHERE correo = auth_email;
    
    -- Update user_roles to use new ID
    UPDATE user_roles 
    SET user_id = auth_user_id 
    WHERE user_id = existing_user_id;
    
    RAISE NOTICE 'RPC: Linked existing profile % to auth user %', existing_user_id, auth_user_id;
  ELSE
    -- Create or update user profile
    INSERT INTO usuarios (id, correo, nombre)
    VALUES (auth_user_id, auth_email, user_name)
    ON CONFLICT (id) DO UPDATE SET
      correo = EXCLUDED.correo,
      nombre = EXCLUDED.nombre
    ON CONFLICT (correo) DO UPDATE SET
      id = EXCLUDED.id,
      nombre = EXCLUDED.nombre;
      
    RAISE NOTICE 'RPC: Created/updated user profile for %', auth_email;
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
  
  RAISE NOTICE 'RPC: Assigned role for user %', auth_email;
  
  -- Return success result
  result := jsonb_build_object(
    'success', true,
    'user_id', auth_user_id,
    'email', auth_email,
    'name', user_name,
    'role', CASE WHEN auth_email = 'admin@agendapro.com' THEN 'admin' ELSE 'cliente' END
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return failure result
    RAISE WARNING 'RPC: Error in handle_auth_user_creation: %', SQLERRM;
    
    result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', auth_user_id,
      'email', auth_email
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION handle_auth_user_creation TO authenticated;
GRANT EXECUTE ON FUNCTION handle_auth_user_creation TO anon;

-- Add helpful comment
COMMENT ON FUNCTION handle_auth_user_creation IS 'RPC function to create user profiles and assign roles for Supabase Auth users. Handles conflicts and ensures data consistency.';

-- Update configuration to track RPC function creation
INSERT INTO configuracion (key, valor) VALUES
  ('rpc_function_created', NOW()::text),
  ('auth_integration_method', 'rpc_function')
ON CONFLICT (key) DO UPDATE SET 
  valor = EXCLUDED.valor,
  updated_at = NOW();