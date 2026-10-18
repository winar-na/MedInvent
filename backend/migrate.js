import { neon } from '@neondatabase/serverless';
import fs from 'fs';
const sql = neon(process.env.DATABASE_URL);

console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL);

async function runFile(path, label) {
  console.log(`Reading ${label} from ${path}...`);
  const content = fs.readFileSync(path, 'utf8');
  const queries = content.split(';').map(q => q.trim()).filter(q => q.length > 5);
  for (let q of queries) {
    await sql.unsafe(q + ';');
  }
  console.log(`✅ Success: ${label}!`);
}

try {
  await runFile('./src/database/schema.sql', 'Tables created cleanly using schema.sql');
  await runFile('./src/database/seed.sql', 'Test data populated using seed.sql');
  console.log('Database operation completed.');
} catch (err) {
  console.error('❌ Migration Failed:', err.message);
  process.exit(1);
}