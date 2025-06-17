/*
  # Fix Personal Table RLS Policies - Handle Function Uniqueness

  1. Handle multiple is_admin_user function variants
  2. Fix RLS policies for personal table
  3. Ensure proper permissions and indexes
*/

-- First, let's check what functions exist and handle them properly
-- We'll drop and recreate with specific signatures to avoid conflicts

-- Drop the no-parameter version if it exists
DROP FUNCTION IF EXISTS public.is_admin_user() CASCADE;

-- Create the no-parameter version
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if the current authenticated user has admin role
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND rol = 'admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return false if any error occurs
    RETURN false;
END;
$$;

-- Also ensure the UUID parameter version exists for other policies
CREATE OR REPLACE FUNCTION public.is_admin_user(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if the specified user has admin role
  IF user_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = user_uuid 
    AND rol = 'admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return false if any error occurs
    RETURN false;
END;
$$;

-- Now recreate all the policies that were dropped by CASCADE
-- Starting with personal table policies

-- Drop any remaining personal policies to start fresh
DROP POLICY IF EXISTS "Admins can manage personal" ON public.personal;
DROP POLICY IF EXISTS "Allow initial setup" ON public.personal;
DROP POLICY IF EXISTS "Admins can manage all personal operations" ON public.personal;
DROP POLICY IF EXISTS "Service role full access to personal" ON public.personal;

-- Create comprehensive admin policy for personal table
CREATE POLICY "Admins can manage all personal operations"
  ON public.personal
  FOR ALL
  TO authenticated
  USING (
    -- Allow if user is admin OR if no admin exists yet (initial setup)
    public.is_admin_user() OR 
    NOT EXISTS (SELECT 1 FROM public.user_roles WHERE rol = 'admin')
  )
  WITH CHECK (
    -- Same condition for inserts/updates
    public.is_admin_user() OR 
    NOT EXISTS (SELECT 1 FROM public.user_roles WHERE rol = 'admin')
  );

-- Ensure service role has full access (for migrations and admin operations)
CREATE POLICY "Service role full access to personal"
  ON public.personal
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Recreate policies for other tables that may have been dropped by CASCADE
-- Using the UUID parameter version for consistency

-- Usuarios table
CREATE POLICY "Admins can manage all users"
  ON public.usuarios
  FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- Servicios table
CREATE POLICY "Admins can manage services"
  ON public.servicios
  FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- Disponibilidad table
CREATE POLICY "Admins can manage availability"
  ON public.disponibilidad
  FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- Ausencias table
CREATE POLICY "Admins can manage absences"
  ON public.ausencias
  FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- Citas table
CREATE POLICY "Admins can manage all appointments"
  ON public.citas
  FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- Configuracion table
CREATE POLICY "Admins can manage configuration"
  ON public.configuracion
  FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- Terceros table
CREATE POLICY "Admins can manage terceros"
  ON public.terceros
  FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- Facturas table
CREATE POLICY "Admins can manage all invoices"
  ON public.facturas
  FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- Integraciones table
CREATE POLICY "Admins can manage integrations"
  ON public.integraciones
  FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.personal TO authenticated;
GRANT ALL ON public.personal TO service_role;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Ensure the personal table has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_personal_user_id ON public.personal(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_activo ON public.personal(activo);