import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing in .env');
  process.exit(1);
}

console.log('Connecting to Neon...');

const sql = neon(process.env.DATABASE_URL);

try {
  const result = await sql`SELECT NOW() as database_time, current_database() as database_name`;
  console.log('✅ Database connection successful!');
  console.log(result[0]);
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  console.error(error);
}