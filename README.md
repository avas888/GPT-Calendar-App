# GPT-Calendar-App

This repository contains a demo scheduling application backed by Supabase.

## Fixing Failed Sign Up Due to Trigger Conflicts

Some earlier migrations attempted to create the `on_auth_user_created` trigger without dropping an existing one. This could cause a `trigger already exists` error during the admin account creation flow. To resolve existing databases:

1. Run the SQL script at `supabase/scripts/reset_auth_trigger.sql` against your Supabase instance. It drops the old trigger and function and recreates them with a small logging notice.

```bash
psql $SUPABASE_CONNECTION_STRING -f supabase/scripts/reset_auth_trigger.sql
```

2. After running the script, new sign ups should succeed. Future migrations have been updated to safely drop the trigger before creating it.
