/*
  # Complete Business Scheduling App Schema

  1. New Tables
    - `usuarios` - User profiles
    - `user_roles` - User role assignments  
    - `citas` - Appointments/bookings
    - `servicios` - Available services
    - `personal` - Staff members
    - `disponibilidad` - Staff availability schedules
    - `ausencias` - Staff absence records
    - `configuracion` - Application configuration
    - `terceros` - Third party entities
    - `facturas` - Invoice records
    - `integraciones` - External integrations config

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Separate policies for admin, colaborador, and cliente roles

  3. Features
    - Complete appointment booking system
    - Staff management with specialties
    - Flexible availability scheduling
    - Configuration management
    - Integration preparation for ERP and invoicing
*/

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

-- Create personal table (fixed typo: uui -> uuid)
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

-- Enable Row Level Security
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

-- Policies for usuarios table
CREATE POLICY "Users can read own profile"
  ON usuarios
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON usuarios
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Policies for user_roles table
CREATE POLICY "Users can read own roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.rol = 'admin'
    )
  );

-- Policies for servicios table
CREATE POLICY "Everyone can read active services"
  ON servicios
  FOR SELECT
  TO authenticated
  USING (activo = true);

CREATE POLICY "Admins can manage services"
  ON servicios
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.rol = 'admin'
    )
  );

-- Policies for personal table
CREATE POLICY "Everyone can read active personal"
  ON personal
  FOR SELECT
  TO authenticated
  USING (activo = true);

CREATE POLICY "Admins can manage personal"
  ON personal
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.rol = 'admin'
    )
  );

CREATE POLICY "Personal can read own record"
  ON personal
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policies for disponibilidad table
CREATE POLICY "Everyone can read availability"
  ON disponibilidad
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage availability"
  ON disponibilidad
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.rol = 'admin'
    )
  );

-- Policies for ausencias table
CREATE POLICY "Admins and personal can read absences"
  ON ausencias
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.rol IN ('admin', 'colaborador')
    )
  );

CREATE POLICY "Admins can manage absences"
  ON ausencias
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.rol = 'admin'
    )
  );

-- Policies for citas table
CREATE POLICY "Clients can read own appointments"
  ON citas
  FOR SELECT
  TO authenticated
  USING (cliente_id = auth.uid());

CREATE POLICY "Clients can create appointments"
  ON citas
  FOR INSERT
  TO authenticated
  WITH CHECK (cliente_id = auth.uid());

CREATE POLICY "Clients can update own appointments"
  ON citas
  FOR UPDATE
  TO authenticated
  USING (cliente_id = auth.uid());

CREATE POLICY "Staff can read their appointments"
  ON citas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personal p 
      WHERE p.id = personal_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can update their appointments"
  ON citas
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personal p 
      WHERE p.id = personal_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all appointments"
  ON citas
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.rol = 'admin'
    )
  );

-- Policies for configuracion table
CREATE POLICY "Admins can manage configuration"
  ON configuracion
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.rol = 'admin'
    )
  );

-- Policies for terceros table
CREATE POLICY "Admins can manage terceros"
  ON terceros
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.rol = 'admin'
    )
  );

-- Policies for facturas table
CREATE POLICY "Clients can read own invoices"
  ON facturas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM citas c 
      WHERE c.id = cita_id AND c.cliente_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all invoices"
  ON facturas
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.rol = 'admin'
    )
  );

-- Policies for integraciones table
CREATE POLICY "Admins can manage integrations"
  ON integraciones
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.rol = 'admin'
    )
  );

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
  ('moneda', 'COP')
ON CONFLICT (key) DO NOTHING;

-- Insert default services
INSERT INTO servicios (nombre, duracion_min, precio, activo) VALUES
  ('Corte de cabello', 30, 25000, true),
  ('Coloración', 90, 80000, true),
  ('Peinado', 45, 35000, true),
  ('Manicure', 60, 20000, true),
  ('Pedicure', 60, 25000, true)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
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