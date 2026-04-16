# Embedia CEO Cockpit — Deployment Guide

**Target:** cockpit.embedia.io  
**Stack:** Next.js + Supabase + Claude API on Vercel  
**Time estimate:** ~30 minutes

---

## Step 1: Create Supabase Project (5 min)

1. Go to **https://supabase.com** → Sign in (or create free account)
2. Click **"New Project"**
3. Fill in:
   - **Name:** `embedia-cockpit`
   - **Database Password:** (generate a strong one — save it)
   - **Region:** `eu-central-1` (Frankfurt) — closest to DACH clients
4. Wait ~2 minutes for provisioning
5. Once ready, go to **Settings → API** and copy:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → this is your `SUPABASE_SERVICE_ROLE_KEY`

## Step 2: Run Database Migration (3 min)

1. In Supabase dashboard → **SQL Editor**
2. Click **"New query"**
3. Paste the ENTIRE contents of `supabase/migrations/001_initial_schema.sql`
4. Click **"Run"** — should show "Success. No rows returned"
5. Create another new query
6. Paste the ENTIRE contents of `supabase/seed.sql`
7. Click **"Run"** — should show rows inserted

**Verify:** Go to Table Editor → you should see tables: projects, wbs_stages, wbs_tasks, pipeline_accounts, etc.

## Step 3: Create First Admin User (2 min)

1. In Supabase → **Authentication → Users**
2. Click **"Add user" → "Create new user"**
3. Enter: `safouen@embedia.io` + a password
4. After user is created, copy the user's UUID
5. Go to **SQL Editor** and run:

```sql
INSERT INTO public.users (id, email, full_name, role)
VALUES ('<paste-uuid-here>', 'safouen@embedia.io', 'Safouen Selmi', 'admin');
```

## Step 4: Get Anthropic API Key (1 min)

1. Go to **https://console.anthropic.com** → API Keys
2. Create a new key named `embedia-cockpit`
3. Copy the key → this is your `ANTHROPIC_API_KEY`

## Step 5: Push to GitHub (3 min)

From the `app/` directory, run:

```bash
git init
git add .
git commit -m "feat: Embedia CEO Cockpit MVP — dashboard, agent chat, pipeline"
git remote add origin https://github.com/YOUR_USERNAME/embedia-cockpit.git
git push -u origin main
```

## Step 6: Deploy to Vercel (5 min)

1. Go to **https://vercel.com** → Sign in with GitHub
2. Click **"Add New" → "Project"**
3. Import the `embedia-cockpit` repository
4. Framework preset will auto-detect **Next.js**
5. Add environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | (from Step 1) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (from Step 1) |
| `SUPABASE_SERVICE_ROLE_KEY` | (from Step 1) |
| `ANTHROPIC_API_KEY` | (from Step 4) |
| `NEXT_PUBLIC_APP_URL` | `https://cockpit.embedia.io` |

6. Click **"Deploy"** — wait ~2 minutes
7. Vercel gives you a URL like `embedia-cockpit-xxx.vercel.app` — verify it works

## Step 7: Connect Custom Domain (5 min)

### In Vercel:
1. Go to your project → **Settings → Domains**
2. Add domain: `cockpit.embedia.io`
3. Vercel will show: "Add CNAME record pointing to `cname.vercel-dns.com`"

### In GoDaddy:
1. Go to **https://dcc.godaddy.com** → your domain `embedia.io`
2. Click **DNS → DNS Records**
3. Click **"Add New Record"**:
   - **Type:** CNAME
   - **Name:** `cockpit`
   - **Value:** `cname.vercel-dns.com`
   - **TTL:** 600 (or default)
4. Save

### Verify:
- Wait 5-10 minutes for DNS propagation
- Visit **https://cockpit.embedia.io** — SSL certificate is auto-provisioned by Vercel
- You should see the login page

## Step 8: Configure Supabase Auth Redirect (1 min)

1. In Supabase → **Authentication → URL Configuration**
2. Set **Site URL:** `https://cockpit.embedia.io`
3. Add to **Redirect URLs:** `https://cockpit.embedia.io/**`

---

## Done!

Your cockpit is live at **cockpit.embedia.io** with:
- Supabase auth (email + magic link)
- 7 AI agents via Claude API
- Portfolio dashboard with live data
- BD pipeline Kanban
- Voice input support

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Login redirects loop | Check Supabase Site URL matches your domain |
| Agent chat fails | Verify ANTHROPIC_API_KEY in Vercel env vars |
| No data showing | Confirm seed.sql ran successfully in SQL Editor |
| CNAME not resolving | Wait 15 min; check GoDaddy shows the record |
| 500 on API routes | Check Vercel logs → Functions tab for errors |
