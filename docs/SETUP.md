# Server authentication setup

Bohdi's World uses prefixed tables in the shared **Kanons** Supabase project's `public` schema. Set these server-only variables in `.env.local`:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# Optional: when set, new accounts must enter this code.
SIGNUP_CODE=<optional: 16+ random characters, e.g. from `openssl rand -base64 12`>
```

Never prefix either Supabase variable with `NEXT_PUBLIC_`. The service-role key must not be exposed to browser code.

Run [`migrations/000_full_schema.sql`](../migrations/000_full_schema.sql) in the Kanons Supabase SQL editor. It creates only `bohdi_*` tables, functions, triggers, constraints, and `idx_bohdi_*` indexes. It enables RLS and applies grants per Bohdi table; it does not alter schema-wide privileges or objects belonging to other apps.

## Create the first superuser

There is no environment-based admin bootstrap. This prevents someone from claiming a reserved administrator username before its owner.

1. Kyle signs up normally with the intended username.
2. The director runs this statement once in the Supabase SQL editor, replacing `kyle_username` with the actual lowercase username:

```sql
UPDATE public.bohdi_simple_users
SET role = 'superuser'
WHERE username = 'kyle_username';
```

3. Kyle signs out and back in. Future administrators and superusers are managed through the admin role screen.

Existing Bohdi accounts with legacy SHA-256 password hashes can still sign in. Their password is automatically rehashed with scrypt after the first successful login.

