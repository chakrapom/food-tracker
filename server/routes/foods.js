const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET all foods
router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM foods ORDER BY is_custom ASC, name ASC');
  res.json(rows);
});

// POST add custom food
router.post('/', async (req, res) => {
  const { name, serving_label, protein, carbs, fat, fiber } = req.body;
  if (!name || protein == null || carbs == null || fat == null || fiber == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const { rows } = await pool.query(`
    INSERT INTO foods (name, serving_label, protein, carbs, fat, fiber, is_custom)
    VALUES ($1, $2, $3, $4, $5, $6, 1)
    RETURNING *
  `, [name, serving_label || '1 serving', protein, carbs, fat, fiber]);
  res.json(rows[0]);
});

// DELETE custom food
router.delete('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM foods WHERE id = $1 AND is_custom = 1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found or not a custom food' });
  await pool.query('DELETE FROM foods WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
