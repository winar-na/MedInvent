import pool from '../config/db.config.js';

const queryWithRetry = async (text, params = []) => {
  let retries = 3;
  let delay = 1000;
  while (retries > 0) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      const msg = err.message || '';
      const isNetworkError = msg.includes('terminated') || msg.includes('timeout') || msg.includes('Connection') || msg.includes('fetch failed');
      if (!isNetworkError) throw err;
      retries--;
      if (retries === 0) throw err;
      await new Promise(r => setTimeout(r, delay));
    }
  }
};

// Only owner/admin can delete or edit prices
export const requireOwner = (req, res, next) => {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({ success: false, message: 'Only owner/admin can do this' });
  }
  next();
};

export const getCurrentStock = async (req, res) => {
  try {
    const queryText = `
      SELECT p.id AS product_id, p.name AS product_name, p.brand, p.unit, p.category, p.department, p.min_reorder_level,
        sb.id AS batch_id, sb.batch_number, sb.supplier, sb.quantity_received, sb.quantity_available,
        sb.purchase_price, sb.selling_price,
        (sb.selling_price - sb.purchase_price) AS profit_per_unit,
        (sb.selling_price - sb.purchase_price) * sb.quantity_available AS potential_profit,
        sb.expiry_date, sb.date_received,
        (sb.expiry_date - CURRENT_DATE) AS days_remaining,
        CASE WHEN sb.expiry_date < CURRENT_DATE THEN 'EXPIRED'
             WHEN sb.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'SOON EXPIRING'
             ELSE 'ACTIVE' END AS health_status
      FROM stock_batches sb
      JOIN products p ON sb.product_id = p.id
      WHERE sb.user_id = $1
      ORDER BY sb.expiry_date ASC;
    `;
    const databaseResult = await queryWithRetry(queryText, [req.user.id]);
    const rows = databaseResult.rows;
    const summary = {
      totalBatches: rows.length,
      stockValue: rows.reduce((acc, i) => acc + (Number(i.selling_price) * Number(i.quantity_available)), 0),
      capitalTied: rows.reduce((acc, i) => acc + (Number(i.purchase_price) * Number(i.quantity_available)), 0),
      potentialProfit: rows.reduce((acc, i) => acc + (Number(i.profit_per_unit) * Number(i.quantity_available)), 0),
    };
    summary.margin = summary.capitalTied > 0 ? ((summary.potentialProfit / summary.capitalTied) * 100).toFixed(1) : 0;
    res.status(200).json({ success: true, count: rows.length, data: rows, summary, offline: false });
  } catch (error) {
    console.error('getCurrentStock:', error.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve live inventory.' });
  }
};

export const getExpiryStatus = async (req, res) => {
  try {
    const result = await queryWithRetry(
      `SELECT sb.id AS batch_id, p.name AS product_name, p.category, sb.batch_number, sb.quantity_available, sb.expiry_date,
        sb.expiry_date - CURRENT_DATE AS days_remaining,
        CASE WHEN sb.expiry_date <= CURRENT_DATE THEN 'EXPIRED'
             WHEN sb.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'SOON EXPIRING'
             ELSE 'ACTIVE' END AS health_status
       FROM stock_batches sb JOIN products p ON sb.product_id = p.id
       WHERE sb.quantity_available > 0 AND sb.user_id = $1
       ORDER BY sb.expiry_date ASC`,
      [req.user.id]
    );
    res.status(200).json({ success: true, count: result.rows.length, data: result.rows, offline: false });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed expiry check.' });
  }
};

export const getReorderAlerts = async (req, res) => {
  try {
    const result = await queryWithRetry(
      `SELECT p.id, p.name AS product_name, p.brand, p.unit, p.category, p.min_reorder_level,
        COALESCE(SUM(sb.quantity_available), 0) AS total_stock_available
       FROM products p LEFT JOIN stock_batches sb ON p.id = sb.product_id AND sb.user_id = $1
       WHERE p.user_id = $1
       GROUP BY p.id
       HAVING COALESCE(SUM(sb.quantity_available), 0) <= p.min_reorder_level
       ORDER BY total_stock_available ASC`,
      [req.user.id]
    );
    res.status(200).json({ success: true, count: result.rows.length, data: result.rows, offline: false });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Reorder check failed.' });
  }
};

export const recordStockReceived = async (req, res) => {
  const { product_id, batch_number, supplier, quantity_received, quantity_available, purchase_price, selling_price, expiry_date, date_received } = req.body;
  if (!product_id || !batch_number || !quantity_received || !purchase_price || !selling_price || !expiry_date) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }
  try {
    const insertQueryText = `INSERT INTO stock_batches (product_id, batch_number, supplier, quantity_received, quantity_available, purchase_price, selling_price, expiry_date, date_received, user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *;`;
    const values = [product_id, batch_number, supplier, quantity_received, quantity_available || quantity_received, purchase_price, selling_price, expiry_date, date_received || new Date(), req.user.id];
    const result = await queryWithRetry(insertQueryText, values);
    res.status(201).json({ success: true, message: 'New batch saved', insertedBatch: result.rows[0] });
  } catch (error) {
    console.error('recordStockReceived:', error.message);
    res.status(500).json({ success: false, message: 'Failed to save batch.' });
  }
};

export const recordStockDispensed = async (req, res) => {
  const { batch_id, quantity_dispensed } = req.body;
  if (!batch_id || !quantity_dispensed) return res.status(400).json({ success: false, message: 'Invalid batch or qty' });
  try {
    const check = await queryWithRetry('SELECT quantity_available, batch_number FROM stock_batches WHERE id = $1 AND user_id = $2', [batch_id, req.user.id]);
    if (!check.rows.length) return res.status(404).json({ success: false, message: 'Batch not found' });
    if (check.rows[0].quantity_available < quantity_dispensed) return res.status(400).json({ success: false, message: `Not enough in ${check.rows[0].batch_number}` });
    await queryWithRetry('UPDATE stock_batches SET quantity_available = quantity_available - $1 WHERE id = $2 AND user_id = $3', [quantity_dispensed, batch_id, req.user.id]);
    const trans = await queryWithRetry('INSERT INTO stock_transactions (batch_id, quantity) VALUES ($1, $2) RETURNING *', [batch_id, quantity_dispensed]);
    res.status(201).json({ success: true, transactionDetails: trans.rows[0] });
  } catch (error) {
    console.error('recordStockDispensed:', error.message);
    res.status(500).json({ success: false, message: 'Dispense failed' });
  }
};

export const deleteBatch = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM stock_batches WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Batch not found' });
    res.json({ success: true, message: 'Batch deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const updatePrice = async (req, res) => {
  const { selling_price, purchase_price } = req.body;
  if (selling_price == null && purchase_price == null) {
    return res.status(400).json({ success: false, message: 'Provide selling_price or purchase_price' });
  }
  try {
    const current = await pool.query('SELECT purchase_price, selling_price FROM stock_batches WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!current.rows[0]) return res.status(404).json({ success: false, message: 'Batch not found' });
    const newPurchase = purchase_price ?? current.rows[0].purchase_price;
    const newSelling = selling_price ?? current.rows[0].selling_price;
    const result = await pool.query(
      'UPDATE stock_batches SET selling_price = $1, purchase_price = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
      [newSelling, newPurchase, req.params.id, req.user.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};