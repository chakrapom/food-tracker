const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');

const client = new Anthropic();

const TARGETS = {
  training: { protein: 150, carbs: 40, fat: 30, fiber: 30 },
  rest:     { protein: 150, carbs: 20, fat: 30, fiber: 30 },
};

const MEAL_NAMES = ['Pre Workout', 'Breakfast', 'Lunch', 'Snack', 'Dinner', 'Supper'];

function formatMealsEaten(meals) {
  if (!meals || meals.length === 0) return 'Nothing logged yet.';
  const grouped = {};
  for (const m of meals) {
    if (!grouped[m.meal_number]) grouped[m.meal_number] = [];
    grouped[m.meal_number].push(m.food_name);
  }
  return Object.entries(grouped)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([num, foods]) => `  ${MEAL_NAMES[num - 1] || `Meal ${num}`}: ${foods.join(', ')}`)
    .join('\n');
}

// POST /api/suggest
router.post('/', async (req, res) => {
  const { date, day_type, totals, meals_logged, meals = [], exercise_burn = 0, calorie_target } = req.body;

  const targets = TARGETS[day_type] || TARGETS.training;
  const remaining = {
    protein: Math.max(0, targets.protein - (totals.protein || 0)),
    carbs:   Math.max(0, targets.carbs   - (totals.carbs   || 0)),
    fat:     Math.max(0, targets.fat     - (totals.fat     || 0)),
    fiber:   Math.max(0, targets.fiber   - (totals.fiber   || 0)),
  };

  const foodCal = (totals.protein || 0) * 4 + (totals.carbs || 0) * 4 + (totals.fat || 0) * 9;
  const netCal  = Math.round(foodCal - exercise_burn);
  const calTarget = calorie_target || 1800;
  const remainingCal = Math.max(0, calTarget - netCal);

  const foods = db.prepare('SELECT name, serving_label, protein, carbs, fat, fiber FROM foods ORDER BY name').all();
  const foodList = foods.map(f =>
    `- ${f.name} (${f.serving_label}): ${f.protein}g protein, ${f.carbs}g carbs, ${f.fat}g fat, ${f.fiber}g fiber`
  ).join('\n');

  const mealsLogged = meals_logged || 0;
  const remainingMeals = Math.max(0, 6 - mealsLogged);
  const remainingMealNames = MEAL_NAMES.slice(mealsLogged).join(', ');

  const systemPrompt = `You are a PT nutrition coach for a Vietnamese guy tracking his macros carefully for a calorie-deficit cut.

Daily targets (${day_type} day): protein ${targets.protein}g, carbs ${targets.carbs}g, fat ${targets.fat}g, fiber ${targets.fiber}g (max 45g), calories ${calTarget} kcal net.

So far today — food: ${Math.round(foodCal)} kcal | active burn: ${Math.round(exercise_burn)} kcal | net: ${netCal} kcal (target ${calTarget} kcal).
Macros consumed: protein ${totals.protein?.toFixed(1) || 0}g, carbs ${totals.carbs?.toFixed(1) || 0}g, fat ${totals.fat?.toFixed(1) || 0}g, fiber ${totals.fiber?.toFixed(1) || 0}g.

Still needs: protein ${remaining.protein.toFixed(1)}g, carbs ${remaining.carbs.toFixed(1)}g, fat ${remaining.fat.toFixed(1)}g, fiber ${remaining.fiber.toFixed(1)}g, ~${remainingCal} kcal of food.

What has been eaten today:
${formatMealsEaten(meals)}

Remaining meal slots: ${remainingMeals} (${remainingMealNames || 'none left'}).

Available foods:
${foodList}

Reply in exactly this format — no deviation:

[1-2 sentences: overall status and what matters most right now]

Next 2 meals:
• [meal name]: [specific food] + [specific food] — [one-line reason tied to the macro gap]
• [meal name]: [specific food] + [specific food] — [one-line reason tied to the macro gap]

Rules: only suggest foods from the available list above. Be concrete — name the food, not the nutrient. No waffle, no encouragement filler. If macros are already on track, say so in one line and skip the meal bullets.`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'What should I eat for my remaining meals?' }],
    });

    res.json({
      suggestion: message.content[0].text,
      remaining,
      targets,
    });
  } catch (err) {
    console.error('Claude API error:', err.message);
    res.status(500).json({ error: 'Failed to get suggestion', details: err.message });
  }
});

// POST /api/suggest/parse — free-text food parsing
router.post('/parse', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  const foods = db.prepare('SELECT name, serving_label, protein, carbs, fat, fiber FROM foods ORDER BY name').all();
  const foodList = foods.map(f =>
    `- ${f.name} (${f.serving_label}): protein ${f.protein}g, carbs ${f.carbs}g, fat ${f.fat}g, fiber ${f.fiber}g`
  ).join('\n');

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `You are a nutrition parser. Given a food description, return a JSON array of food items.

Food database — when the food matches an entry below, use those exact macro values scaled by the quantity:
${foodList}

Scaling rule: determine the quantity ratio (e.g. "1/3 cup" vs "1 cup cooked" → ratio 0.333), then multiply all macros by that ratio.
If no database match, use standard nutritional values.

Each item: { "food_name": string, "protein": number, "carbs": number, "fat": number, "fiber": number, "serving_note": string }
Return ONLY valid JSON array, no explanation, no markdown.`,
      messages: [{ role: 'user', content: text }],
    });

    const raw = message.content[0].text.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    const parsed = JSON.parse(raw);
    res.json(Array.isArray(parsed) ? parsed : [parsed]);
  } catch (err) {
    console.error('Parse error:', err.message);
    res.status(500).json({ error: 'Failed to parse food text', details: err.message });
  }
});

module.exports = router;
