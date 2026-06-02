const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all foods
router.get('/', (req, res) => {
  const foods = db.prepare('SELECT * FROM foods ORDER BY is_custom ASC, name ASC').all();
  res.json(foods);
});

// POST add custom food
router.post('/', (req, res) => {
  const { name, serving_label, protein, carbs, fat, fiber } = req.body;
  if (!name || protein == null || carbs == null || fat == null || fiber == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const stmt = db.prepare(`
    INSERT INTO foods (name, serving_label, protein, carbs, fat, fiber, is_custom)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);
  const result = stmt.run(name, serving_label || '1 serving', protein, carbs, fat, fiber);
  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(result.lastInsertRowid);
  res.json(food);
});

// DELETE custom food
router.delete('/:id', (req, res) => {
  const food = db.prepare('SELECT * FROM foods WHERE id = ? AND is_custom = 1').get(req.params.id);
  if (!food) return res.status(404).json({ error: 'Not found or not a custom food' });
  db.prepare('DELETE FROM foods WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
