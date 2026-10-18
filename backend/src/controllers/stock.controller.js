import pool from '../config/db.js';

/**
 * =========================================================================
 * FEATURE 1: GET CURRENT LIVE INVENTORY STOCK
 * =========================================================================
  */
export const getCurrentStock = async (req, res) => {

  try {
    
    const queryText = `
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.brand,
        p.unit,
        p.min_reorder_level,
        sb.id AS batch_id,
        sb.batch_number,
        sb.supplier,
        sb.quantity_received,
        sb.quantity_available,
        sb.purchase_price,
        sb.selling_price,
        sb.expiry_date,
        sb.date_received
      FROM stock_batches sb
      JOIN products p ON sb.product_id = p.id
      ORDER BY p.name ASC, sb.expiry_date ASC;
    `;

    const databaseResult = await pool.query(queryText);

    console.log(`[STOCK MODULE]: Live stock requested. Found ${databaseResult.rows.length} active records.`);

    res.status(200).json({
      success: true,
      count: databaseResult.rows.length,
      data: databaseResult.rows
    });

  } catch (error) {
    
    console.error('❌ Error inside getCurrentStock controller:', error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve live inventory balances from the database basement.'
    });
  }
};

/**
 * =========================================================================
 * FEATURE 2: LIVE EXPIRY MONITORING RADAR
 * =========================================================================
*/
export const getExpiryStatus = async (req, res) => {
  try {
    
    const queryText = `
      SELECT 
        sb.id AS batch_id,
        p.name AS product_name,
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

    const databaseResult = await pool.query(queryText);
    console.log(`[EXPIRY MODULE]: Expiry check performed. Categorized ${databaseResult.rows.length} batches.`);

    res.status(200).json({
      success: true,
      count: databaseResult.rows.length,
      data: databaseResult.rows
    });

  } catch (error) {
    console.error('❌ Error inside getExpiryStatus controller:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to process calendar expiry metrics from the database basement.'
    });
  }
};

/**
 * =========================================================================
 * FEATURE 3: RECORD NEWLY RECEIVED STOCK ARRIVALS
 * ========================================================================= 
**/
export const recordStockReceived = async (req, res) => {
  
  const {
    product_id,
    batch_number,
    supplier,
    quantity_received,
    purchase_price,
    selling_price,
    expiry_date
  } = req.body;

  if (!product_id || !batch_number || !quantity_received || !purchase_price || !selling_price || !expiry_date) {
    return res.status(400).json({
      success: false,
      message: 'Validation Failure: Missing required fields. Ensure batch details and prices are filled.'
    });
  }

  try {
    
    const insertQueryText = `
      INSERT INTO stock_batches 
        (product_id, batch_number, supplier, quantity_received, quantity_available, purchase_price, selling_price, expiry_date)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const queryValues = [
      product_id,
      batch_number,
      supplier,
      quantity_received,
      quantity_received, 
      purchase_price,
      selling_price,
      expiry_date
    ];

    const databaseResult = await pool.query(insertQueryText, queryValues);
    
    const newlyCreatedBatch = databaseResult.rows[0];
    console.log(`[STOCK MODULE]: Successfully recorded new shipment batch: ${newlyCreatedBatch.batch_number}`);

    
    res.status(201).json({
      success: true,
      message: 'New stock shipment successfully written to the inventory database.',
      insertedBatch: newlyCreatedBatch
    });

  } catch (error) {
    console.error('❌ Error inside recordStockReceived controller:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to commit new stock entry down into the database basement.'
    });
  }
};


/**
 * =========================================================================
 * FEATURE 4: REORDERING ALERTS & LOW STOCK RADAR
 * =========================================================================
  */
export const getReorderAlerts = async (req, res) => {
  try {
    
    const queryText = `
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.brand,
        p.unit,
        p.min_reorder_level,
        COALESCE(SUM(sb.quantity_available), 0) AS total_stock_available,
        CASE 
          WHEN COALESCE(SUM(sb.quantity_available), 0) = 0 THEN 'CRITICAL STOCKOUT'
          ELSE 'LOW STOCK'
        END AS alert_status
      FROM products p
      LEFT JOIN stock_batches sb ON p.id = sb.product_id
      GROUP BY p.id, p.name, p.brand, p.unit, p.min_reorder_level
      HAVING COALESCE(SUM(sb.quantity_available), 0) <= p.min_reorder_level
      ORDER BY total_stock_available ASC;
    `;

    
    const databaseResult = await pool.query(queryText);
    
    console.log(`[REORDER MODULE]: Calculation complete. Found ${databaseResult.rows.length} items needing restock.`);

    
    res.status(200).json({
      success: true,
      count: databaseResult.rows.length,
      data: databaseResult.rows
    });

  } catch (error) {
    console.error('❌ Error inside getReorderAlerts controller:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to process low stock calculations from the database basement.'
    });
  }
};

/**
 * =========================================================================
 * FEATURE 5: RECORD STOCK DISPENSED / USED
 * =========================================================================
**/

export const recordStockDispensed = async (req, res) => {
  
  const { batch_id, quantity_dispensed } = req.body;

  if (!batch_id || !quantity_dispensed || quantity_dispensed <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation Failure: Invalid batch number or quantity requested.'
    });
  }

  try {
    
    const checkQueryText = `
      SELECT quantity_available, batch_number 
      FROM stock_batches 
      WHERE id = $1;
    `;
    const checkResult = await pool.query(checkQueryText, [batch_id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Database Failure: The specified batch container was not found.'
      });
    }

    const currentBatch = checkResult.rows[0];

    
    if (currentBatch.quantity_available < quantity_dispensed) {
      return res.status(400).json({
        success: false,
        message: `Stockout Warning: Not enough items left in Batch ${currentBatch.batch_number}. Available: ${currentBatch.quantity_available}, Requested: ${quantity_dispensed}`
      });
    }

    const updateBatchText = `
      UPDATE stock_batches 
      SET quantity_available = quantity_available - $1 
      WHERE id = $2 
      RETURNING *;
    `;
    await pool.query(updateBatchText, [quantity_dispensed, batch_id]);

    const insertTransactionText = `
      INSERT INTO stock_transactions (batch_id, quantity) 
      VALUES ($1, $2) 
      RETURNING *;
    `;
    const transactionResult = await pool.query(insertTransactionText, [batch_id, quantity_dispensed]);

    console.log(`[DISPENSE MODULE]: Subtracted ${quantity_dispensed} items from Batch ID: ${batch_id}`);

    res.status(201).json({
      success: true,
      message: 'Stock usage successfully logged, and live shelf balances updated.',
      transactionDetails: transactionResult.rows[0]
    });

  } catch (error) {
    console.error('❌ Error inside recordStockDispensed controller:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to process stock deduction down in the database basement.'
    });
  }
};


