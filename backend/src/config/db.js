import pg from 'pg';

const { Pool } = pg;


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000, 
  ssl: {
    rejectUnauthorized: false
  }
});

export default pool;
