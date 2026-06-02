const express = require('express');
const router = express.Router();
const db = require('../db');

function getOrCreateDay(date, day_type) {
  let day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
  if (!day) {
    db.prepare('INSERT INTO days (date, day_type, created_at) VALUES (?, ?, ?)')
      .run(date, day_type || 'training', new Date().toISOString());
    day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
  }
  return day;
}

// GET day info for a date
router.get('/day/:date', (req, res) => {
  const day = db.prepare('SELECT * FROM days WHERE date = ?').get(req.params.date);
  res.json(day || null);
});

// POST set or update day type
router.post('/day', (req, res) => {
  const { date, day_type } = req.body;
  if (!date || !day_type) return res.status(400).json({ error: 'date and day_type required' });

  let day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
  if (day) {
    db.prepare('UPDATE days SET day_type = ? WHERE date = ?').run(day_type, date);
    day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
  } else {
    db.prepare('INSERT INTO days (date, day_type, created_at) VALUES (?, ?, ?)')
      .run(date, day_type, new Date().toISOString());
    day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
  }
  res.json(day);
});

// DELETE meal entry — must be before /:date
router.delete('/entry/:id', (req, res) => {
  const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(req.params.id);
  if (!meal) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM meals WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// GET daily totals — must be before /:date
router.get('/totals/:date', (req, res) => {
  const day = db.prepare('SELECT * FROM days WHERE date = ?').get(req.params.date);
  if (!day) return res.json({ protein: 0, carbs: 0, fat: 0, fiber: 0 });

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(protein), 0) as protein,
      COALESCE(SUM(carbs), 0) as carbs,
      COALESCE(SUM(fat), 0) as fat,
      COALESCE(SUM(fiber), 0) as fiber
    FROM meals WHERE day_id = ?
  `).get(day.id);
  res.json(totals);
});

// GET last 7 days summaries — must be before /:date
router.get('/history/week', (req, res) => {
  const rows = db.prepare(`
    SELECT d.date, d.day_type,
      COALESCE(SUM(m.protein), 0) as protein_total,
      COALESCE(SUM(m.carbs), 0) as carbs_total,
      COALESCE(SUM(m.fat), 0) as fat_total,
      COALESCE(SUM(m.fiber), 0) as fiber_total
    FROM days d
    LEFT JOIN meals m ON m.day_id = d.id
    WHERE d.date >= date('now', '-6 days')
    GROUP BY d.id
    ORDER BY d.date DESC
  `).all();
  res.json(rows);
});

// POST add meal entry
router.post('/', (req, res) => {
  const { date, day_type, meal_number, food_name, protein, carbs, fat, fiber, serving_note } = req.body;
  if (!date || !meal_number || !food_name) {
    return res.status(400).json({ error: 'date, meal_number, and food_name required' });
  }

  const day = getOrCreateDay(date, day_type);
  const result = db.prepare(`
    INSERT INTO meals (day_id, meal_number, food_name, protein, carbs, fat, fiber, serving_note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    day.id, meal_number, food_name,
    protein || 0, carbs || 0, fat || 0, fiber || 0,
    serving_note || '',
    new Date().toISOString()
  );
  const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(result.lastInsertRowid);
  res.json(meal);
});

// GET meals for a date — generic, must be last
router.get('/:date', (req, res) => {
  const day = db.prepare('SELECT * FROM days WHERE date = ?').get(req.params.date);
  if (!day) return res.json([]);
  const meals = db.prepare('SELECT * FROM meals WHERE day_id = ? ORDER BY meal_number ASC, created_at ASC').all(day.id);
  res.json(meals);
});

module.exports = router;
