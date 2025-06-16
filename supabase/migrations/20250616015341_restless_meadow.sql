/*
  # Create Default Admin User

  1. New User
    - Creates a default admin user with email: admin@agendapro.com
    - Password will be set via Supabase Auth (you'll need to set this manually)
    
  2. Admin Role
    - Assigns admin role to the default user
    
  3. Instructions
    - After running this migration, you'll need to:
      1. Go to Supabase Dashboard > Authentication > Users
      2. Create a user with email: admin@agendapro.com
      3. Set a secure password
      4. The role will be automatically assigned via this migration
*/

-- Insert default admin user (this will be linked when the auth user is created)
-- Note: The actual auth user must be created through Supabase Auth UI or API
-- This just ensures the role is ready when the user signs up

-- Function to handle new user registration and assign admin role if email matches
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into usuarios table
  INSERT INTO usuarios (id, correo, nombre)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nombre', 'Admin User'));
  
  -- Assign admin role if this is the admin email
  IF NEW.email = 'admin@agendapro.com' THEN
    INSERT INTO user_roles (user_id, rol)
    VALUES (NEW.id, 'admin');
  ELSE
    -- Default role for other users
    INSERT INTO user_roles (user_id, rol)
    VALUES (NEW.id, 'cliente');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insert some sample data for testing (optional)
INSERT INTO configuracion (key, valor) VALUES
  ('admin_email', 'admin@agendapro.com'),
  ('setup_completed', 'false')
ON CONFLICT (key) DO UPDATE SET valor = EXCLUDED.valor;