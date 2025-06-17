/*
  # AgendaPro - Complete Database Schema
  
  This migration creates a complete, clean database schema for the AgendaPro scheduling application.
  
  ## Tables Created:
  1. usuarios - User profiles linked to Supabase Auth
  2. user_roles - Role assignments (admin, colaborador, cliente)
  3. servicios - Available services with pricing and duration
  4. personal - Staff members with specialties
  5. disponibilidad - Staff availability schedules
  6. ausencias - Staff absence records
  7. citas - Appointment bookings
  8. configuracion - Application configuration settings
  9. terceros - Third party entities (for future integrations)
  10. facturas - Invoice records (for future billing)
  11. integraciones - External system integrations
  
  ## Security:
  - Row Level Security (RLS) enabled on all tables
  - Role-based access control policies
  - Helper functions to prevent RLS recursion
  - Secure user profile creation and role assignment
  
  ## Features:
  - Automatic admin role assignment for first user
  - Flexible service and staff management
  - Comprehensive appointment booking system
  - Configuration management for business settings
  - Prepared for future integrations and billing
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  dia_semana integer NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6), -- 0=Sunday, 6=Saturday
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
  CHECK (fecha_fin >= fecha_inicio),
  CHECK (
    (todo_el_dia = true) OR 
    (todo_el_dia = false AND hora_inicio IS NOT NULL AND hora_fin IS NOT NULL AND hora_fin > hora_inicio)
  )
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

-- Third parties table - for future integrations
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

-- Invoices table - for future billing functionality
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
  cufe text, -- Colombian electronic invoice identifier
  hash_documento text,
  created_at timestamptz DEFAULT now()
);

-- Integrations table - for external system connections
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

-- User roles indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_rol ON user_roles(rol);

-- Appointments indexes
CREATE INDEX idx_citas_cliente_id ON citas(cliente_id);
CREATE INDEX idx_citas_personal_id ON citas(personal_id);
CREATE INDEX idx_citas_fecha ON citas(fecha);
CREATE INDEX idx_citas_estado ON citas(estado);
CREATE INDEX idx_citas_fecha_hora ON citas(fecha, hora_inicio);

-- Staff availability indexes
CREATE INDEX idx_disponibilidad_personal_id ON disponibilidad(personal_id);
CREATE INDEX idx_disponibilidad_dia_semana ON disponibilidad(dia_semana);
CREATE INDEX idx_disponibilidad_personal_dia ON disponibilidad(personal_id, dia_semana);

-- Staff absences indexes
CREATE INDEX idx_ausencias_personal_id ON ausencias(personal_id);
CREATE INDEX idx_ausencias_fecha_inicio ON ausencias(fecha_inicio);
CREATE INDEX idx_ausencias_fecha_fin ON ausencias(fecha_fin);
CREATE INDEX idx_ausencias_personal_fechas ON ausencias(personal_id, fecha_inicio, fecha_fin);

-- Configuration index
CREATE INDEX idx_configuracion_key ON configuracion(key);
CREATE INDEX idx_configuracion_categoria ON configuracion(categoria);

-- Services index
CREATE INDEX idx_servicios_activo ON servicios(activo);
CREATE INDEX idx_servicios_categoria ON servicios(categoria);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to safely check if user is admin (prevents RLS recursion)
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
EXCEPTION
    WHEN OTHERS THEN
        -- Return false on any error to prevent auth bypass
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Log when the trigger fires for easier debugging
    RAISE NOTICE 'Trigger fired for user: %', NEW.email;
    -- Insert user profile
    INSERT INTO usuarios (id, correo, nombre)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );

    -- Assign role based on email or if first user
    IF NEW.email = 'admin@agendapro.com' OR NOT EXISTS (SELECT 1 FROM user_roles WHERE rol = 'admin') THEN
        -- Make admin if specific email or first user
        INSERT INTO user_roles (user_id, rol) VALUES (NEW.id, 'admin');
    ELSE
        -- Default role for other users
        INSERT INTO user_roles (user_id, rol) VALUES (NEW.id, 'cliente');
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth process
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure first user becomes admin
CREATE OR REPLACE FUNCTION ensure_first_user_is_admin()
RETURNS trigger AS $$
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

-- Trigger to ensure first user is admin
CREATE TRIGGER ensure_first_user_admin_trigger
    AFTER INSERT ON usuarios
    FOR EACH ROW EXECUTE FUNCTION ensure_first_user_is_admin();

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

CREATE POLICY "Personal can manage own availability" ON disponibilidad
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM personal p WHERE p.id = personal_id AND p.user_id = auth.uid())
    );

-- AUSENCIAS policies
CREATE POLICY "Admins and personal can read absences" ON ausencias
    FOR SELECT TO authenticated USING (
        is_admin_user() OR 
        EXISTS (SELECT 1 FROM personal p WHERE p.id = personal_id AND p.user_id = auth.uid())
    );

CREATE POLICY "Admins can manage absences" ON ausencias
    FOR ALL TO authenticated USING (is_admin_user());

CREATE POLICY "Personal can manage own absences" ON ausencias
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM personal p WHERE p.id = personal_id AND p.user_id = auth.uid())
    );

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

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION is_admin_user TO authenticated, anon;
GRANT EXECUTE ON FUNCTION handle_new_user TO authenticated, anon;
GRANT EXECUTE ON FUNCTION ensure_first_user_is_admin TO authenticated, anon;

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default configuration values
INSERT INTO configuracion (key, valor, descripcion, categoria) VALUES
    ('negocio_nombre', 'Mi Negocio', 'Nombre del negocio', 'general'),
    ('negocio_telefono', '', 'Teléfono principal del negocio', 'contacto'),
    ('negocio_email', '', 'Email principal del negocio', 'contacto'),
    ('negocio_direccion', '', 'Dirección física del negocio', 'contacto'),
    ('negocio_descripcion', '', 'Descripción del negocio', 'general'),
    
    ('horario_apertura', '08:00', 'Hora de apertura general', 'horarios'),
    ('horario_cierre', '18:00', 'Hora de cierre general', 'horarios'),
    ('dias_laborales', '1,2,3,4,5,6', 'Días laborales (1=Lunes, 7=Domingo)', 'horarios'),
    
    ('tiempo_minimo_reserva', '60', 'Tiempo mínimo de anticipación para reservar (minutos)', 'reservas'),
    ('cancelacion_limite', '24', 'Horas límite antes de la cita para cancelar', 'reservas'),
    ('duracion_slot_minima', '15', 'Duración mínima de slots de tiempo (minutos)', 'reservas'),
    
    ('moneda', 'COP', 'Moneda utilizada', 'financiero'),
    ('iva_porcentaje', '19', 'Porcentaje de IVA aplicable', 'financiero'),
    ('comision_plataforma', '0', 'Porcentaje de comisión por transacción', 'financiero'),
    
    ('notificaciones_email', 'true', 'Enviar notificaciones por email', 'notificaciones'),
    ('notificaciones_sms', 'false', 'Enviar notificaciones por SMS', 'notificaciones'),
    ('recordatorio_horas', '24', 'Horas antes de la cita para enviar recordatorio', 'notificaciones'),
    
    ('tema_color_primario', '#3b82f6', 'Color primario de la aplicación', 'apariencia'),
    ('tema_color_secundario', '#64748b', 'Color secundario de la aplicación', 'apariencia'),
    ('logo_url', '', 'URL del logo del negocio', 'apariencia');

-- Insert default services
INSERT INTO servicios (nombre, descripcion, duracion_min, precio, categoria, activo) VALUES
    ('Consulta General', 'Consulta médica general', 30, 50000, 'consultas', true),
    ('Consulta Especializada', 'Consulta con especialista', 45, 80000, 'consultas', true),
    ('Examen de Rutina', 'Examen médico de rutina', 60, 70000, 'examenes', true),
    ('Procedimiento Menor', 'Procedimiento médico menor', 90, 120000, 'procedimientos', true),
    ('Terapia Física', 'Sesión de terapia física', 60, 60000, 'terapias', true);

-- Insert sample staff availability (Monday to Friday, 8 AM to 6 PM)
-- This will be populated when staff members are created

-- Add helpful comments
COMMENT ON TABLE usuarios IS 'User profiles linked to Supabase Auth users';
COMMENT ON TABLE user_roles IS 'Role assignments for users (admin, colaborador, cliente)';
COMMENT ON TABLE servicios IS 'Available services with pricing and duration';
COMMENT ON TABLE personal IS 'Staff members with their specialties and contact info';
COMMENT ON TABLE disponibilidad IS 'Staff availability schedules by day of week';
COMMENT ON TABLE ausencias IS 'Staff absence records for specific dates/times';
COMMENT ON TABLE citas IS 'Appointment bookings linking clients, staff, and services';
COMMENT ON TABLE configuracion IS 'Application configuration settings organized by category';
COMMENT ON TABLE terceros IS 'Third party entities for future integrations';
COMMENT ON TABLE facturas IS 'Invoice records for billing functionality';
COMMENT ON TABLE integraciones IS 'External system integration configurations';

COMMENT ON FUNCTION is_admin_user IS 'Helper function to safely check admin status without RLS recursion';
COMMENT ON FUNCTION handle_new_user IS 'Automatically creates user profile and assigns role when new auth user is created';
COMMENT ON FUNCTION ensure_first_user_is_admin IS 'Ensures the first user to register gets admin privileges';