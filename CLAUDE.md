# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Run everything (recommended for dev):**
```sh
npm run dev          # starts both server and client concurrently
```

**Run individually:**
```sh
cd server && npm run dev   # Express server on :3001, with nodemon
cd client && npm run dev   # Vite + React on :3000
```

**Lint client:**
```sh
cd client && npm run lint
```

There are no automated tests.

## Architecture

Personal macro + calorie tracking app ("Jimmy Eats") with a client/server split.

### Server (`server/`) — CommonJS Express app

- **`index.js`** — entry point; loads `.env` from repo root, mounts five route modules, listens on port 3001
- **`db.js`** — initialises `better-sqlite3` at `server/meals.db`, seeds preset foods (Vietnamese food-focused), exports the `db` singleton
- **`routes/meals.js`** — CRUD for days and meal entries; route order matters (`/day/:date`, `/totals/:date`, `/history/week`, `/entry/:id` must appear before `/:date`); also has `PATCH /entry/:id` to move a meal entry to a different slot
- **`routes/foods.js`** — list all foods (presets + custom), add/delete custom foods
- **`routes/exercise.js`** — CRUD for exercise entries + `GET /week` summary; `CAL_PER_MIN` table drives burn estimates per modality/sub-option; `calcBurn()` resolves the composite key (e.g. `walk` + incline → `walk_incline`)
- **`routes/suggest.js`** — two Claude API calls: `POST /` returns a meal coaching suggestion (receives full meal list, formats eaten meals into prompt); `POST /parse` parses free-text food into macro objects; `MEAL_NAMES` const is module-level
- **`routes/summaries.js`** — computes weekly stats via correlated subqueries for exercise, persists to `summaries` table, returns averages/hit-rates/trends + per-day exercise minutes

### Client (`client/`) — React 19 + Vite + Tailwind CSS v4

Vite proxies all `/api/*` requests to `http://localhost:3001`. The client runs on port 3000.

**State lives entirely in `App.jsx`** — `date`, `day`, `meals`, `totals`, `foods`, `history`, `exercises`, `caloriePreset`, `showAI` — and is passed down as props. `fetchAll` re-fetches everything (including exercise) when the viewed date changes.

**Calorie preset** — three deficit targets stored in `localStorage` key `caloriePreset` (`moderate`/`light`/`aggressive`); cycled via the 🎯 chip in MacroDashboard.

Components:
- **`DaySetup`** — shown on first visit to today; lets user pick Training vs Rest day
- **`MacroDashboard`** — Calories bar (food vs cap, with exercise burn as sublabel info) + macro progress bars; accepts `exerciseBurn` and `caloriePreset` props; calorie bar is `lowerIsBetter`
- **`MealLogger`** — 6 collapsible slots named Pre Workout / Breakfast / Lunch / Snack / Dinner / Supper; entries show kcal and have a "Move →" dropdown to reassign to another slot; supports preset picker and AI free-text mode
- **`ExerciseLogger`** — log exercise by modality (Walk flat/incline, Run at pace 5/6/7 km/h, Tennis, Table Tennis, Swim, Resistance hard/easy RPE); duration in minutes; burn computed server-side
- **`AISuggestion`** — floating 👨‍🍳 button (fixed bottom-right); clicking opens a modal that auto-fetches a suggestion immediately; receives full `meals` list so the coach knows what was already eaten; small "↻ Refresh" to re-fetch
- **`StreakSummary`** — compact inline component showing 🔥N streak chip + row of clickable day dots
- **`WeeklyReport`** — expandable 7-day grid (Cal, macros, exercise rows); stat cards show `x/7 days`; Calories and Carbs labelled "below threshold"; clipboard export with download fallback
- **`CustomFoodForm`** — modal overlay for adding custom foods

### Database schema

Five tables in `server/meals.db`:
- `days` — one row per calendar date, stores `day_type` ('training' | 'rest')
- `meals` — individual food entries linked to `day_id`; stores macros and `meal_number` (1–6)
- `foods` — food library; `is_custom = 0` for presets, `1` for user-added
- `summaries` — upserted by `/api/summaries/week`
- `exercise` — exercise entries linked to `day_id`; stores `modality`, `pace` (sub-option: run pace / walk incline / resistance RPE), `duration_minutes`, `calories_burned`

### Macro targets & calorie caps

Macro targets are hardcoded in **three places** — keep in sync when changing:
1. `server/routes/suggest.js` — `TARGETS` const
2. `server/routes/summaries.js` — `TARGETS` const
3. `client/src/components/MacroDashboard.jsx` — `MACRO_TARGETS` const

Calorie caps (separate from macros) live in:
- `client/src/components/MacroDashboard.jsx` — `CAL_PRESETS`
- `client/src/components/AISuggestion.jsx` — `PRESETS`
- `client/src/components/WeeklyReport.jsx` — `CAL_PRESETS`

Targets: Training — protein 150g, carbs ≤40g, fat 30g, fiber 30g (max 45g). Rest — same except carbs ≤20g.

### Exercise calorie burn rates (`server/routes/exercise.js`)

| Key | cal/min |
|---|---|
| walk_flat | 4 |
| walk_incline | 6 |
| run_5 | 8 |
| run_6 | 10 |
| run_7 | 12 |
| tennis | 7 |
| table_tennis | 4 |
| swim | 8 |
| resistance_easy | 5 |
| resistance_hard | 8 |

### Environment

`ANTHROPIC_API_KEY` in `.env` at the repo root (loaded by `server/index.js`). AI routes use `claude-haiku-4-5-20251001`.
