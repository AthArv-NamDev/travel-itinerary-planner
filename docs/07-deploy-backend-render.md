# 7. Deploy the backend to Render (Activity 6.1)

Push your code to GitHub first ([guide 2](02-github-setup.md)).

## Create the web service
1. https://dashboard.render.com → **New +** → **Web Service** → connect your GitHub repo.
2. Fill in:

| Field | Value |
|---|---|
| Name | `wayfind-api` |
| Root Directory | `backend` |
| Runtime | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Instance type | Free (sleeps after ~15 min idle; first request takes ~30 s to wake) |

3. **Environment Variables** (Advanced → Add):

| Key | Value |
|---|---|
| `PYTHON_VERSION` | `3.12.3` |
| `SUPABASE_URL` | your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | your service-role key |
| `AI_PROVIDER` | `gemini` (or `anthropic`) |
| `GEMINI_API_KEY` | your key |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `CORS_ORIGINS` | `http://localhost:5173` for now (update after Vercel, below) |

4. **Create Web Service**. When it says **Live**, open `https://wayfind-api.onrender.com/api/health` - you should see `"status":"ok"`.

## After deploying the frontend
Go back to Render → your service → **Environment** → set:
```
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:5173
```
(no trailing slashes, comma-separated). Save; Render redeploys automatically.

## Notes
- Render free instances sleep when idle: the first request after a break is slow. Open the health URL before a demo.
- Generating an itinerary can take up to ~45 s. Render allows this.

Next: [08 - Deploy frontend to Vercel](08-deploy-frontend-vercel.md)
