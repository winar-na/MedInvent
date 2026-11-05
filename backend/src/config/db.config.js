import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

let lastOfflineLog = 0;

const pool = {
  query: async (text, params = []) => {
    try {
      const result = await sql.query(text, params);
      return { rows: result, rowCount: result?.length || 0 };
    } catch (err) {
      const now = Date.now();
      if (now - lastOfflineLog > 30000) {
        console.error('[DB OFFLINE]: No internet to Neon, will retry quietly. Check wifi.');
        lastOfflineLog = now;
      }
      throw new Error('DB_OFFLINE: ' + err.message);
    }
  },
  on: () => {},
};

export default pool;