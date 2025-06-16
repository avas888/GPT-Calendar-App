/*
  # AgendaPro - Complete Business Scheduling App Schema
  
  This is a consolidated schema that represents the final state of all previous migrations.
  It includes all tables, policies, functions, and initial data needed for the application.

  ## Tables Created:
  - usuarios: User profiles and authentication data
  - user_roles: Role-based access control
  - servicios: Available services/treatments
  - personal: Staff members and their specialties
  - disponibilidad: Staff availability schedules
  - ausencias: Staff absence records
  - citas: Appointment bookings
  - configuracion: Application configuration
  - terceros: Third party entities (clients/suppliers)
  - facturas: Invoice records
  - integraciones: External system integrations

  ## Security:
  - Row Level Security (RLS) enabled on all tables
  - Role-based policies for admin, colaborador, and cliente
  - Development policies for anonymous access (remove in production)
  - Helper functions to prevent RLS recursion

  ## Features:
  - Complete appointment booking system
  - Staff management with specialties and availability
  - Configuration management
  - Integration preparation for ERP and invoicing
  - Admin user setup and role management
*/

-- =============================================
-- TABLES
-- =============================================

-- Create usuarios table
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correo text UNIQUE NOT NULL,
  nombre text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  rol text NOT NULL CHECK (rol IN ('admin', 'colaborador', 'cliente')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, rol)
);

-- Create servicios table
CREATE TABLE IF NOT EXISTS servicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  duracion_min integer NOT NULL DEFAULT 30,
  precio decimal(10,2) NOT NULL DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create personal table
CREATE TABLE IF NOT EXISTS personal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  especialidades text[] DEFAULT '{}',
  activo boolean DEFAULT true,
  user_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create disponibilidad table
CREATE TABLE IF NOT EXISTS disponibilidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid REFERENCES personal(id) ON DELETE CASCADE,
  dia_semana integer NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create ausencias table
CREATE TABLE IF NOT EXISTS ausencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid REFERENCES personal(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  motivo text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create citas table
CREATE TABLE IF NOT EXISTS citas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  personal_id uuid REFERENCES personal(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  estado text NOT NULL DEFAULT 'confirmada' CHECK (estado IN ('confirmada', 'cancelada', 'realizada', 'no_asistio')),
  servicios uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create configuracion table
CREATE TABLE IF NOT EXISTS configuracion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  valor text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create terceros table
CREATE TABLE IF NOT EXISTS terceros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  nit text UNIQUE NOT NULL,
  tipo text DEFAULT 'cliente' CHECK (tipo IN ('cliente', 'proveedor', 'otro')),
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create facturas table
CREATE TABLE IF NOT EXISTS facturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cita_id uuid REFERENCES citas(id) ON DELETE CASCADE,
  numero_factura text UNIQUE NOT NULL,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviada', 'aceptada', 'rechazada')),
  fecha_emision timestamptz DEFAULT now(),
  cufe text,
  hash_documento text,
  total decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create integraciones table
CREATE TABLE IF NOT EXISTS integraciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('erp', 'facturacion', 'pagos', 'otro')),
  sistema text NOT NULL,
  endpoint text,
  configuracion jsonb DEFAULT '{}',
  activo boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_rol ON user_roles(rol);
CREATE INDEX IF NOT EXISTS idx_citas_cliente_id ON citas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_citas_personal_id ON citas(personal_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_personal_id ON disponibilidad(personal_id);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_dia_semana ON disponibilidad(dia_semana);
CREATE INDEX IF NOT EXISTS idx_ausencias_personal_id ON ausencias(personal_id);
CREATE INDEX IF NOT EXISTS idx_ausencias_fecha ON ausencias(fecha);
CREATE INDEX IF NOT EXISTS idx_configuracion_key ON configuracion(key);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Helper function to check admin status safely (prevents RLS recursion)
CREATE OR REPLACE FUNCTION is_admin_user(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
    -- Return false if no user ID provided
    IF check_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if user has admin role
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = check_user_id AND rol = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to create user profiles (called from application)
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

-- Function to ensure first user gets admin role
CREATE OR REPLACE FUNCTION ensure_first_user_is_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is the first user and no admin exists, make them admin
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE rol = 'admin') THEN
    INSERT INTO user_roles (user_id, rol)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, rol) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin_user TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user TO anon;
GRANT EXECUTE ON FUNCTION create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile TO anon;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE ausencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE terceros ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE integraciones ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - USUARIOS
-- =============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can read own profile" ON usuarios;
DROP POLICY IF EXISTS "Users can update own profile" ON usuarios;
DROP POLICY IF EXISTS "Users can insert own profile" ON usuarios;
DROP POLICY IF EXISTS "Users can create own profile" ON usuarios;
DROP POLICY IF EXISTS "Admins can manage all users" ON usuarios;
DROP POLICY IF EXISTS "Admins can read all users" ON usuarios;
DROP POLICY IF EXISTS "Admins can create users" ON usuarios;
DROP POLICY IF EXISTS "Allow anonymous read usuarios (dev)" ON usuarios;
DROP POLICY IF EXISTS "Allow anonymous insert usuarios (dev)" ON usuarios;
DROP POLICY IF EXISTS "Allow anonymous update usuarios (dev)" ON usuarios;
DROP POLICY IF EXISTS "Allow anonymous delete usuarios (dev)" ON usuarios;

-- Create new policies
CREATE POLICY "Users can read own profile"
  ON usuarios FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON usuarios FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON usuarios FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all users"
  ON usuarios FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Development policies (remove in production)
CREATE POLICY "Allow anonymous read usuarios (dev)"
  ON usuarios FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert usuarios (dev)"
  ON usuarios FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous update usuarios (dev)"
  ON usuarios FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous delete usuarios (dev)"
  ON usuarios FOR DELETE TO anon USING (true);

-- =============================================
-- RLS POLICIES - USER_ROLES
-- =============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;
DROP POLICY IF EXISTS "Users can create own role" ON user_roles;
DROP POLICY IF EXISTS "Allow profile creation function" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Allow anonymous read user_roles (dev)" ON user_roles;
DROP POLICY IF EXISTS "Allow anonymous insert user_roles (dev)" ON user_roles;
DROP POLICY IF EXISTS "Allow anonymous update user_roles (dev)" ON user_roles;
DROP POLICY IF EXISTS "Allow anonymous delete user_roles (dev)" ON user_roles;

-- Create new policies
CREATE POLICY "Users can read own roles"
  ON user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own role"
  ON user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow profile creation function"
  ON user_roles FOR INSERT TO authenticated
  WITH CHECK (true);

-- Development policies (remove in production)
CREATE POLICY "Allow anonymous read user_roles (dev)"
  ON user_roles FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert user_roles (dev)"
  ON user_roles FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous update user_roles (dev)"
  ON user_roles FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous delete user_roles (dev)"
  ON user_roles FOR DELETE TO anon USING (true);

-- =============================================
-- RLS POLICIES - SERVICIOS
-- =============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Everyone can read active services" ON servicios;
DROP POLICY IF EXISTS "Admins can manage services" ON servicios;
DROP POLICY IF EXISTS "Allow anonymous read servicios (dev)" ON servicios;
DROP POLICY IF EXISTS "Allow anonymous insert servicios (dev)" ON servicios;
DROP POLICY IF EXISTS "Allow anonymous update servicios (dev)" ON servicios;
DROP POLICY IF EXISTS "Allow anonymous delete servicios (dev)" ON servicios;

-- Create new policies
CREATE POLICY "Everyone can read active services"
  ON servicios FOR SELECT TO authenticated
  USING (activo = true);

CREATE POLICY "Admins can manage services"
  ON servicios FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Development policies (remove in production)
CREATE POLICY "Allow anonymous read servicios (dev)"
  ON servicios FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert servicios (dev)"
  ON servicios FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous update servicios (dev)"
  ON servicios FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous delete servicios (dev)"
  ON servicios FOR DELETE TO anon USING (true);

-- =============================================
-- RLS POLICIES - PERSONAL
-- =============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Everyone can read active personal" ON personal;
DROP POLICY IF EXISTS "Personal can read own record" ON personal;
DROP POLICY IF EXISTS "Admins can manage personal" ON personal;
DROP POLICY IF EXISTS "Allow initial setup" ON personal;
DROP POLICY IF EXISTS "Allow authenticated users to insert personal (dev)" ON personal;
DROP POLICY IF EXISTS "Allow authenticated users to update personal (dev)" ON personal;
DROP POLICY IF EXISTS "Allow authenticated users to delete personal (dev)" ON personal;
DROP POLICY IF EXISTS "Allow anonymous read for development" ON personal;
DROP POLICY IF EXISTS "Allow anonymous insert for development" ON personal;
DROP POLICY IF EXISTS "Allow anonymous update for development" ON personal;
DROP POLICY IF EXISTS "Allow anonymous delete for development" ON personal;

-- Create new policies
CREATE POLICY "Everyone can read active personal"
  ON personal FOR SELECT TO authenticated
  USING (activo = true);

CREATE POLICY "Personal can read own record"
  ON personal FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage personal"
  ON personal FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "Allow initial setup"
  ON personal FOR ALL TO authenticated
  USING (
    is_admin_user() OR NOT EXISTS (SELECT 1 FROM user_roles WHERE rol = 'admin')
  )
  WITH CHECK (
    is_admin_user() OR NOT EXISTS (SELECT 1 FROM user_roles WHERE rol = 'admin')
  );

-- Development policies (remove in production)
CREATE POLICY "Allow anonymous read for development"
  ON personal FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert for development"
  ON personal FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous update for development"
  ON personal FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous delete for development"
  ON personal FOR DELETE TO anon USING (true);

-- =============================================
-- RLS POLICIES - DISPONIBILIDAD
-- =============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Everyone can read availability" ON disponibilidad;
DROP POLICY IF EXISTS "Admins can manage availability" ON disponibilidad;
DROP POLICY IF EXISTS "Allow anonymous read disponibilidad (dev)" ON disponibilidad;
DROP POLICY IF EXISTS "Allow anonymous insert disponibilidad (dev)" ON disponibilidad;
DROP POLICY IF EXISTS "Allow anonymous update disponibilidad (dev)" ON disponibilidad;
DROP POLICY IF EXISTS "Allow anonymous delete disponibilidad (dev)" ON disponibilidad;

-- Create new policies
CREATE POLICY "Everyone can read availability"
  ON disponibilidad FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage availability"
  ON disponibilidad FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Development policies (remove in production)
CREATE POLICY "Allow anonymous read disponibilidad (dev)"
  ON disponibilidad FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert disponibilidad (dev)"
  ON disponibilidad FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous update disponibilidad (dev)"
  ON disponibilidad FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous delete disponibilidad (dev)"
  ON disponibilidad FOR DELETE TO anon USING (true);

-- =============================================
-- RLS POLICIES - AUSENCIAS
-- =============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Admins and personal can read absences" ON ausencias;
DROP POLICY IF EXISTS "Admins can manage absences" ON ausencias;
DROP POLICY IF EXISTS "Allow anonymous read ausencias (dev)" ON ausencias;
DROP POLICY IF EXISTS "Allow anonymous insert ausencias (dev)" ON ausencias;
DROP POLICY IF EXISTS "Allow anonymous update ausencias (dev)" ON ausencias;
DROP POLICY IF EXISTS "Allow anonymous delete ausencias (dev)" ON ausencias;

-- Create new policies
CREATE POLICY "Admins and personal can read absences"
  ON ausencias FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.rol IN ('admin', 'colaborador')
    )
  );

CREATE POLICY "Admins can manage absences"
  ON ausencias FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Development policies (remove in production)
CREATE POLICY "Allow anonymous read ausencias (dev)"
  ON ausencias FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert ausencias (dev)"
  ON ausencias FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous update ausencias (dev)"
  ON ausencias FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous delete ausencias (dev)"
  ON ausencias FOR DELETE TO anon USING (true);

-- =============================================
-- RLS POLICIES - CITAS
-- =============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Clients can read own appointments" ON citas;
DROP POLICY IF EXISTS "Clients can create appointments" ON citas;
DROP POLICY IF EXISTS "Clients can update own appointments" ON citas;
DROP POLICY IF EXISTS "Staff can read their appointments" ON citas;
DROP POLICY IF EXISTS "Staff can update their appointments" ON citas;
DROP POLICY IF EXISTS "Admins can manage all appointments" ON citas;
DROP POLICY IF EXISTS "Allow anonymous read citas (dev)" ON citas;
DROP POLICY IF EXISTS "Allow anonymous insert citas (dev)" ON citas;
DROP POLICY IF EXISTS "Allow anonymous update citas (dev)" ON citas;
DROP POLICY IF EXISTS "Allow anonymous delete citas (dev)" ON citas;

-- Create new policies
CREATE POLICY "Clients can read own appointments"
  ON citas FOR SELECT TO authenticated
  USING (cliente_id = auth.uid());

CREATE POLICY "Clients can create appointments"
  ON citas FOR INSERT TO authenticated
  WITH CHECK (cliente_id = auth.uid());

CREATE POLICY "Clients can update own appointments"
  ON citas FOR UPDATE TO authenticated
  USING (cliente_id = auth.uid());

CREATE POLICY "Staff can read their appointments"
  ON citas FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personal p 
      WHERE p.id = personal_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can update their appointments"
  ON citas FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personal p 
      WHERE p.id = personal_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all appointments"
  ON citas FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Development policies (remove in production)
CREATE POLICY "Allow anonymous read citas (dev)"
  ON citas FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert citas (dev)"
  ON citas FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous update citas (dev)"
  ON citas FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous delete citas (dev)"
  ON citas FOR DELETE TO anon USING (true);

-- =============================================
-- RLS POLICIES - CONFIGURACION
-- =============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can manage configuration" ON configuracion;
DROP POLICY IF EXISTS "Allow anonymous read configuracion (dev)" ON configuracion;
DROP POLICY IF EXISTS "Allow anonymous insert configuracion (dev)" ON configuracion;
DROP POLICY IF EXISTS "Allow anonymous update configuracion (dev)" ON configuracion;
DROP POLICY IF EXISTS "Allow anonymous delete configuracion (dev)" ON configuracion;

-- Create new policies
CREATE POLICY "Admins can manage configuration"
  ON configuracion FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Development policies (remove in production)
CREATE POLICY "Allow anonymous read configuracion (dev)"
  ON configuracion FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert configuracion (dev)"
  ON configuracion FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous update configuracion (dev)"
  ON configuracion FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous delete configuracion (dev)"
  ON configuracion FOR DELETE TO anon USING (true);

-- =============================================
-- RLS POLICIES - TERCEROS
-- =============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can manage terceros" ON terceros;
DROP POLICY IF EXISTS "Allow anonymous read terceros (dev)" ON terceros;
DROP POLICY IF EXISTS "Allow anonymous insert terceros (dev)" ON terceros;
DROP POLICY IF EXISTS "Allow anonymous update terceros (dev)" ON terceros;
DROP POLICY IF EXISTS "Allow anonymous delete terceros (dev)" ON terceros;

-- Create new policies
CREATE POLICY "Admins can manage terceros"
  ON terceros FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Development policies (remove in production)
CREATE POLICY "Allow anonymous read terceros (dev)"
  ON terceros FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert terceros (dev)"
  ON terceros FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous update terceros (dev)"
  ON terceros FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous delete terceros (dev)"
  ON terceros FOR DELETE TO anon USING (true);

-- =============================================
-- RLS POLICIES - FACTURAS
-- =============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Clients can read own invoices" ON facturas;
DROP POLICY IF EXISTS "Admins can manage all invoices" ON facturas;
DROP POLICY IF EXISTS "Allow anonymous read facturas (dev)" ON facturas;
DROP POLICY IF EXISTS "Allow anonymous insert facturas (dev)" ON facturas;
DROP POLICY IF EXISTS "Allow anonymous update facturas (dev)" ON facturas;
DROP POLICY IF EXISTS "Allow anonymous delete facturas (dev)" ON facturas;

-- Create new policies
CREATE POLICY "Clients can read own invoices"
  ON facturas FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM citas c 
      WHERE c.id = cita_id AND c.cliente_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all invoices"
  ON facturas FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Development policies (remove in production)
CREATE POLICY "Allow anonymous read facturas (dev)"
  ON facturas FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert facturas (dev)"
  ON facturas FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous update facturas (dev)"
  ON facturas FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous delete facturas (dev)"
  ON facturas FOR DELETE TO anon USING (true);

-- =============================================
-- RLS POLICIES - INTEGRACIONES
-- =============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can manage integrations" ON integraciones;
DROP POLICY IF EXISTS "Allow anonymous read integraciones (dev)" ON integraciones;
DROP POLICY IF EXISTS "Allow anonymous insert integraciones (dev)" ON integraciones;
DROP POLICY IF EXISTS "Allow anonymous update integraciones (dev)" ON integraciones;
DROP POLICY IF EXISTS "Allow anonymous delete integraciones (dev)" ON integraciones;

-- Create new policies
CREATE POLICY "Admins can manage integrations"
  ON integraciones FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Development policies (remove in production)
CREATE POLICY "Allow anonymous read integraciones (dev)"
  ON integraciones FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert integraciones (dev)"
  ON integraciones FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous update integraciones (dev)"
  ON integraciones FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous delete integraciones (dev)"
  ON integraciones FOR DELETE TO anon USING (true);

-- =============================================
-- TRIGGERS
-- =============================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS ensure_first_user_admin_trigger ON usuarios;

-- Create trigger to automatically assign admin role to first user
CREATE TRIGGER ensure_first_user_admin_trigger
  AFTER INSERT ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION ensure_first_user_is_admin();

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default configuration
INSERT INTO configuracion (key, valor) VALUES
  ('negocio_nombre', 'Mi Negocio'),
  ('negocio_telefono', ''),
  ('negocio_email', ''),
  ('negocio_direccion', ''),
  ('horario_apertura', '08:00'),
  ('horario_cierre', '18:00'),
  ('dias_laborales', '1,2,3,4,5,6'),
  ('tiempo_minimo_reserva', '60'),
  ('cancelacion_limite', '24'),
  ('comision_plataforma', '0'),
  ('moneda', 'COP'),
  ('admin_email', 'admin@agendapro.com'),
  ('dev_policies_enabled', 'true'),
  ('schema_version', '1.0.0'),
  ('migration_squashed', 'true')
ON CONFLICT (key) DO NOTHING;

-- Insert default services
INSERT INTO servicios (nombre, duracion_min, precio, activo) VALUES
  ('Corte de cabello', 30, 25000, true),
  ('Coloración', 90, 80000, true),
  ('Peinado', 45, 35000, true),
  ('Manicure', 60, 20000, true),
  ('Pedicure', 60, 25000, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE user_roles IS 'User roles table with simplified RLS policies to prevent infinite recursion. Admin operations should use service role key or be handled through application logic.';
COMMENT ON FUNCTION is_admin_user IS 'Helper function to check admin status without causing RLS recursion';
COMMENT ON FUNCTION create_user_profile IS 'Creates user profile and assigns appropriate role based on email';
COMMENT ON FUNCTION ensure_first_user_is_admin IS 'Ensures the first user to register gets admin privileges';

-- Development policy comments (remove in production)
COMMENT ON POLICY "Allow anonymous read usuarios (dev)" ON usuarios IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read servicios (dev)" ON servicios IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read personal (dev)" ON personal IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read citas (dev)" ON citas IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read user_roles (dev)" ON user_roles IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read configuracion (dev)" ON configuracion IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read disponibilidad (dev)" ON disponibilidad IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read ausencias (dev)" ON ausencias IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read terceros (dev)" ON terceros IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read facturas (dev)" ON facturas IS 'Development only - remove in production';
COMMENT ON POLICY "Allow anonymous read integraciones (dev)" ON integraciones IS 'Development only - remove in production';