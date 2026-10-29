# 5. Backend setup - FastAPI (Milestones 3-5)

All commands run from the project root unless stated.

## Install
```bash
cd backend
python -m venv .venv
```
Activate the virtual environment:
```bash
source .venv/bin/activate          # macOS / Linux / Git Bash
```
```powershell
.venv\Scripts\Activate.ps1         # Windows PowerShell
# If blocked: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
```bash
pip install -r requirements.txt
```

## Configure
`backend/.env` (created in [guide 3](03-supabase-setup.md)):
```env
SUPABASE_URL=https://YOUR-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
AI_PROVIDER=gemini            # or anthropic / mock
GEMINI_API_KEY=...
CORS_ORIGINS=http://localhost:5173
```

## Run
```bash
uvicorn app.main:app --reload --port 8000
```
- Health check: http://localhost:8000/api/health → `{"status":"ok","ai_provider":"gemini","supabase_configured":true}`
- Interactive API docs: http://localhost:8000/docs

## Run the automated tests
These use an in-memory fake database and the mock AI, so they need no keys or internet.
```bash
pip install -r requirements-dev.txt
pytest -q
```
Expected: all tests pass (schemas, optimiser, costs, trip lifecycle, access control, export, share).

## How the backend works (for your viva / report)
1. **Preference capture** → `TripRequest` validates input (dates, budget, 14-day cap).
2. **Prompt structuring** → `services/prompts.py` merges destination, dates, group size, budget per person per day, pace, vibe, budget style and interests into a strict JSON-only prompt.
3. **Generation** → `services/ai.py` calls Gemini/Claude, strips code fences, validates against the `Itinerary` model, retries once on bad output.
4. **Route & time optimisation** → `services/optimizer.py` re-orders sightseeing stops with a nearest-neighbour pass on GPS coordinates, computes travel distance/time (haversine × 1.3 road factor), prevents overlapping times, and totals costs (food / activities / transport / stay).
5. **Persistence** → `routers/trips.py` saves to Supabase, always filtered by the verified user id.

Next: [06 - Frontend setup](06-frontend-setup.md)
