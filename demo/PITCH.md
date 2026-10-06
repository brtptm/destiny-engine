# Destiny Engine — Pitch & Demo Kit

> **Turn your dream into a map you can walk.**
> An AI life-transformation coach: it reads your real situation, tells you honestly whether your dream adds up, turns it into a month-by-month roadmap with seven concrete actions a week, and re-plans with you when life gets in the way.

**In this folder**

| File | What it is |
|---|---|
| `slides.html` | 16-slide reveal.js deck with a live three.js constellation background. Open it in Chrome. |
| `assets/*.jpeg` | Real screenshots from the running app (used by the slides). |
| `PITCH.md` | This file: pitch script, demo script, checklist, Q&A prep. |

**Presenting the slides:** open `demo/slides.html` in Chrome → `F` fullscreen · `→`/`Space` next · `S` speaker notes (second window) · `O` overview · `Esc` exit. Needs internet for fonts and the CDN scripts.

---

## 1. Elevator pitch (30 seconds)

Everyone has a dream — move to Goa, quit the 9–5, start a channel, retire early. Almost nobody has a plan for *this Tuesday*. Generic advice ignores your EMI, your kids and the two hours you actually have.

Destiny Engine takes ten minutes to understand your life — money, skills, family, time — then scores your dream across six honest dimensions, draws a month-by-month roadmap with seven specific actions a week, coaches you every day, and re-plans in one click when something goes wrong. The numbers come from a deterministic engine; Claude adds the judgement and the voice. It even works offline.

---

## 2. The three-minute pitch (slide by slide)

| # | Slide | Time | What to say |
|---|---|---|---|
| 1 | **Destiny Engine** | 0:00 | "We built Destiny Engine. You tell it where your life is and where you want it to be; it turns that dream into a map you can walk. The stars behind me are the product's metaphor — every month of your plan is a star." |
| 2 | **The problem** | 0:15 | "Everyone has a dream; almost no one has a plan for this Tuesday. Three things fail: advice is generic, nobody notices when you drift, and one obstacle kills a static plan." *(click the three cards)* |
| 3 | **Insight** | 0:40 | "The gap isn't motivation — it's translation. From a dream in plain words, through your real constraints, to seven actions this week." |
| 4 | **Meet Aarav** | 1:00 | "Aarav is 32, in Delhi, two kids, a loan, 2.5 hours a day. He wants Goa. Destiny Engine says 96% feasible, 8 months, moving day in month 5." |
| 5 | **How it works** | 1:20 | "Four steps, under ten minutes: map your life, name your dream, see if it adds up, walk the roadmap." |
| 6 | **Feasibility** | 1:35 | "Honest before hopeful — six scored dimensions, each explained with your own rupees." |
| 7 | **Roadmap** | 1:50 | "Your plan is a constellation. Every action has a time estimate, a tool and a 'done when'." |
| 8 | **Coaching** | 2:05 | "A coach that knows it's week 6 — nudges, tips, warnings when you slip, celebrations at milestones." |
| 9 | **Adaptive planning** | 2:20 | "When life happens, the plan bends. 'I sent 25 pitches, one reply' → diagnosis, four new actions, timeline 7 → 8 months, one click." |
| 10 | **Use cases** | 2:35 | "Ten kinds of dreams, fifty templates — relocation to FIRE to a marathon." |
| 11 | **How the AI works** | 2:45 | "Numbers are computed, never invented. Claude personalises; we validate every field; any failure falls back instantly." |
| 12–14 | Stack · market · next | 2:55 | One sentence each — then **"Let me show you."** |
| 15 | **Live demo** | 3:00 | Switch to the browser (script below). |
| 16 | **Close** | — | "Your first star is one week away." Pause. Questions. |

---

## 3. Live demo script (≈4 minutes)

Start with the app open at `http://localhost:5173` in a separate Chrome window, dark theme, zoom 100%.

1. **Landing (20s)** — Let the 3D constellation float for a second, move the mouse for parallax.
   *"This is the journey metaphor in 3D. Let's open a real journey."* → click **Explore a live demo**.

2. **Today (40s)** — Point at the coach card.
   *"Aarav is in week 6. This message is generated from his live progress."*
   Tick **today's action** → the week bar and journey % move.

3. **Roadmap (40s)** — Click **Roadmap**.
   *"Seven months, four phases — the gold line is how far he's come."* Click a **future star** (e.g. the Transition month) → *"Every week, seven actions with time, tools and a definition of done."* Expand one action.
   Scroll to **Financial projection** and **Risks**.

4. **Progress (30s)** — Click **Progress** → in *Log income or savings*, enter `15000`, source `New client retainer` → **Log it**.
   *"The income chart against plan updates instantly."*

5. **Adaptive planning (60s) — the wow moment** — Click **Coach → Get help**.
   Pick **Not getting clients or leads**, type: `Sent 25 pitches in two weeks, only one reply`. → **Get advice**.
   *"Diagnosis, likely causes, fixes, and the timeline impact before I accept."* → **Apply to my roadmap** → **See the new plan**.
   *"Completed weeks are untouched; this week now has the course-correction actions, and the timeline moved from 7 to 8 months."*

6. **Celebration (20s)** — Go to **Today** → **Complete week N** → confetti.
   *"Small wins, celebrated. That's how dreams survive week three."*

**Optional (if time, 60s): a brand-new dream.** Sign out → **Start your journey** → answer a few questions (use **Skip** freely) → write a dream → show feasibility → **Generate my roadmap** (3D "charting" screen) → celebration.
With Claude enabled this takes 30–90 seconds per AI step, so pre-record it or narrate while it works.

### If something goes wrong

| Problem | What to do |
|---|---|
| No internet / Claude slow | Everything still works on the built-in engine. Set `AI_DISABLED=1` in `.env` and restart for guaranteed instant responses. |
| Demo data looks messy after rehearsal | `pnpm seed` resets the demo account (then click *Explore a live demo* again). |
| Port busy | `lsof -ti:4000 \| xargs kill` and `pnpm dev`. |
| 3D looks choppy on a projector | It's only on landing/sign-in/charting; the app pages are 2D. Present from the app pages. |

---

## 4. Pre-demo checklist

- [ ] `pnpm install && pnpm dev` (Node 24+). App at http://localhost:5173.
- [ ] `curl localhost:4000/api/health` → check `ai.provider`:
  - `api` — using `ANTHROPIC_API_KEY`
  - `agent-sdk` — no key; using your **local Claude Code login** (subscription) via the Claude Agent SDK
  - `engine` — no AI; built-in engine (fast, offline)
- [ ] `pnpm seed` to reset the demo account right before presenting.
- [ ] Rehearse **Get help → Apply** once, then `pnpm seed` again.
- [ ] Chrome: dark theme, 100% zoom, bookmarks bar hidden, notifications off.
- [ ] `demo/slides.html` open in another window, press `F`.

---

## 5. Use cases

| Archetype | Example dreams (from the 50 templates) |
|---|---|
| Relocate | Move to Goa and freelance · Live in the mountains · Move to another country · Back to my hometown |
| Go independent | Quit my 9–5 · Consulting practice · Freelance for global clients · Small design agency |
| Become a creator | Full-time YouTuber · Podcast · Paid newsletter · Online course · Write a book |
| Build a startup | Tech startup · SaaS on the side · AI product · Mobile app · Social enterprise |
| Financial freedom | FIRE · Debt-free · ₹50k/month passive income · First crore · Travel the world |
| Change careers | Into tech · Product manager · Data scientist · AI engineer · Leadership · Govt exam |
| Start a business | Café · D2C brand · Cloud kitchen · Homestay · Clothing label · Franchise |
| Study abroad | Master's with scholarship · Top MBA |
| Transform health | Marathon · Lose 15 kg · Everest Base Camp trek |
| Buy a home | Down payment to keys |

**Who pays (proposed):** individuals (freemium: free roadmap, paid AI coaching), **banks & fintechs** (every roadmap contains a monthly savings target → goal-based savings, SIPs, loans), **employers & edtech** (career-mobility roadmaps, wellbeing).

---

## 6. Why it's different

1. **Grounded, not generic** — feasibility, runway, timelines and projections are computed from the user's real numbers by a deterministic engine. The LLM never invents your money.
2. **It adapts** — obstacles become re-planned timelines in one click; completed weeks are preserved.
3. **A daily loop, not a document** — coaching, checklists, week completion and milestone celebrations.
4. **Can't break on stage** — three AI tiers: Claude API → Claude Agent SDK (local login) → built-in engine.
5. **Private by default** — SQLite on your own server; data export and account deletion built in.

---

## 7. How it's built

- **Client:** React 19, Vite 8, Tailwind 4, three.js / React Three Fiber (lazy-loaded, pauses off-screen), TanStack Query, Recharts.
- **Server:** Node 24, Express 5, built-in `node:sqlite` (no native deps), JWT auth, rate limits, Helmet. 25+ endpoints.
- **AI:** `server/src/ai/` — `engine.js` computes a grounded baseline; `index.js` asks Claude (`claude-opus-5-5`) for structured JSON and validates/merges it field by field; `claude.js` picks the provider:
  1. `ANTHROPIC_API_KEY` → Claude API (streaming, per-task effort, server-side refusal fallback)
  2. no key → **Claude Agent SDK** using the local Claude Code login (tool-less, single-turn, isolated from local settings)
  3. neither → built-in engine
  Any failure at any tier falls back to the engine result.

---

## 8. Judge Q&A prep

**"Isn't this just ChatGPT with a nice UI?"**
No. A chatbot gives you a one-off answer. We keep a structured plan in a database, track progress against it, coach from live data, and re-plan while keeping your history. The numbers come from a deterministic engine, so they're reproducible and auditable.

**"How do you stop hallucinated numbers?"**
The engine computes all financial figures and scores first. Claude receives them as grounding, returns JSON, and every field is type- and range-checked before merging. If a field is invalid, the engine's value stays.

**"What if the AI is down?"**
Three tiers: API key → local Claude Code login via the Agent SDK → built-in engine. The demo can't break.

**"Why the Agent SDK?"**
So any developer can run the full AI experience locally with their existing Claude Code login, without managing an API key. In production we'd use an API key — a deployed product shouldn't run on a personal subscription.

**"Privacy?"**
Data stays in our SQLite on our server. Only the profile and dream text go to Claude, and only when generating plans. Users can export or delete everything from Settings.

**"How is feasibility calculated?"**
Six weighted dimensions: financial (funding gap vs. monthly surplus, debt load), skills (experience, in-demand skills, learning speed), family (dependants × how disruptive the dream is, support), location/market (remote capability, metro), and timeline (hours per day, learning speed, motivation, funding months).

**"How would you make money?"**
Freemium for individuals; B2B2C through banks and fintechs, because every roadmap already contains a monthly savings target that maps to goal-based products; and employers for career mobility.

**"What's next?"**
Account Aggregator-based automatic income and savings tracking, WhatsApp coaching, Hindi and regional languages, and "dream circles" for people walking the same roadmap.

**"What was hardest?"**
Making the plan adapt without losing history: re-planning only from the current week, keeping completed weeks and action IDs stable so progress survives every change.
