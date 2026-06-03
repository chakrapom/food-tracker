const express = require('express');
const router = express.Router();
const db = require('../db');

const CAL_PER_MIN = {
  walk_flat:       4,
  walk_incline:    6,
  run_5:           8,
  run_6:           10,
  run_7:           12,
  tennis:          7,
  table_tennis:    4,
  swim:            8,
  resistance_hard: 8,
  resistance_easy: 5,
};

function calcBurn(modality, pace, duration) {
  let key;
  if (modality === 'run') {
    key = `run_${pace}`;
  } else if (modality === 'walk') {
    key = pace ? 'walk_incline' : 'walk_flat';
  } else if (modality === 'resistance') {
    key = pace >= 8 ? 'resistance_hard' : 'resistance_easy';
  } else {
    key = modality;
  }
  return Math.round((CAL_PER_MIN[key] || 5) * duration);
}

router.get('/week', (req, res) => {
  const rows = db.prepare(`
    SELECT d.date,
      COALESCE(SUM(e.duration_minutes), 0) as total_minutes,
      COALESCE(SUM(e.calories_burned),  0) as total_calories
    FROM days d
    LEFT JOIN exercise e ON e.day_id = d.id
    WHERE d.date >= date('now', '-6 days')
    GROUP BY d.id
    ORDER BY d.date ASC
  `).all();
  res.json(rows);
});

router.get('/:date', (req, res) => {
  const day = db.prepare('SELECT * FROM days WHERE date = ?').get(req.params.date);
  if (!day) return res.json([]);
  res.json(db.prepare('SELECT * FROM exercise WHERE day_id = ? ORDER BY created_at ASC').all(day.id));
});

router.post('/', (req, res) => {
  const { date, modality, pace, duration_minutes } = req.body;
  if (!date || !modality || !duration_minutes) {
    return res.status(400).json({ error: 'date, modality, and duration_minutes required' });
  }
  const day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
  if (!day) return res.status(404).json({ error: 'Set up the day first before logging exercise.' });

  const calories_burned = calcBurn(modality, pace, duration_minutes);
  const result = db.prepare(`
    INSERT INTO exercise (day_id, modality, pace, duration_minutes, calories_burned, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(day.id, modality, pace ?? null, duration_minutes, calories_burned, new Date().toISOString());

  res.json(db.prepare('SELECT * FROM exercise WHERE id = ?').get(result.lastInsertRowid));
});

router.delete('/:id', (req, res) => {
  const ex = db.prepare('SELECT * FROM exercise WHERE id = ?').get(req.params.id);
  if (!ex) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM exercise WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
