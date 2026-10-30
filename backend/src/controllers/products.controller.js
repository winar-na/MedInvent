import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export const getAllProducts = async (req, res) => {
  try {
    const products = await sql`SELECT * FROM products ORDER BY created_at DESC`;
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, brand, unit, min_reorder_level } = req.body;
    if (!name || !unit) {
      return res.status(400).json({ error: 'name and unit required' });
    }
    const result = await sql`
      INSERT INTO products (name, brand, unit, min_reorder_level)
      VALUES (${name}, ${brand || null}, ${unit}, ${min_reorder_level || 10})
      RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};