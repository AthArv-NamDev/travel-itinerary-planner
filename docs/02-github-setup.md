# 2. GitHub setup (Milestone 1 - Activity 1.1)

## A. Create the repository
1. Go to https://github.com/new
2. Name: `travel-itinerary-planner`, visibility **Public** (mentors can review it), leave "Add README/.gitignore" **unchecked** (the project already has them).
3. Click **Create repository** and copy the repo URL.

## B. Push this project
Unzip the project, then in a terminal:

```bash
cd travel-itinerary-planner
git init
git add .
git status                      # make sure NO ".env" file is listed (only .env.example)
git commit -m "Initial commit: Wayfind travel itinerary planner"
git branch -M main
git remote add origin https://github.com/<your-username>/travel-itinerary-planner.git
git push -u origin main
```

If asked to log in, use a **Personal Access Token** instead of your password:
GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → scope `repo`.

## C. Daily workflow
```bash
git add .
git commit -m "Describe what changed"
git push
```
Render and Vercel redeploy automatically on every push to `main`.

## D. Submit
Add your GitHub repo link and the deployed frontend URL (from [guide 8](08-deploy-frontend-vercel.md)) in your project's "Add Demo Link / Add Github Link" fields.

> **Never commit secrets.** `.gitignore` already excludes `.env`. If you ever leak a key, rotate it in the provider's dashboard immediately.

Next: [03 - Supabase setup](03-supabase-setup.md)
