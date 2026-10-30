import nodemailer from 'nodemailer';
import cron from 'node-cron';
import pool from '../config/db.js';

console.log('[Notifier] Email + WhatsApp expiry alerts loaded - <10 days mode');

// Email transporter
const createTransporter = () => {
  if (!process.env.ALERT_EMAIL || !process.env.ALERT_EMAIL_PASS) {
    console.log('[Notifier] ALERT_EMAIL not set - email disabled');
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.ALERT_EMAIL,
      pass: process.env.ALERT_EMAIL_PASS,
    },
  });
};

// Color codes - SAME FOR FRONTEND
const getRowColor = (days) => {
  if (days < 0) return '#ffcccc'; // RED = Expired
  if (days <= 2) return '#ff4444'; // DARK RED = Critical ≤2 days (Platelets)
  if (days <= 10) return '#ffcc66'; // ORANGE = Urgent <10 days
  return '#ffffff';
};

const getStatusText = (days) => {
  if (days < 0) return `EXPIRED ${Math.abs(days)}d ago`;
  if (days === 0) return 'Expires TODAY';
  if (days <= 2) return `CRITICAL - ${days}d left`;
  return `${days}d left`;
};

const sendEmailAlert = async (stockItems, bloodItems) => {
  const transporter = createTransporter();
  if (!transporter) return;

  const total = stockItems.length + bloodItems.length;
  if (total === 0) {
    console.log('[Notifier] Nothing to email');
    return;
  }

  let html = `
    <div style="font-family:Arial; padding:10px;">
    <h2 style="margin:0;">MedInvent Expiry Radar - <10 Days</h2>
    <p><b>${total} items</b> need urgent action: Stock=${stockItems.length}, Blood=${bloodItems.length}</p>
    
    <h3> Drugs / Lab Kits / Reagents (${stockItems.length})</h3>
    <table border="1" cellpadding="7" cellspacing="0" style="border-collapse:collapse; width:100%; font-size:13px;">
      <tr style="background:#222; color:white;">
        <th>Product</th><th>Batch No</th><th>Expiry Date</th><th>Qty</th><th>Status</th>
      </tr>`;

  stockItems.forEach(i => {
    html += `<tr style="background:${getRowColor(i.days_remaining)}">
      <td>${i.product_name}</td>
      <td>${i.batch_number}</td>
      <td>${new Date(i.expiry_date).toLocaleDateString('en-GB')}</td>
      <td>${i.quantity_available}</td>
      <td><b>${getStatusText(i.days_remaining)}</b></td>
    </tr>`;
  });

  html += `</table><br>
    <h3> Blood Bank (${bloodItems.length})</h3>
    <table border="1" cellpadding="7" cellspacing="0" style="border-collapse:collapse; width:100%; font-size:13px;">
      <tr style="background:#b30000; color:white;">
        <th>Component</th><th>Group</th><th>Unit No (9 digits)</th><th>Collected</th><th>Expiry</th><th>Status</th>
      </tr>`;

  bloodItems.forEach(b => {
    html += `<tr style="background:${getRowColor(b.days_remaining)}">
      <td>${b.component}</td>
      <td><b>${b.blood_group}</b></td>
      <td>${b.unit_number}</td>
      <td>${new Date(b.collected_date).toLocaleDateString('en-GB')}</td>
      <td>${new Date(b.expiry_date).toLocaleDateString('en-GB')}</td>
      <td><b>${getStatusText(b.days_remaining)}</b></td>
    </tr>`;
  });

  html += `</table><br>
    <div style="font-size:12px; margin-top:10px;">
      <b>Color Codes:</b><br>
      <span style="background:#ffcccc; padding:3px 10px;">Red = Expired</span>
      <span style="background:#ff4444; color:white; padding:3px 10px; margin-left:6px;">Dark Red = Critical ≤2 days</span>
      <span style="background:#ffcc66; padding:3px 10px; margin-left:6px;">Orange = Urgent <10 days</span>
    </div>
    <p style="margin-top:15px;">Login to MedInvent to take action.</p></div>`;

  const text = `MedInvent <10 days: ${total} items\n\nStock:\n` +
    stockItems.map(i => `${i.product_name} - ${i.batch_number} - ${i.days_remaining}d`).join('\n') +
    `\n\nBlood:\n` + bloodItems.map(b => `${b.component} ${b.blood_group} Unit ${b.unit_number} - ${b.days_remaining}d`).join('\n');

  try {
    await transporter.sendMail({
      from: process.env.ALERT_EMAIL,
      to: process.env.CLIENT_EMAIL || process.env.ALERT_EMAIL,
      subject: `MedInvent URGENT <10d: ${total} items (Stock:${stockItems.length} Blood:${bloodItems.length})`,
      text,
      html,
    });
    console.log(`[Notifier] Email sent to ${process.env.CLIENT_EMAIL} - ${total} items`);
  } catch (e) {
    console.error('[Notifier] Email failed:', e.message);
  }
};

// Daily job at 8AM Kampala
cron.schedule('0 8 * * *', async () => {
  console.log('[Notifier] Checking <10 days...');
  try {
    const stock = await pool.query(`
      SELECT p.name as product_name, sb.batch_number, sb.quantity_available, sb.expiry_date, 
      (sb.expiry_date - CURRENT_DATE) as days_remaining
      FROM stock_batches sb
      JOIN products p ON p.id = sb.product_id
      WHERE sb.quantity_available > 0 
      AND sb.expiry_date <= CURRENT_DATE + INTERVAL '10 days'
      ORDER BY sb.expiry_date ASC
      LIMIT 50
    `);

    let blood = { rows: [] };
    try {
      blood = await pool.query(`
        SELECT component, blood_group, unit_number, collected_date, expiry_date, 
        (expiry_date - CURRENT_DATE) as days_remaining
        FROM blood_units
        WHERE status = 'Available'
        AND expiry_date <= CURRENT_DATE + INTERVAL '10 days'
        ORDER BY expiry_date ASC
        LIMIT 50
      `);
    } catch (err) {
      if (!err.message.includes('does not exist')) console.log('[Notifier] blood_units table missing, skipping blood');
    }

    console.log(`[Notifier] Found - Stock: ${stock.rows.length}, Blood: ${blood.rows.length}`);

    if (stock.rows.length === 0 && blood.rows.length === 0) {
      console.log('[Notifier] No items <10 days');
      return;
    }

    await sendEmailAlert(stock.rows, blood.rows);

  } catch (err) {
    if (err.message.includes('DB_OFFLINE')) {
      console.log('[Notifier] Skipped - DB offline');
      return;
    }
    console.error('[Notifier] Job error:', err.message);
  }
}, { timezone: "Africa/Kampala" });

// Manual test route
export const testAlert = async (req, res) => {
  try {
    const stock = await pool.query(`
      SELECT p.name as product_name, sb.batch_number, sb.quantity_available, sb.expiry_date, 
      (sb.expiry_date - CURRENT_DATE) as days_remaining
      FROM stock_batches sb JOIN products p ON p.id = sb.product_id
      WHERE sb.quantity_available > 0 AND sb.expiry_date <= CURRENT_DATE + INTERVAL '10 days'
      ORDER BY sb.expiry_date ASC LIMIT 20
    `);

    let blood = { rows: [] };
    try {
      blood = await pool.query(`
        SELECT component, blood_group, unit_number, collected_date, expiry_date, 
        (expiry_date - CURRENT_DATE) as days_remaining
        FROM blood_units
        WHERE status='Available' AND expiry_date <= CURRENT_DATE + INTERVAL '10 days'
        ORDER BY expiry_date ASC LIMIT 20
      `);
    } catch (e) { }

    await sendEmailAlert(stock.rows, blood.rows);
    res.json({ 
      success: true, 
      message: `Test alert sent (<10 days) - Stock:${stock.rows.length} Blood:${blood.rows.length}`,
      stock: stock.rows, 
      blood: blood.rows 
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};