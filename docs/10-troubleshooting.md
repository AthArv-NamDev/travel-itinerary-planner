# 10. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Browser console: **CORS error** | Frontend URL not in `CORS_ORIGINS` | Add the exact origin (no trailing slash) to `backend/.env` or Render env, restart/redeploy |
| "Cannot reach the server" | Backend not running, or wrong `VITE_API_URL` | Start uvicorn / check Render is Live; fix the URL and restart `npm run dev` (or Redeploy on Vercel) |
| Login page says "Supabase isn't configured" | Missing `frontend/.env` values | Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, restart `npm run dev` |
| 401 "Invalid or expired session" | Frontend and backend point to **different** Supabase projects, or wrong service-role key | Use the same project URL in both; re-copy the service-role key |
| 503 "Supabase is not configured on the server" | `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` missing in backend | Fill `backend/.env` / Render env vars |
| 502 "Database request failed" | Schema not applied | Run `supabase/schema.sql` in the SQL Editor |
| 502 "Itinerary generation failed: Gemini error 404/400" | Wrong model name or API key | Check `GEMINI_MODEL` / key ([guide 4](04-ai-api-keys.md)) |
| 502 "…timed out" | Slow AI response | Retry; use a faster model; shorten the trip |
| 502 "…returned 2 of 5 days" | AI produced too few days | Retry (it already retries once); try a shorter trip |
| Sign-up succeeds but can't sign in | Email confirmation is on | Click the email link, or disable "Confirm email" in Supabase Auth |
| Render first request very slow | Free instance was asleep | Wait ~30 s, or open `/api/health` first |
| Refreshing a Vercel page gives 404 | `vercel.json` missing / wrong Root Directory | Root Directory must be `frontend` |
| Changed a Vercel env var, no effect | Vite bakes env at build time | Click **Redeploy** |
| `ModuleNotFoundError` when running backend | venv not active / deps not installed | Activate `.venv`, run `pip install -r requirements.txt`; run uvicorn from the `backend` folder |
| PowerShell won't activate venv | Execution policy | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Port already in use | Another process on 8000 / 5173 | Use `--port 8001` (and update `VITE_API_URL`), or stop the other process |

Quick backend self-check: `GET /api/health` shows `ai_provider` and `supabase_configured`.
