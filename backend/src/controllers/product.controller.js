import pool from '../config/db.config.js';

export const getAllProducts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, brand, unit, category, department, min_reorder_level } = req.body;
    if (!name || !unit) {
      return res.status(400).json({ success: false, error: 'name and unit required' });
    }
    const result = await pool.query(
      `INSERT INTO products (name, brand, unit, category, department, min_reorder_level, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, brand || null, unit, category || 'Drugs', department || 'Pharmacy', min_reorder_level || 10, req.user.id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};