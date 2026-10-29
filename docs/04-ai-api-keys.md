# 4. AI provider keys

The backend supports three providers. Pick **one** in `backend/.env` with `AI_PROVIDER`.

| `AI_PROVIDER` | Needs | Cost | Best for |
|---|---|---|---|
| `gemini` | `GEMINI_API_KEY` | Free tier available | Easiest way to get real itineraries |
| `anthropic` | `ANTHROPIC_API_KEY` | Pay-as-you-go | Highest quality |
| `mock` | nothing | Free | Testing the app end-to-end, demos, CI |

## Option A - Gemini (recommended to start)
1. Open https://aistudio.google.com/apikey and sign in.
2. **Create API key**, copy it.
3. In `backend/.env`:
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=paste-your-key
GEMINI_MODEL=gemini-2.5-flash
```
If the model name is rejected, check the current model list at https://ai.google.dev/gemini-api/docs/models and update `GEMINI_MODEL`.

## Option B - Anthropic (Claude)
1. https://console.anthropic.com → **API Keys** → **Create Key**. Add billing credit.
2. In `backend/.env`:
```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=paste-your-key
ANTHROPIC_MODEL=claude-sonnet-5-5
```
Model names change over time: see https://docs.claude.com for the current list.

## Option C - Mock mode
```env
AI_PROVIDER=mock
```
Returns generic, clearly-labelled demo itineraries. Everything else (saving, editing, sharing, export) behaves exactly the same.

## Check it works
Start the backend ([guide 5](05-backend-setup.md)) and open http://localhost:8000/api/health. It shows the provider in use.

Next: [05 - Backend setup](05-backend-setup.md)
