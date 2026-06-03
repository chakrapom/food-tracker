# Jimmy Eats 🍲

A personal macro and calorie tracking app built for a Vietnamese lifestyle — Vietnamese food-aware, Asian portion sizing, and AI-powered meal coaching.

## Features

- **Meal logging** — 6 meal slots per day (Pre Workout → Supper) with a searchable food library
- **AI meal parser** — describe a meal in plain text and macros are auto-filled from the food library
- **AI coach** — personalised coaching suggestion with actionable next-meal recommendations
- **Exercise logging** — log by modality (walk, run, tennis, swim, resistance) with calorie burn estimates
- **Macro dashboard** — calories, protein, carbs, fat, fiber progress bars with calorie deficit presets
- **Weekly report** — 7-day summary grid with stat cards, exportable as PNG for sharing
- **Food library** — full list of preset Vietnamese foods + custom food manager with AI macro fill
- **Motivation** — tap the app name for a random motivational quote

## Stack

- **Client** — React 19 + Vite + Tailwind CSS v4
- **Server** — Node.js + Express + better-sqlite3
- **AI** — Anthropic Claude Haiku (meal parsing, coaching, macro lookup)

## Getting Started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
# Clone the repo
git clone https://github.com/chakrapom/food-tracker.git
cd food-tracker

# Install all dependencies
npm install
cd client && npm install
cd ../server && npm install
cd ..

# Add your Anthropic API key
echo "ANTHROPIC_API_KEY=your_key_here" > .env

# Start everything
npm run dev
```

The app runs on `http://localhost:3000`. On a local network, access it from other devices at `http://Trinhs-MacBook-Pro.local:3000`.

## Macro Targets

| | Training | Rest |
|---|---|---|
| Protein | 150g | 150g |
| Carbs | ≤ 40g | ≤ 20g |
| Fat | 30g | 30g |
| Fiber | 30g | 30g |

Calorie caps cycle between three deficit levels (aggressive / moderate / light) via the 🎯 chip in the dashboard.

## Notes

- Portion sizes are adjusted for Vietnamese servings (0.8× multiplier on cup-measured US database values)
- The food library is pre-seeded with Vietnamese staples (phở, bún, cơm tấm, rau muống, etc.)
- SQLite database lives at `server/meals.db` — not committed to the repo
