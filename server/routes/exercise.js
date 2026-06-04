const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// MET-based rates for 80 kg body weight: (MET × 80 × 3.5) / 200
const CAL_PER_MIN = {
  walk_flat:       5,
  walk_incline:    8,
  run_5:           17,  // 5 min/km ≈ 12 km/h, MET 12
  run_6:           15,  // 6 min/km ≈ 10 km/h, MET 10.5
  run_7:           13,  // 7 min/km ≈ 8.6 km/h, MET 9
  tennis:          10,
  table_tennis:    6,
  swim:            10,
  resistance_hard: 8,
  resistance_easy: 6,
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

router.get('/week', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT d.date,
      COALESCE(SUM(e.duration_minutes), 0) as total_minutes,
      COALESCE(SUM(e.calories_burned),  0) as total_calories
    FROM days d
    LEFT JOIN exercise e ON e.day_id = d.id
    WHERE d.date >= to_char(CURRENT_DATE - INTERVAL '6 days', 'YYYY-MM-DD')
    GROUP BY d.id, d.date
    ORDER BY d.date ASC
  `);
  res.json(rows);
});

router.get('/:date', async (req, res) => {
  const { rows: dayRows } = await pool.query('SELECT * FROM days WHERE date = $1', [req.params.date]);
  if (dayRows.length === 0) return res.json([]);
  const { rows } = await pool.query(
    'SELECT * FROM exercise WHERE day_id = $1 ORDER BY created_at ASC',
    [dayRows[0].id]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { date, modality, pace, duration_minutes } = req.body;
  if (!date || !modality || !duration_minutes) {
    return res.status(400).json({ error: 'date, modality, and duration_minutes required' });
  }
  const { rows: dayRows } = await pool.query('SELECT * FROM days WHERE date = $1', [date]);
  if (dayRows.length === 0) return res.status(404).json({ error: 'Set up the day first before logging exercise.' });

  const calories_burned = calcBurn(modality, pace, duration_minutes);
  const { rows } = await pool.query(`
    INSERT INTO exercise (day_id, modality, pace, duration_minutes, calories_burned, created_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [dayRows[0].id, modality, pace ?? null, duration_minutes, calories_burned, new Date().toISOString()]);
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM exercise WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  await pool.query('DELETE FROM exercise WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
