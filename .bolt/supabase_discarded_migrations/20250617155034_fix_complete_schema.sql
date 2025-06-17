
-- Create usuarios table
CREATE TABLE usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE user_roles (
    user_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    rol TEXT NOT NULL
);

-- Create personal table
CREATE TABLE personal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    usuario_id UUID REFERENCES usuarios(id)
);

-- Create citas table
CREATE TABLE citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    fecha TIMESTAMPTZ NOT NULL,
    descripcion TEXT
);

-- Create configuracion table
CREATE TABLE configuracion (
    key TEXT PRIMARY KEY,
    valor TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger function to populate usuarios and user_roles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usuarios (id) VALUES (NEW.id);
  INSERT INTO user_roles (user_id, rol) VALUES (NEW.id, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS policies
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios: owners only" ON usuarios
  FOR SELECT USING (id = auth.uid());

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "UserRoles: owners only" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Optional seed
INSERT INTO configuracion (key, valor) VALUES 
  ('backup_admin_created', 'true'),
  ('backup_admin_email', 'admin@agendapro.com')
ON CONFLICT (key) DO UPDATE SET valor = EXCLUDED.valor;

-- COMMENT for documentation
COMMENT ON TABLE usuarios IS 'User profile info linked to auth.users';
