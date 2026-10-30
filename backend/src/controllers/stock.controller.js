import pool from '../config/db.js';

// Demo data for DEMO_MODE
const demoData = [
  { product_id: 1, product_name: 'Cetirizine 10mg', brand: '', unit: 'tabs', category: 'Drugs', department: 'Pharmacy', batch_id: 1, batch_number: 'CET-004X', supplier: 'Demo', quantity_received: 120, quantity_available: 120, purchase_price: 80, selling_price: 150, profit_per_unit: 70, potential_profit: 8400, expiry_date: '2026-09-15', date_received: '2026-01-10', days_remaining: -43, health_status: 'EXPIRED' },
  { product_id: 2, product_name: 'Amoxicillin 500mg', brand: '', unit: 'caps', category: 'Drugs', department: 'Pharmacy', batch_id: 2, batch_number: 'AMX-2026-A', supplier: 'Demo', quantity_received: 500, quantity_available: 450, purchase_price: 150, selling_price: 250, profit_per_unit: 100, potential_profit: 45000, expiry_date: '2026-11-20', date_received: '2026-02-01', days_remaining: 23, health_status: 'SOON EXPIRING' },
  { product_id: 3, product_name: 'Cough Syrup 100ml', brand: '', unit: 'bottle', category: 'Drugs', department: 'Pharmacy', batch_id: 3, batch_number: 'HDL-033', supplier: 'Demo', quantity_received: 50, quantity_available: 35, purchase_price: 4000, selling_price: 6500, profit_per_unit: 2500, potential_profit: 87500, expiry_date: '2026-12-05', date_received: '2026-03-10', days_remaining: 38, health_status: 'SOON EXPIRING' },
  { product_id: 4, product_name: 'Amoxicillin/Clavulanic Acid 625mg', brand: '', unit: 'tabs', category: 'Drugs', department: 'Pharmacy', batch_id: 4, batch_number: 'AUG-8821', supplier: 'Demo', quantity_received: 200, quantity_available: 200, purchase_price: 3500, selling_price: 5000, profit_per_unit: 1500, potential_profit: 300000, expiry_date: '2027-05-18', date_received: '2026-04-01', days_remaining: 202, health_status: 'ACTIVE' },
  { product_id: 5, product_name: 'urine dipsticks', brand: '', unit: 'pack', category: 'Lab', department: 'Lab', batch_id: 5, batch_number: '10001111000', supplier: 'Demo', quantity_received: 100, quantity_available: 100, purchase_price: 500, selling_price: 5000, profit_per_unit: 4500, potential_profit: 450000, expiry_date: '2027-11-12', date_received: '2026-05-01', days_remaining: 380, health_status: 'ACTIVE' },
  { product_id: 6, product_name: 'Paracetamol 500mg', brand: '', unit: 'tabs', category: 'Drugs', department: 'Pharmacy', batch_id: 6, batch_number: 'PAN-9982', supplier: 'Demo', quantity_received: 500, quantity_available: 400, purchase_price: 20, selling_price: 50, profit_per_unit: 30, potential_profit: 12000, expiry_date: '2027-12-15', date_received: '2026-06-01', days_remaining: 413, health_status: 'ACTIVE' },
  { product_id: 7, product_name: 'Amoxicillin 500mg', brand: '', unit: 'caps', category: 'Drugs', department: 'Pharmacy', batch_id: 7, batch_number: 'AMX-2028-B', supplier: 'Demo', quantity_received: 1000, quantity_available: 1000, purchase_price: 145, selling_price: 250, profit_per_unit: 105, potential_profit: 105000, expiry_date: '2028-06-30', date_received: '2026-07-01', days_remaining: 611, health_status: 'ACTIVE' },
  { product_id: 8, product_name: 'Paracetamol 500mg', brand: '', unit: 'tabs', category: 'Drugs', department: 'Pharmacy', batch_id: 8, batch_number: 'PAN-THUNDER-99', supplier: 'Demo', quantity_received: 500, quantity_available: 500, purchase_price: 20, selling_price: 50, profit_per_unit: 30, potential_profit: 15000, expiry_date: '2028-12-31', date_received: '2026-07-15', days_remaining: 795, health_status: 'ACTIVE' },
];

const isDemo = () => process.env.DEMO_MODE === 'true';

const queryWithRetry = async (text, params = []) => {
  let retries = 3;
  let delay = 3000;
  while (retries > 0) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      const msg = err.message || '';
      const isNetworkError = msg.includes('terminated') || msg.includes('timeout') || msg.includes('Connection') || msg.includes('fetch failed') || msg.includes('DB_OFFLINE') || msg.includes('connect');

      if (!isNetworkError) throw err;

      retries--;
      if (retries === 0) throw err;
      console.log(`[DB RETRY]: Waiting ${delay / 1000}s... ${3 - retries}/3 - ${msg}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
};

export const getCurrentStock = async (req, res) => {
  try {
    const queryText = `
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.brand,
        p.unit,
        p.category,
        p.department,
        p.min_reorder_level,
        sb.id AS batch_id,
        sb.batch_number,
        sb.supplier,
        sb.quantity_received,
        sb.quantity_available,
        sb.purchase_price,
        sb.selling_price,
        (sb.selling_price - sb.purchase_price) AS profit_per_unit,
        (sb.selling_price - sb.purchase_price) * sb.quantity_available AS potential_profit,
        sb.expiry_date,
        sb.date_received,
        (sb.expiry_date - CURRENT_DATE) AS days_remaining,
        CASE 
          WHEN sb.expiry_date < CURRENT_DATE THEN 'EXPIRED'
          WHEN sb.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'SOON EXPIRING'
          ELSE 'ACTIVE'
        END AS health_status
      FROM stock_batches sb
      JOIN products p ON sb.product_id = p.id
      ORDER BY sb.expiry_date ASC;
    `;
    const databaseResult = await queryWithRetry(queryText);

    let rows = databaseResult.rows;
    if (rows.length === 0 && isDemo()) rows = demoData;

    // Calculate summary for Dashboard UGX values
    const summary = {
      totalBatches: rows.length,
      stockValue: rows.reduce((acc, i) => acc + (Number(i.selling_price) * Number(i.quantity_available)), 0),
      capitalTied: rows.reduce((acc, i) => acc + (Number(i.purchase_price) * Number(i.quantity_available)), 0),
      potentialProfit: rows.reduce((acc, i) => acc + (Number(i.profit_per_unit || i.potential_profit / i.quantity_available || 0) * Number(i.quantity_available)), 0),
    };
    summary.margin = summary.capitalTied > 0 ? ((summary.potentialProfit / summary.capitalTied) * 100).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
      summary,
      offline: false
    });
  } catch (error) {
    if (error.message.includes('DB_OFFLINE') || error.message.includes('fetch failed')) {
      if (isDemo()) {
        const rows = demoData;
        const summary = {
          totalBatches: rows.length,
          stockValue: rows.reduce((acc, i) => acc + (i.selling_price * i.quantity_available), 0),
          capitalTied: rows.reduce((acc, i) => acc + (i.purchase_price * i.quantity_available), 0),
          potentialProfit: rows.reduce((acc, i) => acc + (i.profit_per_unit * i.quantity_available), 0),
        };
        summary.margin = ((summary.potentialProfit / summary.capitalTied) * 100).toFixed(1);
        return res.status(200).json({ success: true, count: rows.length, data: rows, summary, offline: true });
      }
      return res.status(503).json({ success: false, offline: true, data: [], summary: { totalBatches: 0, stockValue: 0, capitalTied: 0, potentialProfit: 0, margin: 0 } });
    }
    console.error('❌ getCurrentStock:', error.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve live inventory.' });
  }
};

export const getExpiryStatus = async (req, res) => {
  try {
    const queryText = `
      SELECT 
        sb.id AS batch_id,
        p.name AS product_name,
        p.category,
        sb.batch_number,
        sb.quantity_available,
        sb.expiry_date,
        sb.expiry_date - CURRENT_DATE AS days_remaining,
        CASE 
          WHEN sb.expiry_date <= CURRENT_DATE THEN 'EXPIRED'
          WHEN sb.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'SOON EXPIRING'
          ELSE 'ACTIVE'
        END AS health_status
      FROM stock_batches sb
      JOIN products p ON sb.product_id = p.id
      WHERE sb.quantity_available > 0
      ORDER BY sb.expiry_date ASC;
    `;
    const databaseResult = await queryWithRetry(queryText);
    let rows = databaseResult.rows;
    if (rows.length === 0 && isDemo()) rows = demoData.filter(d => d.quantity_available > 0);

    res.status(200).json({ success: true, count: rows.length, data: rows, offline: false });
  } catch (error) {
    if (error.message.includes('DB_OFFLINE') || error.message.includes('fetch failed')) {
      if (isDemo()) return res.status(200).json({ success: true, count: demoData.length, data: demoData, offline: true });
      return res.status(503).json({ success: false, offline: true, data: [] });
    }
    console.error('❌ getExpiryStatus:', error.message);
    res.status(500).json({ success: false, message: 'Failed expiry check.' });
  }
};

export const recordStockReceived = async (req, res) => {
  const { product_id, batch_number, supplier, quantity_received, quantity_available, purchase_price, selling_price, expiry_date, date_received } = req.body;

  if (!product_id || !batch_number || !quantity_received || !purchase_price || !selling_price || !expiry_date) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  try {
    const insertQueryText = `
      INSERT INTO stock_batches 
        (product_id, batch_number, supplier, quantity_received, quantity_available, purchase_price, selling_price, expiry_date, date_received)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;
    `;
    const values = [product_id, batch_number, supplier, quantity_received, quantity_available || quantity_received, purchase_price, selling_price, expiry_date, date_received || new Date()];
    const result = await queryWithRetry(insertQueryText, values);
    res.status(201).json({ success: true, message: 'New batch saved with profit tracking.', insertedBatch: result.rows[0] });
  } catch (error) {
    if (error.message.includes('DB_OFFLINE') || error.message.includes('fetch failed')) return res.status(503).json({ success: false, offline: true, message: 'No internet - cannot save now' });
    console.error('❌ recordStockReceived:', error.message);
    res.status(500).json({ success: false, message: 'Failed to save batch.' });
  }
};

export const getReorderAlerts = async (req, res) => {
  try {
    const queryText = `
      SELECT p.id, p.name AS product_name, p.brand, p.unit, p.category, p.min_reorder_level,
        COALESCE(SUM(sb.quantity_available), 0) AS total_stock_available
      FROM products p LEFT JOIN stock_batches sb ON p.id = sb.product_id
      GROUP BY p.id HAVING COALESCE(SUM(sb.quantity_available), 0) <= p.min_reorder_level
      ORDER BY total_stock_available ASC;
    `;
    const result = await queryWithRetry(queryText);
    let rows = result.rows;
    if (rows.length === 0 && isDemo()) rows = [];
    res.status(200).json({ success: true, count: rows.length, data: rows, offline: false });
  } catch (error) {
    if (error.message.includes('DB_OFFLINE') || error.message.includes('fetch failed')) return res.status(503).json({ success: false, offline: true, data: [] });
    res.status(500).json({ success: false, message: 'Reorder check failed.' });
  }
};

export const recordStockDispensed = async (req, res) => {
  const { batch_id, quantity_dispensed } = req.body;
  if (!batch_id || !quantity_dispensed) return res.status(400).json({ success: false, message: 'Invalid batch or qty' });
  try {
    const check = await queryWithRetry('SELECT quantity_available, batch_number FROM stock_batches WHERE id = $1', [batch_id]);
    if (!check.rows.length) return res.status(404).json({ success: false, message: 'Batch not found' });
    if (check.rows[0].quantity_available < quantity_dispensed) return res.status(400).json({ success: false, message: `Not enough in ${check.rows[0].batch_number}` });

    await queryWithRetry('UPDATE stock_batches SET quantity_available = quantity_available - $1 WHERE id = $2', [quantity_dispensed, batch_id]);
    const trans = await queryWithRetry('INSERT INTO stock_transactions (batch_id, quantity) VALUES ($1, $2) RETURNING *', [batch_id, quantity_dispensed]);
    res.status(201).json({ success: true, transactionDetails: trans.rows[0] });
  } catch (error) {
    if (error.message.includes('DB_OFFLINE') || error.message.includes('fetch failed')) return res.status(503).json({ success: false, offline: true, message: 'No internet - sale not saved' });
    res.status(500).json({ success: false, message: 'Dispense failed' });
  }
};