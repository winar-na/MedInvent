import pool from '../config/db.config.js';

export const getBlood = async (req, res) => {
  try {
    const { filter } = req.query;
    let sql = `SELECT *, (expiry_date - CURRENT_DATE) as days_remaining FROM blood_units WHERE user_id = $1`;
    const params = [req.user.id];
    if (filter === '10days') sql += ` AND status='Available' AND expiry_date <= CURRENT_DATE + INTERVAL '10 days'`;
    sql += ` ORDER BY expiry_date ASC`;
    const result = await pool.query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const createBlood = async (req, res) => {
  try {
    const { component, blood_group, unit_number, collected_date, expiry_date, quantity } = req.body;
    if (!/^[0-9]{9}$/.test(unit_number)) {
      return res.status(400).json({ error: 'Unit number must be exactly 9 digits' });
    }
    const result = await pool.query(
      `INSERT INTO blood_units (component, blood_group, unit_number, collected_date, expiry_date, quantity, user_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [component, blood_group, unit_number, collected_date, expiry_date, quantity || 1, req.user.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Unit number exists' });
    res.status(500).json({ error: e.message });
  }
};

export const updateBloodStatus = async (req, res) => {
  const { status } = req.body;
  const result = await pool.query(`UPDATE blood_units SET status=$1 WHERE id=$2 AND user_id=$3 RETURNING *`, [status, req.params.id, req.user.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, data: result.rows[0] });
};

export const deleteBlood = async (req, res) => {
  // Only owner can delete - checked in routes via requireOwner
  await pool.query(`DELETE FROM blood_units WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
  res.json({ success: true });
};