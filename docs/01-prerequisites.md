# 1. Prerequisites

You need three tools installed. Check each in a terminal (PowerShell / Terminal / Git Bash).

## Git
```bash
git --version
```
Not installed? Download from https://git-scm.com/downloads

First-time identity setup (once per machine):
```bash
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
```

## Python 3.11 or newer
```bash
python --version        # macOS/Linux may need: python3 --version
```
Not installed? https://www.python.org/downloads/ (Windows: tick **Add Python to PATH**).

## Node.js 18 or newer (includes npm)
```bash
node --version
npm --version
```
Not installed? https://nodejs.org (choose LTS).

## Accounts you will need (all have free tiers)
| Service | Used for | Link |
|---|---|---|
| GitHub | Code hosting | https://github.com/signup |
| Supabase | Database + login | https://supabase.com |
| Google AI Studio *or* Anthropic | AI itineraries | https://aistudio.google.com / https://console.anthropic.com |
| Render | Backend hosting | https://render.com |
| Vercel | Frontend hosting | https://vercel.com |

Next: [02 - GitHub setup](02-github-setup.md)
