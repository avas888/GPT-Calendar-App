/*
  # Fix Authentication Schema Error - Function Name Conflict Resolution

  1. Problem
    - Multiple functions named "handle_auth_user_creation" exist with different signatures
    - Need to drop all versions before recreating

  2. Solution
    - Drop all versions of the function by signature
    - Recreate with proper search_path and error handling
    - Fix the is_admin_user function as well

  3. Security
    - Maintains proper RLS and security definer functions
    - Adds exception handling to prevent auth failures
*/

-- Drop all existing versions of handle_auth_user_creation function
DROP FUNCTION IF EXISTS handle_auth_user_creation() CASCADE;
DROP FUNCTION IF EXISTS handle_auth_user_creation(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS handle_auth_user_creation(uuid, text) CASCADE;

-- Drop any existing triggers that might reference the old function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the auth user creation handler with proper search_path (trigger version)
CREATE OR REPLACE FUNCTION handle_auth_user_creation()
RETURNS trigger AS $$
BEGIN
  -- Set search_path to ensure we can find our tables
  SET search_path = public, pg_temp;
  
  -- Insert user profile
  INSERT INTO public.usuarios (id, correo, nombre)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    correo = EXCLUDED.correo,
    nombre = EXCLUDED.nombre;

  -- Check if this is the first user and make them admin
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE rol = 'admin') THEN
    INSERT INTO public.user_roles (user_id, rol)
    VALUES (NEW.id, 'admin');
  ELSE
    -- Default role for new users
    INSERT INTO public.user_roles (user_id, rol)
    VALUES (NEW.id, 'cliente')
    ON CONFLICT (user_id, rol) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth process
    RAISE WARNING 'Error in handle_auth_user_creation: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_auth_user_creation();

-- Also fix the is_admin_user function to ensure it has proper search_path
CREATE OR REPLACE FUNCTION is_admin_user(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
    -- Set search_path to ensure we can find our tables
    SET search_path = public, pg_temp;
    
    -- Return false if no user ID provided
    IF check_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if user has admin role
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = check_user_id AND rol = 'admin'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Return false on any error to prevent auth bypass
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_auth_user_creation TO authenticated;
GRANT EXECUTE ON FUNCTION handle_auth_user_creation TO anon;
GRANT EXECUTE ON FUNCTION is_admin_user TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user TO anon;

-- Update configuration to track this fix
INSERT INTO configuracion (key, valor) VALUES
    ('auth_schema_error_fixed', NOW()::text),
    ('search_path_fix_applied', 'true'),
    ('function_conflict_resolved', 'true')
ON CONFLICT (key) DO UPDATE SET 
    valor = EXCLUDED.valor,
    updated_at = NOW();

-- Add comment to document the fix
COMMENT ON FUNCTION handle_auth_user_creation IS 'Trigger function to create user profiles when auth users are created. Fixed search_path and function name conflicts.';
COMMENT ON FUNCTION is_admin_user IS 'Helper function to check admin status with proper search_path to avoid schema errors.';