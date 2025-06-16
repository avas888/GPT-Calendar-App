-- Reset password for admin user
-- Replace 'your_new_password' with the actual password you want to set

UPDATE auth.users 
SET 
  encrypted_password = crypt('your_new_password', gen_salt('bf')),
  updated_at = now()
WHERE email = 'admin@agendapro.com';

-- Optional: Also confirm the user if they're not confirmed
UPDATE auth.users 
SET 
  email_confirmed_at = now(),
WHERE email = 'admin@agendapro.com' AND email_confirmed_at IS NULL;