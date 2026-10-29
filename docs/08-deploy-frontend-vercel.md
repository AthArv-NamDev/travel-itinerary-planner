# 8. Deploy the frontend to Vercel (Activity 6.2)

1. https://vercel.com/new → **Import** your GitHub repo.
2. Configure:

| Field | Value |
|---|---|
| Framework Preset | **Vite** |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

3. **Environment Variables**:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | your **anon** key |
| `VITE_API_URL` | `https://wayfind-api.onrender.com` (your Render URL, no trailing slash) |

4. **Deploy**. You get a URL like `https://your-app.vercel.app`.

`frontend/vercel.json` already rewrites all paths to `index.html`, so refreshing on `/app/trips/...` or opening a `/shared/...` link works.

## Final wiring (don't skip)
1. **Render** → Environment → `CORS_ORIGINS=https://your-app.vercel.app,http://localhost:5173` ([guide 7](07-deploy-backend-render.md)).
2. **Supabase** → Authentication → URL Configuration → **Site URL** = `https://your-app.vercel.app`, add the same URL to **Redirect URLs**.
3. Environment variables are baked in at build time: if you change one on Vercel, click **Redeploy**.

## Submit
Demo link = your Vercel URL. GitHub link = your repo URL.

Next: [09 - Testing checklist](09-testing-checklist.md)
