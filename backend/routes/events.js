import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Crea evento
router.post('/', async (req, res) => {
  try {
    const { session_id, tipo, descrizione, lat, lon } = req.body;
    
    const result = await pool.query(
      'INSERT INTO events (session_id, tipo, descrizione, location, timestamp) VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, NOW()) RETURNING id, tipo, descrizione, timestamp',
      [session_id, tipo, descrizione, lon, lat]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Errore creazione evento' });
  }
});

// Ottieni eventi di una sessione
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await pool.query(
      'SELECT id, tipo, descrizione, ST_X(location::geometry) as lon, ST_Y(location::geometry) as lat, timestamp FROM events WHERE session_id = $1 ORDER BY timestamp',
      [sessionId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Errore recupero eventi' });
  }
});

export default router;
