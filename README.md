# Destiny Engine

AI-powered life transformation: map your life, name your dream, see if it adds up, then walk a month-by-month roadmap with daily coaching that re-plans when life happens.

**Stack:** React 19 + Vite 8 + Tailwind 4 · Node 24 + Express 5 · SQLite (built-in `node:sqlite`, no native deps) · Claude (`claude-opus-5-5`) via `@anthropic-ai/sdk` · pnpm workspaces

## Quick start

```bash
pnpm install
pnpm dev            # API on :4000, app on http://localhost:5173
```

Click **Explore a live demo** on the landing page (or sign in as `demo@destiny.app` / `dream-big-2026`) to see a seeded journey: Aarav's "move to Goa" plan, five weeks in, with income logged and coaching history.

**AI providers, picked automatically (check `GET /api/health` → `ai.provider`):**

1. `api`: `ANTHROPIC_API_KEY` is set in a root `.env` (see `.env.example`), so the Claude API is used.
2. `agent-sdk`: no key, but you're signed in to Claude Code on this machine. The server uses the **Claude Agent SDK** with your local login (e.g. a Pro/Max subscription). At startup it runs a tiny probe; calls are tool-less, single-turn and ignore your local Claude Code settings. Meant for local development and demos. A deployed product should use an API key.
3. `engine`: neither is available, so the built-in planning engine answers everything instantly and offline.

Force one with `AI_PROVIDER=api|agent-sdk|off`. Any failure at any tier falls back to the engine.

Pitch deck and demo script: [`demo/`](demo/PITCH.md).

### Single-port production run

```bash
pnpm build && pnpm start   # serves the built client + API on :4000
```

`pnpm seed` resets the demo account. `pnpm --filter ./server test` runs the server tests (adaptive re-planning, feasibility re-score, runway).

## Backend-free demo (`demo` branch)

`pnpm build:demo` builds a static site in `./site` that needs no server:

- `index.html`: the full app, built with `VITE_DEMO=1`. `client/src/demo/backend.js` implements every API route in the browser on top of the same planning engine, progress maths and demo journey as the server (imported from `server/src`), and keeps accounts and data in `localStorage`. The AI tier is the built-in engine.
- `slides.html`: the pitch deck (`slide.html` redirects to it), with a button back to the app.
- `404.html`: a copy of the app, so deep links like `/today` work on GitHub Pages.

Sign in with **Explore a live demo** (or `demo@destiny.app` / `dream-big-2026`), or create an account; a bar at the top links to the slides and resets Aarav's demo. Pushing the `demo` branch runs `.github/workflows/pages.yml`, which builds with `VITE_BASE=/<repo>/` and deploys to GitHub Pages. Preview locally with `VITE_BASE=/ pnpm build:demo` and any static server.

## How the AI works

Every AI function (`server/src/ai/index.js`) first computes a **grounded baseline** with the deterministic engine (`engine.js`): financial health, runway, feasibility scores, timeline, projections, all from the user's real numbers. If Claude is configured, it gets the profile plus that baseline and returns personalised JSON, which is **validated field by field and merged** over the baseline. Any failure (no key, rate limit, refusal, bad JSON) falls back to the baseline, so the UI never breaks.

| Function | What Claude does |
|---|---|
| `analyzeLifeProfile` | Narrative analysis, strengths, recommendations, skill market value |
| `analyzeDreamFeasibility` | Six-dimension scores, obstacles, timeline, a matched success story |
| `generateRoadmap` | Phases, month titles/goals/milestones, month 1's 28 daily actions, income projection, risks, resources |
| `generateWeeklyPlan` | On demand ("Personalise this month with Claude") for later months |
| `generateDailyCoaching` | Daily nudge / tip / warning / celebration from live progress |
| `requestAdvice` + `adaptRoadmap` | Diagnoses an obstacle, proposes actions and a timeline change, re-plans the remaining months |

**Re-planning keeps the story straight.** When a setback adds (or saves) months, the change lands in the phase you're in, so every later milestone moves with it ("moving day: month 6 → 7"). Months and weeks you've completed are never touched. Feasibility is re-scored with the same weights as the first score, moving only the components the setback affects, and the user sees all of it before choosing **Apply this plan** or **Keep my original plan**.

**Runway** is shown two ways on Today and Progress: how long savings last with no income, and how long counting the last 30 days of dream income, so logging income visibly moves it.

Requests use streaming, `output_config.effort` (low for coaching, medium for roadmaps), server-side refusal fallback, an in-memory cache for repeat analyses, and a per-minute rate limit on AI routes.

## Features → where they live

| Feature | Client | API |
|---|---|---|
| Life profile (26–29 adaptive questions, skip + local draft save) | `pages/Questionnaire.jsx`, `ProfileAnalysis.jsx` | `POST /api/profile/create`, `GET/PUT /api/profile/:userId`, `POST /api/profile/skills-analysis` |
| Dream input + 50 templates | `pages/DreamInput.jsx` | `POST /api/dreams/create`, `GET/PUT/DELETE /api/dreams/:id`, `GET /api/templates/dreams`, `POST /api/templates/use-template` |
| Feasibility report | `pages/Feasibility.jsx` | stored on the dream |
| Roadmap (constellation timeline, weekly checklists, projections, risks, resources) | `pages/Roadmap.jsx`, `components/Constellation.jsx` | `POST /api/roadmap/generate`, `GET /api/roadmap/:id`, `POST /api/roadmap/:id/months/:m/plan` |
| Daily check-in (runway, milestone countdowns, one-tap "stuck?" help) | `pages/Today.jsx` | `POST /api/progress/checklist-complete`, `POST /api/progress/complete-week` |
| Progress tracking (income/savings vs plan, consistency, milestones) | `pages/Progress.jsx` | `POST /api/progress/update`, `GET /api/progress/:userId`, `GET /api/progress/statistics` |
| Coaching feed + feedback/archive | `pages/Coach.jsx` | `GET /api/coaching/daily-message`, `GET /api/coaching/history`, `POST /api/coaching/feedback` |
| Adaptive planning ("Get help"): diagnosis, then a preview of exactly what changes (timeline, feasibility re-score, milestones that move, locked weeks) before you apply or keep the original | `pages/Coach.jsx` | `POST /api/coaching/request-advice` → `PUT /api/roadmap/:id` (or `POST /api/roadmap/regenerate`) |
| Settings, theme, data export, delete account | `pages/Settings.jsx` | `PUT /api/auth/settings`, `GET /api/auth/export`, `DELETE /api/auth/account` |
| Auth | `pages/Auth.jsx` | `POST /api/auth/register|login|logout|demo`, `GET /api/auth/profile` |

`GET /api/dashboard` returns the whole journey state in one call; the client uses it to keep users on the right step.

## Project layout

```
server/src
  ai/        engine.js (deterministic planner) · claude.js (Claude API / Agent SDK providers, caching) · index.js (orchestration)
  data/      archetypes.js (10 dream archetypes: phases, actions, risks, resources) · templates.js (50 dreams)
  lib/       auth.js (JWT) · state.js (persistence + progress stats)
  routes/    auth, profile, dreams, roadmap, progress, coaching, templates, dashboard
  db.js      SQLite schema (users, life_profiles, dreams, roadmaps, progress, coaching_messages, adaptations)
  seed.js    demo account
client/src
  pages/     Landing, Auth, Questionnaire, ProfileAnalysis, DreamInput, Feasibility, Today, Roadmap, Progress, Coach, Settings
  components/ Constellation (signature timeline), Charts (Recharts), ui (checklist, rings, coaching card, celebration…)
```

## Deploying

- **One service (simplest):** Render/Railway, build `pnpm install && pnpm build`, start `pnpm start`. Mount a persistent disk at `server/data` for SQLite.
- **Split:** client on Vercel/Netlify with `VITE_API_URL=https://your-api/api`; API anywhere with `CLIENT_ORIGIN` set.
