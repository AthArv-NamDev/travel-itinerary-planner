# Wayfind - Personalized Travel Itinerary Planner

AI-powered full-stack app that turns a destination, dates, budget and vibe into an optimised day-by-day itinerary you can edit, save, share and export.

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite, React Router, plain CSS (dark, glassy, Superlist-inspired design system) |
| Backend | Python FastAPI |
| Database + Auth | Supabase (Postgres + Row Level Security + email/password auth) |
| AI | Google Gemini **or** Anthropic Claude (or a built-in `mock` mode that needs no key) |
| Hosting | Backend on **Render**, frontend on **Vercel** |

## What's included (essentials only)

- Sign up / sign in (Supabase Auth)
- **Preference capture** - vibe, pace, budget style, interests, saved defaults
- **Prompt structuring + AI itinerary generation** with strict JSON validation and one automatic retry
- **Destination recommendations** (Discover page)
- **Route & time optimisation** - stops re-ordered by proximity, travel times, no overlapping times, cost totals
- **Vibe-based personalisation** (adventure, culture, romantic, foodie, nature, nightlife, family, wellness)
- **Trip management** - save, rename, favourite, edit (check off / add / remove stops), regenerate a day or the whole trip, delete
- **Share & export** - read-only share link, Markdown, Calendar (.ics), JSON, Print/PDF
- Responsive UI (phone → desktop), loading/error/empty states, error boundary

## Project structure

```
travel-itinerary-planner/
├── README.md                 <- you are here
├── docs/                     <- one setup guide per tool (follow in order)
├── supabase/schema.sql       <- tables + RLS, paste into Supabase SQL editor
├── backend/                  <- FastAPI
│   ├── app/
│   │   ├── main.py           app, CORS, error handling, /api/health
│   │   ├── config.py         environment settings
│   │   ├── auth.py           verifies Supabase JWT
│   │   ├── db.py             Supabase REST client
│   │   ├── schemas.py        request + itinerary validation (tolerant of messy LLM output)
│   │   ├── routers/          trips.py, profile.py
│   │   └── services/         ai.py, prompts.py, optimizer.py, export.py, mock.py
│   ├── tests/test_core.py
│   ├── requirements.txt / requirements-dev.txt
│   └── .env.example
└── frontend/                 <- React + Vite
    ├── src/{pages,components,context,lib}/
    ├── vercel.json           SPA routing for Vercel
    └── .env.example
```

## Setup guides - follow in this order

| # | Guide | What you do |
|---|---|---|
| 1 | [docs/01-prerequisites.md](docs/01-prerequisites.md) | Install Git, Python 3.11+, Node 18+ |
| 2 | [docs/02-github-setup.md](docs/02-github-setup.md) | Create the repo, push the code |
| 3 | [docs/03-supabase-setup.md](docs/03-supabase-setup.md) | Create project, run schema, get keys |
| 4 | [docs/04-ai-api-keys.md](docs/04-ai-api-keys.md) | Get a Gemini (free) or Anthropic key |
| 5 | [docs/05-backend-setup.md](docs/05-backend-setup.md) | Run FastAPI locally + tests |
| 6 | [docs/06-frontend-setup.md](docs/06-frontend-setup.md) | Run React locally |
| 7 | [docs/07-deploy-backend-render.md](docs/07-deploy-backend-render.md) | Deploy API to Render |
| 8 | [docs/08-deploy-frontend-vercel.md](docs/08-deploy-frontend-vercel.md) | Deploy UI to Vercel |
| 9 | [docs/09-testing-checklist.md](docs/09-testing-checklist.md) | Functional + database validation |
| 10 | [docs/10-troubleshooting.md](docs/10-troubleshooting.md) | Common errors and fixes |

## 10-minute local quick start

```bash
# 1. Supabase: create a project, run supabase/schema.sql (see docs/03)
# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # Windows: copy .env.example .env  (then edit it)
uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env                                   # Windows: copy .env.example .env  (then edit it)
npm run dev                                            # http://localhost:5173
```

Tip: set `AI_PROVIDER=mock` in `backend/.env` to test the entire app with no AI key (it returns generic demo itineraries).

## API summary

All `/api/*` routes except `health` and `shared/{token}` need `Authorization: Bearer <supabase access token>`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Status, AI provider, Supabase configured? |
| POST | `/api/trips/generate` | Generate + save a trip |
| GET | `/api/trips` · `/api/trips/{id}` | List / fetch |
| PATCH | `/api/trips/{id}` | Rename, favourite, save edited itinerary |
| DELETE | `/api/trips/{id}` | Delete |
| POST | `/api/trips/{id}/regenerate` | Regenerate whole trip |
| POST | `/api/trips/{id}/days/{n}/regenerate` | Regenerate one day |
| POST | `/api/trips/{id}/share` | Enable/disable share link |
| GET | `/api/trips/{id}/export?format=md\|ics\|json` | Download |
| GET | `/api/shared/{token}` | Public read-only trip |
| GET/PUT | `/api/preferences` | Saved defaults |
| POST | `/api/recommendations` | Destination suggestions |

Interactive docs when running locally: http://localhost:8000/docs

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` and AI keys live **only** in `backend/.env` / Render env vars. Never put them in the frontend.
- `.env` files are git-ignored. Only `.env.example` is committed.
- Every query is filtered by the authenticated user's id; RLS adds a second layer.
- Share links use 128-bit random tokens and can be revoked at any time.
