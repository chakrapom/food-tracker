const express = require('express');
const router = express.Router();
const { pool } = require('../db');

const TARGETS = {
  training: { protein: 150, carbs: 40, fat: 30, fiber: 30 },
  rest:     { protein: 150, carbs: 20, fat: 30, fiber: 30 },
};

// GET /api/summaries/week — last 7 days with full macro breakdown
router.get('/week', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT d.date, d.day_type,
      COALESCE(SUM(m.protein), 0) as protein,
      COALESCE(SUM(m.carbs),   0) as carbs,
      COALESCE(SUM(m.fat),     0) as fat,
      COALESCE(SUM(m.fiber),   0) as fiber,
      (SELECT COALESCE(SUM(e.duration_minutes), 0) FROM exercise e WHERE e.day_id = d.id) as exercise_minutes,
      (SELECT COALESCE(SUM(e.calories_burned),  0) FROM exercise e WHERE e.day_id = d.id) as exercise_calories
    FROM days d
    LEFT JOIN meals m ON m.day_id = d.id
    WHERE d.date >= to_char(CURRENT_DATE - INTERVAL '6 days', 'YYYY-MM-DD')
    GROUP BY d.id, d.date, d.day_type
    ORDER BY d.date ASC
  `);

  if (rows.length === 0) return res.json({ days: [], averages: null, best: null, worst: null, trends: null });

  const days = rows.map(r => {
    const t = TARGETS[r.day_type] || TARGETS.training;
    return {
      date: r.date,
      day_type: r.day_type,
      protein: Number(r.protein),
      carbs:   Number(r.carbs),
      fat:     Number(r.fat),
      fiber:   Number(r.fiber),
      exercise_minutes:  Number(r.exercise_minutes),
      exercise_calories: Number(r.exercise_calories),
      targets: t,
      hit: {
        protein: Number(r.protein) >= t.protein,
        carbs:   Number(r.carbs)   <= t.carbs * 1.1,
        fat:     Number(r.fat)     >= t.fat * 0.8,
        fiber:   Number(r.fiber)   >= t.fiber * 0.8,
      },
    };
  });

  const n = days.length;
  const averages = {
    protein: days.reduce((s, d) => s + d.protein, 0) / n,
    carbs:   days.reduce((s, d) => s + d.carbs,   0) / n,
    fat:     days.reduce((s, d) => s + d.fat,     0) / n,
    fiber:   days.reduce((s, d) => s + d.fiber,   0) / n,
  };

  const hitRates = {
    protein: days.filter(d => d.hit.protein).length / n,
    carbs:   days.filter(d => d.hit.carbs).length   / n,
    fat:     days.filter(d => d.hit.fat).length     / n,
    fiber:   days.filter(d => d.hit.fiber).length   / n,
  };

  const best  = days.reduce((a, b) => b.protein > a.protein ? b : a);
  const worst = days.reduce((a, b) => b.protein < a.protein ? b : a);

  const half = Math.floor(n / 2);
  const trends = n >= 4 ? {
    protein: averages.protein - (days.slice(0, half).reduce((s, d) => s + d.protein, 0) / half),
    carbs:   averages.carbs   - (days.slice(0, half).reduce((s, d) => s + d.carbs,   0) / half),
    fat:     averages.fat     - (days.slice(0, half).reduce((s, d) => s + d.fat,     0) / half),
    fiber:   averages.fiber   - (days.slice(0, half).reduce((s, d) => s + d.fiber,   0) / half),
  } : null;

  // Persist summaries in a transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const d of days) {
      const hits = Object.values(d.hit).filter(Boolean).length;
      const verdict = hits === 4 ? 'Perfect day' :
                      hits === 3 ? 'Good day' :
                      hits === 2 ? 'Average day' : 'Needs work';
      await client.query(`
        INSERT INTO summaries (day_id, protein_total, carbs_total, fat_total, fiber_total, protein_hit, verdict)
        VALUES ((SELECT id FROM days WHERE date = $1), $2, $3, $4, $5, $6, $7)
        ON CONFLICT (day_id) DO UPDATE SET
          protein_total = excluded.protein_total,
          carbs_total   = excluded.carbs_total,
          fat_total     = excluded.fat_total,
          fiber_total   = excluded.fiber_total,
          protein_hit   = excluded.protein_hit,
          verdict       = excluded.verdict
      `, [d.date, d.protein, d.carbs, d.fat, d.fiber, d.hit.protein ? 1 : 0, verdict]);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  res.json({ days, averages, hitRates, best, worst, trends });
});

module.exports = router;
