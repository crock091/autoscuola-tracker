import pkg from 'pg';
const { Pool } = pkg;

// Pool condiviso per tutte le routes
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

export default pool;
