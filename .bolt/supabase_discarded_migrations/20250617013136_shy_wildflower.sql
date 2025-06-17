/*
  # Fix Complete Database Schema
  
  This migration ensures all required tables and relationships exist for the AgendaPro application.
  It consolidates and fixes the schema to resolve all "relation does not exist" errors.
  
  ## Tables:
  - usuarios: User profiles linked to Supabase Auth
  - user_roles: Role assignments (admin, colaborador, cliente)
  - servicios: Available services with pricing and duration
  - personal: Staff members with specialties
  - disponibilidad: Staff availability schedules
  - ausencias: Staff absence records
  - citas: Appointment bookings
  - configuracion: Application configuration settings
  - terceros: Third party entities
  - facturas: Invoice records
  - integraciones: External system integrations
  
  ## Security:
  - Row Level Security (RLS) enabled on all tables
  - Role-based access control policies
  - Helper functions to prevent RLS recursion
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- DROP EXISTING TABLES IF THEY EXIST (for clean slate)
-- =============================================

DROP TABLE IF EXISTS integraciones CASCADE;
DROP TABLE IF EXISTS facturas CASCADE;
DROP TABLE IF EXISTS terceros CASCADE;
DROP TABLE IF EXISTS configuracion CASCADE;
DROP TABLE IF EXISTS citas CASCADE;
DROP TABLE IF EXISTS ausencias CASCADE;
DROP TABLE IF EXISTS disponibilidad CASCADE;
DROP TABLE IF EXISTS personal CASCADE;
DROP TABLE IF EXISTS servicios CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS is_admin_user CASCADE;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;
DROP FUNCTION IF EXISTS ensure_first_user_is_admin CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- =============================================
-- CORE TABLES
-- =============================================

-- Users table - stores user profiles linked to Supabase Auth
CREATE TABLE usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  correo text UNIQUE NOT NULL,
  nombre text NOT NULL,
  telefono text,
  direccion text,
  created_at timestamptz DEFAULT now()
);

-- User roles table - manages role assignments
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  rol text NOT NULL CHECK (rol IN ('admin', 'colaborador', 'cliente')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, rol)
);

-- Services table - defines available services
CREATE TABLE servicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  duracion_min integer NOT NULL DEFAULT 30 CHECK (duracion_min > 0),
  precio decimal(10,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
  activo boolean DEFAULT true,
  categoria text,
  created_at timestamptz DEFAULT now()
);

-- Staff table - manages staff members
CREATE TABLE personal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  especialidades text[] DEFAULT '{}',
  telefono text,
  email text,
  activo boolean DEFAULT true,
  user_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  notas text,
  created_at timestamptz DEFAULT now()
);

-- Staff availability table - defines when staff are available
CREATE TABLE disponibilidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid REFERENCES personal(id) ON DELETE CASCADE,
  dia_semana integer NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CHECK (hora_fin > hora_inicio)
);

-- Staff absences table - tracks when staff are not available
CREATE TABLE ausencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid REFERENCES personal(id) ON DELETE CASCADE,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  motivo text DEFAULT '',
  todo_el_dia boolean DEFAULT true,
  hora_inicio time,
  hora_fin time,
  created_at timestamptz DEFAULT now(),
  CHECK (fecha_fin >= fecha_inicio)
);

-- Appointments table - stores all bookings
CREATE TABLE citas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  personal_id uuid REFERENCES personal(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  estado text NOT NULL DEFAULT 'confirmada' CHECK (estado IN ('confirmada', 'cancelada', 'realizada', 'no_asistio')),
  servicios uuid[] DEFAULT '{}',
  notas text,
  precio_total decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (hora_fin > hora_inicio)
);

-- Configuration table - stores application settings
CREATE TABLE configuracion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  valor text NOT NULL,
  descripcion text,
  categoria text DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Third parties table
CREATE TABLE terceros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  nit text UNIQUE,
  tipo text DEFAULT 'cliente' CHECK (tipo IN ('cliente', 'proveedor', 'otro')),
  contacto_email text,
  contacto_telefono text,
  direccion text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Invoices table
CREATE TABLE facturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cita_id uuid REFERENCES citas(id) ON DELETE CASCADE,
  numero_factura text UNIQUE NOT NULL,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviada', 'pagada', 'cancelada')),
  fecha_emision timestamptz DEFAULT now(),
  fecha_vencimiento date,
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  impuestos decimal(10,2) NOT NULL DEFAULT 0,
  total decimal(10,2) NOT NULL DEFAULT 0,
  cufe text,
  hash_documento text,
  created_at timestamptz DEFAULT now()
);

-- Integrations table
CREATE TABLE integraciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('erp', 'facturacion', 'pagos', 'calendario', 'otro')),
  nombre text NOT NULL,
  sistema text NOT NULL,
  endpoint text,
  configuracion jsonb DEFAULT '{}',
  activo boolean DEFAULT false,
  ultima_sincronizacion timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_rol ON user_roles(rol);
CREATE INDEX idx_citas_cliente_id ON citas(cliente_id);
CREATE INDEX idx_citas_personal_id ON citas(personal_id);
CREATE INDEX idx_citas_fecha ON citas(fecha);
CREATE INDEX idx_citas_estado ON citas(estado);
CREATE INDEX idx_disponibilidad_personal_id ON disponibilidad(personal_id);
CREATE INDEX idx_disponibilidad_dia_semana ON disponibilidad(dia_semana);
CREATE INDEX idx_ausencias_personal_id ON ausencias(personal_id);
CREATE INDEX idx_configuracion_key ON configuracion(key);
CREATE INDEX idx_servicios_activo ON servicios(activo);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to safely check if user is admin (prevents RLS recursion)
CREATE OR REPLACE FUNCTION is_admin_user(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
    IF check_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = check_user_id AND rol = 'admin'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Log when the trigger fires for easier debugging
    RAISE NOTICE 'Trigger fired for user: %', NEW.email;
    INSERT INTO usuarios (id, correo, nombre)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );

    IF NEW.email = 'admin@agendapro.com' OR NOT EXISTS (SELECT 1 FROM user_roles WHERE rol = 'admin') THEN
        INSERT INTO user_roles (user_id, rol) VALUES (NEW.id, 'admin');
    ELSE
        INSERT INTO user_roles (user_id, rol) VALUES (NEW.id, 'cliente');
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Triggers for updated_at timestamps
CREATE TRIGGER update_citas_updated_at
    BEFORE UPDATE ON citas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuracion_updated_at
    BEFORE UPDATE ON configuracion
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integraciones_updated_at
    BEFORE UPDATE ON integraciones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY POLICIES
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

-- USUARIOS policies
CREATE POLICY "Users can read own profile" ON usuarios
    FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON usuarios
    FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON usuarios
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all users" ON usuarios
    FOR ALL TO authenticated USING (is_admin_user());

-- USER_ROLES policies
CREATE POLICY "Users can read own roles" ON user_roles
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own role" ON user_roles
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- SERVICIOS policies
CREATE POLICY "Everyone can read active services" ON servicios
    FOR SELECT TO authenticated USING (activo = true);

CREATE POLICY "Admins can manage services" ON servicios
    FOR ALL TO authenticated USING (is_admin_user());

-- PERSONAL policies
CREATE POLICY "Everyone can read active personal" ON personal
    FOR SELECT TO authenticated USING (activo = true);

CREATE POLICY "Personal can read own record" ON personal
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can manage personal" ON personal
    FOR ALL TO authenticated USING (is_admin_user());

-- DISPONIBILIDAD policies
CREATE POLICY "Everyone can read availability" ON disponibilidad
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage availability" ON disponibilidad
    FOR ALL TO authenticated USING (is_admin_user());

-- AUSENCIAS policies
CREATE POLICY "Admins and personal can read absences" ON ausencias
    FOR SELECT TO authenticated USING (
        is_admin_user() OR 
        EXISTS (SELECT 1 FROM personal p WHERE p.id = personal_id AND p.user_id = auth.uid())
    );

CREATE POLICY "Admins can manage absences" ON ausencias
    FOR ALL TO authenticated USING (is_admin_user());

-- CITAS policies
CREATE POLICY "Clients can read own appointments" ON citas
    FOR SELECT TO authenticated USING (cliente_id = auth.uid());

CREATE POLICY "Clients can create appointments" ON citas
    FOR INSERT TO authenticated WITH CHECK (cliente_id = auth.uid());

CREATE POLICY "Clients can update own appointments" ON citas
    FOR UPDATE TO authenticated USING (cliente_id = auth.uid());

CREATE POLICY "Staff can read their appointments" ON citas
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM personal p WHERE p.id = personal_id AND p.user_id = auth.uid())
    );

CREATE POLICY "Staff can update their appointments" ON citas
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM personal p WHERE p.id = personal_id AND p.user_id = auth.uid())
    );

CREATE POLICY "Admins can manage all appointments" ON citas
    FOR ALL TO authenticated USING (is_admin_user());

-- CONFIGURACION policies
CREATE POLICY "Everyone can read public configuration" ON configuracion
    FOR SELECT TO authenticated USING (categoria = 'public');

CREATE POLICY "Admins can manage configuration" ON configuracion
    FOR ALL TO authenticated USING (is_admin_user());

-- TERCEROS policies
CREATE POLICY "Admins can manage terceros" ON terceros
    FOR ALL TO authenticated USING (is_admin_user());

-- FACTURAS policies
CREATE POLICY "Clients can read own invoices" ON facturas
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM citas c WHERE c.id = cita_id AND c.cliente_id = auth.uid())
    );

CREATE POLICY "Admins can manage all invoices" ON facturas
    FOR ALL TO authenticated USING (is_admin_user());

-- INTEGRACIONES policies
CREATE POLICY "Admins can manage integrations" ON integraciones
    FOR ALL TO authenticated USING (is_admin_user());

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT EXECUTE ON FUNCTION is_admin_user TO authenticated, anon;
GRANT EXECUTE ON FUNCTION handle_new_user TO authenticated, anon;

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default configuration values
INSERT INTO configuracion (key, valor, descripcion, categoria) VALUES
    ('negocio_nombre', 'Mi Negocio', 'Nombre del negocio', 'general'),
    ('negocio_telefono', '', 'Teléfono principal del negocio', 'contacto'),
    ('negocio_email', '', 'Email principal del negocio', 'contacto'),
    ('negocio_direccion', '', 'Dirección física del negocio', 'contacto'),
    ('horario_apertura', '08:00', 'Hora de apertura general', 'horarios'),
    ('horario_cierre', '18:00', 'Hora de cierre general', 'horarios'),
    ('dias_laborales', '1,2,3,4,5,6', 'Días laborales (1=Lunes, 7=Domingo)', 'horarios'),
    ('tiempo_minimo_reserva', '60', 'Tiempo mínimo de anticipación para reservar (minutos)', 'reservas'),
    ('cancelacion_limite', '24', 'Horas límite antes de la cita para cancelar', 'reservas'),
    ('moneda', 'COP', 'Moneda utilizada', 'financiero');

-- Insert default services
INSERT INTO servicios (nombre, descripcion, duracion_min, precio, categoria, activo) VALUES
    ('Consulta General', 'Consulta médica general', 30, 50000, 'consultas', true),
    ('Consulta Especializada', 'Consulta con especialista', 45, 80000, 'consultas', true),
    ('Examen de Rutina', 'Examen médico de rutina', 60, 70000, 'examenes', true),
    ('Procedimiento Menor', 'Procedimiento médico menor', 90, 120000, 'procedimientos', true),
    ('Terapia Física', 'Sesión de terapia física', 60, 60000, 'terapias', true);

-- Insert sample staff member
INSERT INTO personal (nombre, especialidades, activo) VALUES
    ('Dr. Juan Pérez', ARRAY['Medicina General', 'Consultas'], true),
    ('Dra. María González', ARRAY['Especialista', 'Procedimientos'], true);

-- Insert sample availability for staff (Monday to Friday, 8 AM to 6 PM)
INSERT INTO disponibilidad (personal_id, dia_semana, hora_inicio, hora_fin, activo)
SELECT 
    p.id,
    dia,
    '08:00'::time,
    '18:00'::time,
    true
FROM personal p
CROSS JOIN generate_series(1, 5) AS dia
WHERE p.activo = true;