import pool from '../config/db.js';

export const getExpiryAlerts = async (req, res) => {
  try {
    // Stock: Drugs + Lab Kits + Reagents (<10 days)
    const stock = await pool.query(`
      SELECT 
        sb.id as batch_id,
        p.name as product_name,
        sb.batch_number,
        sb.quantity_available,
        sb.expiry_date,
        (sb.expiry_date - CURRENT_DATE) as days_remaining,
        CASE 
          WHEN sb.expiry_date < CURRENT_DATE THEN 'EXPIRED'
          WHEN sb.expiry_date - CURRENT_DATE <= 2 THEN 'CRITICAL'
          WHEN sb.expiry_date - CURRENT_DATE <= 10 THEN 'URGENT'
          ELSE 'OK'
        END as health_status
      FROM stock_batches sb
      JOIN products p ON p.id = sb.product_id
      WHERE sb.quantity_available > 0
      AND sb.expiry_date <= CURRENT_DATE + INTERVAL '10 days'
      ORDER BY sb.expiry_date ASC
    `);

    // Blood: <10 days
    let blood = { rows: [] };
    try {
      blood = await pool.query(`
        SELECT 
          id,
          component,
          blood_group,
          unit_number,
          collected_date,
          expiry_date,
          quantity,
          status,
          (expiry_date - CURRENT_DATE) as days_remaining,
          CASE 
            WHEN expiry_date < CURRENT_DATE THEN 'EXPIRED'
            WHEN expiry_date - CURRENT_DATE <= 2 THEN 'CRITICAL'
            WHEN expiry_date - CURRENT_DATE <= 10 THEN 'URGENT'
            ELSE 'OK'
          END as health_status
        FROM blood_units
        WHERE status='Available'
        AND expiry_date <= CURRENT_DATE + INTERVAL '10 days'
        ORDER BY expiry_date ASC
      `);
    } catch(e) {
      console.log('blood_units table not found, skipping');
    }

    res.json({ 
      success: true, 
      data: stock.rows, 
      stock: stock.rows,
      blood: blood.rows,
      total: stock.rows.length + blood.rows.length
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};