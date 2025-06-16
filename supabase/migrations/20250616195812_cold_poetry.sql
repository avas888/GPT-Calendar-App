/*
  # Fix RPC Function for User Profile Creation

  1. Database Functions
    - Fix `handle_auth_user_creation()` function with proper INSERT ... ON CONFLICT syntax
    - Handles both id and email unique constraints correctly
    - Returns proper JSON response for application use

  2. Security
    - Maintains SECURITY DEFINER for proper permissions
    - Grants execute to authenticated and anonymous users
    - Includes proper error handling

  3. Configuration
    - Tracks RPC function creation and fixes
*/

-- Create the RPC function to handle auth user creation with proper syntax
CREATE OR REPLACE FUNCTION handle_auth_user_creation(
  auth_user_id uuid,
  auth_email text,
  auth_name text DEFAULT 'Usuario'
)
RETURNS jsonb AS $$
DECLARE
  user_name text;
  result jsonb;
  final_user_id uuid;
BEGIN
  -- Determine user name
  user_name := COALESCE(auth_name, split_part(auth_email, '@', 1), 'Usuario');
  
  -- Log the start of the function
  RAISE NOTICE 'RPC: handle_auth_user_creation called for user % with email %', auth_user_id, auth_email;
  
  -- First, handle potential email conflicts by updating existing records
  -- This ensures that if someone already has this email, we update their ID
  UPDATE usuarios 
  SET id = auth_user_id, nombre = user_name
  WHERE correo = auth_email AND id != auth_user_id;
  
  -- Update any existing roles to use the new ID
  UPDATE user_roles 
  SET user_id = auth_user_id 
  WHERE user_id IN (
    SELECT id FROM usuarios WHERE correo = auth_email AND id != auth_user_id
  );
  
  -- Now insert or update the user profile
  -- This handles the case where the user doesn't exist or needs updating
  INSERT INTO usuarios (id, correo, nombre)
  VALUES (auth_user_id, auth_email, user_name)
  ON CONFLICT (id) DO UPDATE SET
    correo = EXCLUDED.correo,
    nombre = EXCLUDED.nombre;
  
  -- Verify the user was created/updated
  SELECT id INTO final_user_id FROM usuarios WHERE id = auth_user_id;
  
  IF final_user_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create or update user profile for %', auth_email;
  END IF;
  
  RAISE NOTICE 'RPC: Created/updated user profile for %', auth_email;
  
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
COMMENT ON FUNCTION handle_auth_user_creation IS 'RPC function to create user profiles and assign roles for Supabase Auth users. Fixed syntax for proper INSERT ... ON CONFLICT usage.';

-- Update configuration to track RPC function fix
INSERT INTO configuracion (key, valor) VALUES
  ('rpc_function_syntax_fixed', NOW()::text),
  ('auth_integration_method', 'rpc_function_fixed'),
  ('migration_syntax_error_resolved', 'true')
ON CONFLICT (key) DO UPDATE SET 
  valor = EXCLUDED.valor,
  updated_at = NOW();