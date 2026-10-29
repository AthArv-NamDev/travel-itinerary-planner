# 6. Frontend setup - React + Vite

## Install
```bash
cd frontend
npm install
```

## Configure
`frontend/.env` (created in [guide 3](03-supabase-setup.md)):
```env
VITE_SUPABASE_URL=https://YOUR-REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
```
Use the **anon** key here, never the service-role key. Restart `npm run dev` after any `.env` change.

## Run
Make sure the backend is running first ([guide 5](05-backend-setup.md)).
```bash
npm run dev
```
Open http://localhost:5173

## Production build (what Vercel runs)
```bash
npm run build        # outputs to frontend/dist
npm run preview      # serve the build locally
```

## Using the app
1. **Sign up** → you land on the dashboard.
2. **Plan a trip** → fill destination, dates, budget, vibe → **Generate** (15-45 s with a real AI).
3. In the trip view: tick items done, **＋ Add**, remove (✕), **↻ Regenerate day** (with an optional instruction), rename the title, star it, create a **share link**, **export**.
4. **Discover** → pick a vibe → get destination ideas → **Plan trip →**.
5. **Preferences** → save defaults used to pre-fill the builder.

## Design system
All colours, radii and glass effects are CSS variables at the top of `src/styles.css` (`--bg`, `--grad`, `--border`, …). Change them there to re-theme the whole app.

Next: [07 - Deploy backend to Render](07-deploy-backend-render.md)
