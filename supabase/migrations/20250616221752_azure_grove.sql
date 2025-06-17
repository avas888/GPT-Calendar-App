/*
  # Create New Admin User - Fixed Version

  1. Create a new admin user with proper Supabase auth integration
  2. Use only the columns we can safely insert into
  3. Let Supabase handle the generated columns automatically
  4. Create the corresponding profile and role
*/

-- Create a new admin user in auth.users table
-- We'll use a simpler approach that works with Supabase's constraints
DO $$
DECLARE
    new_admin_id uuid;
BEGIN
    -- Generate a new UUID for the admin users
    new_admin_id := gen_random_uuid();
    
  -- Insert into auth.users with only the required fields
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
        new_admin_id,
        'authenticated',
        'authenticated',
        'admin2@agendapro.com',
        crypt('admin123', gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"nombre": "Admin User"}'
    );
    
    -- Create the user profile in usuarios table
    INSERT INTO usuarios (id, correo, nombre)
    VALUES (new_admin_id, 'admin2@agendapro.com', 'Admin User')
    ON CONFLICT (id) DO UPDATE SET
        correo = EXCLUDED.correo,
        nombre = EXCLUDED.nombre;
    
    -- Assign admin role
    INSERT INTO user_roles (user_id, rol)
    VALUES (new_admin_id, 'admin')
    ON CONFLICT (user_id, rol) DO NOTHING;
    
    -- Log the creation
    RAISE NOTICE 'Created new admin user with ID: % and email: admin2@agendapro.com', new_admin_id;
    
END $$;

-- Update configuration to track this
INSERT INTO configuracion (key, valor) VALUES
    ('backup_admin_created', 'true'),
    ('backup_admin_email', 'admin2@agendapro.com'),
    ('backup_admin_created_at', NOW()::text)
ON CONFLICT (key) DO UPDATE SET 
    valor = EXCLUDED.valor,
    updated_at = NOW();

-- Add a comment for documentation
COMMENT ON TABLE usuarios IS 'User profiles table. Backup admin created with email: admin2@agendapro.com, password: admin123';