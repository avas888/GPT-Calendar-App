-- Create a new admin user with a different email
-- You can use this temporarily and delete the old one later

-- First, insert into auth.users (this creates the authentication record)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin2@agendapro.com',  -- Different email
  crypt('admin123', gen_salt('bf')),  -- Password: admin123
  now(),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"nombre": "Admin User"}'
);

-- Then create the profile and role using our existing function
SELECT handle_auth_user_creation(
  (SELECT id FROM auth.users WHERE email = 'admin2@agendapro.com'),
  'admin2@agendapro.com',
  'Admin User'
);