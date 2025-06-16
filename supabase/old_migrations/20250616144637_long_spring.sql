/*
  # Add Development Policies for Admin App

  1. Anonymous Policies
    - Add anonymous (anon) policies for all admin tables
    - Allow full CRUD operations for development testing
    - These policies should be removed in production

  2. Tables Covered
    - servicios (services management)
    - citas (appointments management)
    - usuarios (user management)
    - user_roles (role management)
    - configuracion (configuration management)
    - disponibilidad (availability management)
    - ausencias (absences management)
    - terceros (third parties management)
    - facturas (invoices management)
    - integraciones (integrations management)

  3. Security Note
    - These are development-only policies
    - Remove before production deployment
    - Existing authenticated user policies remain intact
*/

-- SERVICIOS TABLE - Anonymous policies for development
CREATE POLICY "Allow anonymous read servicios (dev)"
  ON servicios
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert servicios (dev)"
  ON servicios
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update servicios (dev)"
  ON servicios
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete servicios (dev)"
  ON servicios
  FOR DELETE
  TO anon
  USING (true);

-- CITAS TABLE - Anonymous policies for development
CREATE POLICY "Allow anonymous read citas (dev)"
  ON citas
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert citas (dev)"
  ON citas
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update citas (dev)"
  ON citas
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete citas (dev)"
  ON citas
  FOR DELETE
  TO anon
  USING (true);

-- USUARIOS TABLE - Anonymous policies for development
CREATE POLICY "Allow anonymous read usuarios (dev)"
  ON usuarios
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert usuarios (dev)"
  ON usuarios
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update usuarios (dev)"
  ON usuarios
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete usuarios (dev)"
  ON usuarios
  FOR DELETE
  TO anon
  USING (true);

-- USER_ROLES TABLE - Anonymous policies for development
CREATE POLICY "Allow anonymous read user_roles (dev)"
  ON user_roles
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert user_roles (dev)"
  ON user_roles
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update user_roles (dev)"
  ON user_roles
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete user_roles (dev)"
  ON user_roles
  FOR DELETE
  TO anon
  USING (true);

-- CONFIGURACION TABLE - Anonymous policies for development
CREATE POLICY "Allow anonymous read configuracion (dev)"
  ON configuracion
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert configuracion (dev)"
  ON configuracion
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update configuracion (dev)"
  ON configuracion
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete configuracion (dev)"
  ON configuracion
  FOR DELETE
  TO anon
  USING (true);

-- DISPONIBILIDAD TABLE - Anonymous policies for development
CREATE POLICY "Allow anonymous read disponibilidad (dev)"
  ON disponibilidad
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert disponibilidad (dev)"
  ON disponibilidad
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update disponibilidad (dev)"
  ON disponibilidad
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete disponibilidad (dev)"
  ON disponibilidad
  FOR DELETE
  TO anon
  USING (true);

-- AUSENCIAS TABLE - Anonymous policies for development
CREATE POLICY "Allow anonymous read ausencias (dev)"
  ON ausencias
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert ausencias (dev)"
  ON ausencias
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update ausencias (dev)"
  ON ausencias
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete ausencias (dev)"
  ON ausencias
  FOR DELETE
  TO anon
  USING (true);

-- TERCEROS TABLE - Anonymous policies for development
CREATE POLICY "Allow anonymous read terceros (dev)"
  ON terceros
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert terceros (dev)"
  ON terceros
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update terceros (dev)"
  ON terceros
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete terceros (dev)"
  ON terceros
  FOR DELETE
  TO anon
  USING (true);

-- FACTURAS TABLE - Anonymous policies for development
CREATE POLICY "Allow anonymous read facturas (dev)"
  ON facturas
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert facturas (dev)"
  ON facturas
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update facturas (dev)"
  ON facturas
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete facturas (dev)"
  ON facturas
  FOR DELETE
  TO anon
  USING (true);

-- INTEGRACIONES TABLE - Anonymous policies for development
CREATE POLICY "Allow anonymous read integraciones (dev)"
  ON integraciones
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert integraciones (dev)"
  ON integraciones
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update integraciones (dev)"
  ON integraciones
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete integraciones (dev)"
  ON integraciones
  FOR DELETE
  TO anon
  USING (true);

-- Add configuration flag to track development policies
INSERT INTO configuracion (key, valor) VALUES
  ('dev_policies_enabled', 'true'),
  ('dev_policies_created_at', NOW()::text)
ON CONFLICT (key) DO UPDATE SET 
  valor = EXCLUDED.valor,
  updated_at = NOW();

-- Add comment to document these are development policies
COMMENT ON POLICY "Allow anonymous read servicios (dev)" ON servicios IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read citas (dev)" ON citas IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read usuarios (dev)" ON usuarios IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read user_roles (dev)" ON user_roles IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read configuracion (dev)" ON configuracion IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read disponibilidad (dev)" ON disponibilidad IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read ausencias (dev)" ON ausencias IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read terceros (dev)" ON terceros IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read facturas (dev)" ON facturas IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read integraciones (dev)" ON integraciones IS 'Development only - remove in production';