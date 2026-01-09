import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Errore connessione database:', err);
  } else {
    console.log('✅ Database connesso:', res.rows[0].now);
  }
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server attivo' });
});

// Auth routes
import authRoutes from './routes/auth.js';
app.use('/api/auth', authRoutes);

// Session routes
import sessionRoutes from './routes/sessions.js';
app.use('/api/sessions', sessionRoutes);

// Event routes
import eventRoutes from './routes/events.js';
app.use('/api/events', eventRoutes);

app.listen(port, () => {
  console.log(`🚗 Server autoscuola in esecuzione su porta ${port}`);
});

export default app;
