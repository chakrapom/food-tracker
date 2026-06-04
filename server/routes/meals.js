const express = require('express');
const router = express.Router();
const { pool } = require('../db');

async function getOrCreateDay(date, day_type) {
  let { rows } = await pool.query('SELECT * FROM days WHERE date = $1', [date]);
  if (rows.length === 0) {
    await pool.query(
      'INSERT INTO days (date, day_type, created_at) VALUES ($1, $2, $3)',
      [date, day_type || 'training', new Date().toISOString()]
    );
    ({ rows } = await pool.query('SELECT * FROM days WHERE date = $1', [date]));
  }
  return rows[0];
}

// GET day info for a date
router.get('/day/:date', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM days WHERE date = $1', [req.params.date]);
  res.json(rows[0] || null);
});

// POST set or update day type
router.post('/day', async (req, res) => {
  const { date, day_type } = req.body;
  if (!date || !day_type) return res.status(400).json({ error: 'date and day_type required' });

  let { rows } = await pool.query('SELECT * FROM days WHERE date = $1', [date]);
  if (rows.length > 0) {
    await pool.query('UPDATE days SET day_type = $1 WHERE date = $2', [day_type, date]);
  } else {
    await pool.query(
      'INSERT INTO days (date, day_type, created_at) VALUES ($1, $2, $3)',
      [date, day_type, new Date().toISOString()]
    );
  }
  ({ rows } = await pool.query('SELECT * FROM days WHERE date = $1', [date]));
  res.json(rows[0]);
});

// PATCH move meal entry to a different slot — must be before /:date
router.patch('/entry/:id', async (req, res) => {
  const { meal_number } = req.body;
  if (!meal_number || meal_number < 1 || meal_number > 6) {
    return res.status(400).json({ error: 'meal_number must be 1–6' });
  }
  let { rows } = await pool.query('SELECT * FROM meals WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  await pool.query('UPDATE meals SET meal_number = $1 WHERE id = $2', [meal_number, req.params.id]);
  ({ rows } = await pool.query('SELECT * FROM meals WHERE id = $1', [req.params.id]));
  res.json(rows[0]);
});

// DELETE meal entry — must be before /:date
router.delete('/entry/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM meals WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  await pool.query('DELETE FROM meals WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// GET daily totals — must be before /:date
router.get('/totals/:date', async (req, res) => {
  const { rows: dayRows } = await pool.query('SELECT * FROM days WHERE date = $1', [req.params.date]);
  if (dayRows.length === 0) return res.json({ protein: 0, carbs: 0, fat: 0, fiber: 0 });

  const { rows } = await pool.query(`
    SELECT
      COALESCE(SUM(protein), 0) as protein,
      COALESCE(SUM(carbs), 0) as carbs,
      COALESCE(SUM(fat), 0) as fat,
      COALESCE(SUM(fiber), 0) as fiber
    FROM meals WHERE day_id = $1
  `, [dayRows[0].id]);
  res.json(rows[0]);
});

// GET last 7 days summaries — must be before /:date
router.get('/history/week', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT d.date, d.day_type,
      COALESCE(SUM(m.protein), 0) as protein_total,
      COALESCE(SUM(m.carbs), 0) as carbs_total,
      COALESCE(SUM(m.fat), 0) as fat_total,
      COALESCE(SUM(m.fiber), 0) as fiber_total
    FROM days d
    LEFT JOIN meals m ON m.day_id = d.id
    WHERE d.date >= to_char(CURRENT_DATE - INTERVAL '6 days', 'YYYY-MM-DD')
    GROUP BY d.id, d.date, d.day_type
    ORDER BY d.date DESC
  `);
  res.json(rows);
});

// POST add meal entry
router.post('/', async (req, res) => {
  const { date, day_type, meal_number, food_name, protein, carbs, fat, fiber, serving_note } = req.body;
  if (!date || !meal_number || !food_name) {
    return res.status(400).json({ error: 'date, meal_number, and food_name required' });
  }

  const day = await getOrCreateDay(date, day_type);
  const { rows } = await pool.query(`
    INSERT INTO meals (day_id, meal_number, food_name, protein, carbs, fat, fiber, serving_note, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    day.id, meal_number, food_name,
    protein || 0, carbs || 0, fat || 0, fiber || 0,
    serving_note || '',
    new Date().toISOString(),
  ]);
  res.json(rows[0]);
});

// GET meals for a date — generic, must be last
router.get('/:date', async (req, res) => {
  const { rows: dayRows } = await pool.query('SELECT * FROM days WHERE date = $1', [req.params.date]);
  if (dayRows.length === 0) return res.json([]);
  const { rows } = await pool.query(
    'SELECT * FROM meals WHERE day_id = $1 ORDER BY meal_number ASC, created_at ASC',
    [dayRows[0].id]
  );
  res.json(rows);
});

module.exports = router;
