# Scaffold

A personal planner combining a weekly calendar, tasks, goals (with milestones and
next actions), habits, a journal, and an education/assignment tracker — with
Supabase for auth and persistence.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a [Supabase](https://supabase.com) project, then run
   [supabase/schema.sql](supabase/schema.sql) in its SQL Editor (Project → SQL
   Editor → New query → paste → Run). This creates every table plus row-level
   security so each signed-in user only ever sees their own data.

3. Copy `.env.example` to `.env` and fill in your project's URL and anon key
   (Project Settings → API):

   ```bash
   cp .env.example .env
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

## Notes

- Auth is email/password via Supabase Auth. Email confirmation is on by
  default for new Supabase projects — toggle it off under Authentication →
  Sign In / Providers → Email if you want sign-up to log straight in.
- `src/lib` holds framework-agnostic helpers (dates, colors, shared styles).
- `src/hooks` holds the Supabase-backed data hooks (one per table/feature).
- `src/components` is organized by feature area (calendar, tasks, goals,
  habits, journal, education, onboarding, auth, nav).

## Deploying

Push this repo to GitHub, then import it in [Vercel](https://vercel.com) as a
Vite project. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as
environment variables in the Vercel project settings — Vercel auto-detects the
build command and output directory for Vite.
