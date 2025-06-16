/*
  # Fix Authentication Schema Error

  This migration fixes the 'Database error querying schema' issue by:
  1. Dropping and recreating the handle_auth_user_creation function with proper search_path
  2. Ensuring the function can properly access database objects
  3. Adding proper error handling
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS handle_auth_user_creation();

-- Create the auth user creation handler with proper search_path
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

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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
    ('search_path_fix_applied', 'true')
ON CONFLICT (key) DO UPDATE SET 
    valor = EXCLUDED.valor,
    updated_at = NOW();