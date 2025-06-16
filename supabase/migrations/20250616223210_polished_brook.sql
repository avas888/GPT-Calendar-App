-- Drop and recreate the problematic function with safer logic
DROP FUNCTION IF EXISTS handle_auth_user_creation(uuid, text, text);

CREATE OR REPLACE FUNCTION handle_auth_user_creation(
    auth_user_id uuid,
    auth_email text,
    auth_name text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    user_name text;
    existing_user_id uuid;
BEGIN
    -- Determine user name
    user_name := COALESCE(auth_name, split_part(auth_email, '@', 1), 'Usuario');
    
    -- Check if user already exists with this email
    SELECT id INTO existing_user_id 
    FROM usuarios 
    WHERE correo = auth_email;
    
    -- If user exists with different ID, we have a problem
    -- Instead of updating primary keys, we'll handle this differently
    IF existing_user_id IS NOT NULL AND existing_user_id != auth_user_id THEN
        -- Log the conflict but don't try to update primary keys
        RAISE NOTICE 'User profile exists with email % but different ID. Auth ID: %, Existing ID: %', 
                     auth_email, auth_user_id, existing_user_id;
        
        -- Update user_roles to point to the auth_user_id instead
        UPDATE user_roles 
        SET user_id = auth_user_id 
        WHERE user_id = existing_user_id;
        
        -- Delete the old profile record to avoid conflicts
        DELETE FROM usuarios WHERE id = existing_user_id;
    END IF;
    
    -- Now safely insert the new user profile
    -- Handle ID conflicts first
    INSERT INTO usuarios (id, correo, nombre)
    VALUES (auth_user_id, auth_email, user_name)
    ON CONFLICT (id) DO UPDATE SET
        correo = EXCLUDED.correo,
        nombre = EXCLUDED.nombre;
    
    -- If there's still an email conflict after the above, handle it separately
    IF NOT FOUND THEN
        -- Try to update by email if the insert didn't work
        UPDATE usuarios 
        SET nombre = user_name
        WHERE correo = auth_email;
        
        -- If no rows were updated, the email conflict was resolved above
    END IF;
    
    -- Ensure user has appropriate role
    INSERT INTO user_roles (user_id, rol)
    VALUES (
        auth_user_id,
        CASE 
            WHEN auth_email = 'admin@agendapro.com' THEN 'admin'
            ELSE 'cliente'
        END
    )
    ON CONFLICT (user_id, rol) DO NOTHING;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix the admin setup function to avoid similar issues
DROP FUNCTION IF EXISTS ensure_admin_user_setup();

CREATE OR REPLACE FUNCTION ensure_admin_user_setup()
RETURNS void AS $$
DECLARE
    admin_user_id uuid;
    admin_email text := 'admin@agendapro.com';
    existing_admin_id uuid;
BEGIN
    -- Check if admin user already exists by email
    SELECT id INTO existing_admin_id 
    FROM usuarios 
    WHERE correo = admin_email;
    
    -- Check if admin role exists
    SELECT user_id INTO admin_user_id 
    FROM user_roles 
    WHERE rol = 'admin' 
    LIMIT 1;
    
    -- If admin user exists but no admin role, assign the role
    IF existing_admin_id IS NOT NULL AND admin_user_id IS NULL THEN
        INSERT INTO user_roles (user_id, rol)
        VALUES (existing_admin_id, 'admin')
        ON CONFLICT (user_id, rol) DO NOTHING;
        
        RAISE NOTICE 'Assigned admin role to existing user: %', existing_admin_id;
    
    -- If no admin user exists at all, create one
    ELSIF existing_admin_id IS NULL AND admin_user_id IS NULL THEN
        -- Generate a UUID for the admin user
        admin_user_id := gen_random_uuid();
        
        -- Insert admin user profile safely
        INSERT INTO usuarios (id, correo, nombre)
        VALUES (admin_user_id, admin_email, 'Administrador')
        ON CONFLICT (correo) DO UPDATE SET
            nombre = EXCLUDED.nombre;
        
        -- Get the actual ID after insert/update
        SELECT id INTO admin_user_id FROM usuarios WHERE correo = admin_email;
        
        -- Assign admin role
        INSERT INTO user_roles (user_id, rol)
        VALUES (admin_user_id, 'admin')
        ON CONFLICT (user_id, rol) DO NOTHING;
        
        RAISE NOTICE 'Created admin user with ID: %', admin_user_id;
    END IF;
    
    -- Ensure admin configuration is set
    INSERT INTO configuracion (key, valor) VALUES
        ('admin_email', admin_email),
        ('admin_setup_completed', 'true'),
        ('max_credentials_enabled', 'true')
    ON CONFLICT (key) DO UPDATE SET 
        valor = EXCLUDED.valor,
        updated_at = NOW();
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION ensure_admin_user_setup TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_admin_user_setup TO anon;
GRANT EXECUTE ON FUNCTION handle_auth_user_creation TO authenticated;
GRANT EXECUTE ON FUNCTION handle_auth_user_creation TO anon;

-- Run the admin setup function
SELECT ensure_admin_user_setup();

-- Add configuration to track this fix
INSERT INTO configuracion (key, valor) VALUES
    ('auth_schema_error_fixed', NOW()::text),
    ('syntax_error_resolved', 'true')
ON CONFLICT (key) DO UPDATE SET 
    valor = EXCLUDED.valor,
    updated_at = NOW();