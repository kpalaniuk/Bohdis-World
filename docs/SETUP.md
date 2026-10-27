# Server authentication setup

Bohdi's World uses prefixed tables in the shared **Kanons** Supabase project's `public` schema. Set these server-only variables in `.env.local`:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# Optional: when set, new accounts must enter this code.
SIGNUP_CODE=<optional: 16+ random characters, e.g. from `openssl rand -base64 12`>
```

Never prefix either Supabase variable with `NEXT_PUBLIC_`. The service-role key must not be exposed to browser code.

Run [`migrations/000_full_schema.sql`](../migrations/000_full_schema.sql), followed by [`migrations/001_bohdi_claim.sql`](../migrations/001_bohdi_claim.sql), in the Kanons Supabase SQL editor. They create only `bohdi_*` tables, functions, triggers, constraints, and `idx_bohdi_*` indexes. They enable RLS and apply grants per Bohdi table; they do not alter schema-wide privileges or objects belonging to other apps.

## Set the one-time Bohdi claim answer

Generate the scrypt hash locally. Enter the real answer only at the hidden prompt; do not put it in shell history, source control, logs, fixtures, or client-side variables:

```sh
read -s "CLAIM_ANSWER?Answer: "; echo
CLAIM_ANSWER="$CLAIM_ANSWER" node -e 'const {randomBytes,scrypt}=require("node:crypto");const n=process.env.CLAIM_ANSWER.toLowerCase().replace(/[^a-z]/g,"");const salt=randomBytes(16);scrypt(n,salt,64,{N:16384,r:8,p:1},(e,key)=>{if(e)throw e;console.log(`scrypt$16384$8$1$${salt.toString("base64")}$${key.toString("base64")}`)})'
unset CLAIM_ANSWER
```

Copy the generated hash into this one SQL insert and run it in the Supabase SQL editor. Replace only the placeholder; never commit the resulting statement or hash:

```sql
INSERT INTO public.bohdi_app_secrets (key, value, expires_at, updated_at)
VALUES ('bohdi_claim_answer_hash', '<paste locally generated scrypt hash>', NULL, NOW())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, expires_at = NULL, updated_at = NOW();
```

The **I'M BOHDI** button appears only while this answer hash exists and no claimed-user marker has been written. A successful claim writes that marker automatically, so the flow can be used only once.

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

### Re-opening the "I'M BOHDI" claim

The claim works once. If Bohdi's account is ever deleted and he needs to claim again, the director runs:

```sql
DELETE FROM public.bohdi_app_secrets WHERE key IN ('bohdi_claimed_user_id', 'bohdi_claim_token_hash');
```
