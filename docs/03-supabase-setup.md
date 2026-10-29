# 3. Supabase setup (Milestone 2)

## Activity 2.1 - Create the project
1. https://supabase.com/dashboard → **New project**.
2. Name `travel-planner`, set a strong database password (save it), choose the region closest to you, **Create**. Wait ~2 minutes.

## Activity 2.2 - Create the tables
1. Left menu → **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this project, copy **everything**, paste, click **Run**. You should see "Success. No rows returned".
3. Verify: **Table Editor** shows `trips` and `user_preferences`.

Tables created:
| Table | Purpose |
|---|---|
| `trips` | One row per itinerary (dates, budget, vibe, `itinerary` JSON, share token, favourite flag) |
| `user_preferences` | Saved defaults per user |

The script is safe to re-run.

## Activity 2.3 - Get your keys and store them in `.env`
Go to **Project Settings → API** (or "API Keys"). You need three values:

| Value | Goes into | Notes |
|---|---|---|
| **Project URL** | `backend/.env` → `SUPABASE_URL` and `frontend/.env` → `VITE_SUPABASE_URL` | e.g. `https://abcd1234.supabase.co` |
| **anon / public key** | `frontend/.env` → `VITE_SUPABASE_ANON_KEY` | Safe for browsers |
| **service_role key** | `backend/.env` → `SUPABASE_SERVICE_ROLE_KEY` | **SECRET. Backend only.** |

Create the files:
```bash
# macOS / Linux / Git Bash
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env
```
```powershell
# Windows PowerShell
copy backend\.env.example  backend\.env
copy frontend\.env.example frontend\.env
```
Then open each `.env` and paste the values.

## Auth settings
**Authentication → Providers → Email** is enabled by default.

- For quick testing, turn **off** "Confirm email" (Authentication → Providers → Email). Otherwise new users must click an email link before signing in.
- After you deploy (guide 8): **Authentication → URL Configuration** → set **Site URL** to your Vercel URL and add it under **Redirect URLs**.

## Validate database updates (Activity 7.2)
After generating a trip in the app, open **Table Editor → trips**: you should see a new row with your `user_id`, the `itinerary` JSON, and `estimated_cost`. Editing the trip in the app (check off an item, rename it) should update the same row and change `updated_at`.

Next: [04 - AI API keys](04-ai-api-keys.md)
