import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const withRetry = async (fn) => {
  for(let i=0; i<8; i++){
    try{ return await fn(); }
    catch(e){
      if(e.message.includes('fetch failed')){
        console.log(`Neon waking... retry ${i+1}`);
        await new Promise(r=>setTimeout(r,4000));
        continue;
      }
      throw e; // real DB error
    }
  }
}

console.log('1. Cleaning up previous test batch...');
await withRetry(() => sql`DELETE FROM stock_batches WHERE batch_number = 'FINAL-FAIL-TEST'`);

console.log('2. Trying to insert EXPIRED drug 2020-01-01 - should be BLOCKED');
try {
  await withRetry(() => sql`INSERT INTO stock_batches (product_id, batch_number, quantity_received, quantity_available, purchase_price, selling_price, expiry_date) VALUES (1, 'FINAL-FAIL-TEST', 10, 5, 1000, 1500, '2020-01-01')`);
  console.log('❌ FAILED - expired drug was allowed! Trigger not working');
} catch (e) {
  if (e.message.includes('BLOCKED') || e.message.includes('past')) {
    console.log('✅ SUCCESS: Expiry CHECK is working! Neon said:');
    console.log(e.message);
  } else {
    console.log('❌ Different error:', e.message);
  }
}

console.log('\n3. Trying to insert VALID drug 2027-01-01 - should be ALLOWED');
try {
  await withRetry(() => sql`INSERT INTO stock_batches (product_id, batch_number, quantity_received, quantity_available, purchase_price, selling_price, expiry_date) VALUES (1, 'FINAL-PASS-TEST', 10, 5, 1000, 1500, '2027-01-01')`);
  console.log('✅ SUCCESS: Valid future expiry was allowed, as expected');
  await withRetry(() => sql`DELETE FROM stock_batches WHERE batch_number='FINAL-PASS-TEST'`);
} catch (e) {
  console.log('❌ FAILED - valid drug was blocked:', e.message);
}