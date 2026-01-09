import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Crea nuova sessione di guida
router.post('/', async (req, res) => {
  try {
    const { istruttore_id, allievo_id } = req.body;
    
    const result = await pool.query(
      'INSERT INTO sessions (istruttore_id, allievo_id, inizio) VALUES ($1, $2, NOW()) RETURNING *',
      [istruttore_id, allievo_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Errore creazione sessione' });
  }
});

// Termina sessione
router.patch('/:id/end', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      "UPDATE sessions SET fine = NOW(), stato = 'completata' WHERE id = $1 RETURNING *",
      [id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Errore terminazione sessione' });
  }
});

// Aggiungi punto GPS
router.post('/:id/gps', async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lon, velocita } = req.body;
    
    const result = await pool.query(
      'INSERT INTO gps_points (session_id, location, velocita, timestamp) VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4, NOW()) RETURNING id',
      [id, lon, lat, velocita]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Errore salvataggio punto GPS' });
  }
});

// Ottieni dettagli sessione con tracciato
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Info sessione
    const session = await pool.query(
      `SELECT s.*, 
        i.nome || ' ' || i.cognome as istruttore_nome,
        a.nome || ' ' || a.cognome as allievo_nome
       FROM sessions s
       JOIN users i ON s.istruttore_id = i.id
       JOIN users a ON s.allievo_id = a.id
       WHERE s.id = $1`,
      [id]
    );
    
    // Punti GPS
    const gpsPoints = await pool.query(
      'SELECT id, ST_X(location::geometry) as lon, ST_Y(location::geometry) as lat, velocita, timestamp FROM gps_points WHERE session_id = $1 ORDER BY timestamp',
      [id]
    );
    
    res.json({
      session: session.rows[0],
      gps_points: gpsPoints.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Errore recupero sessione' });
  }
});

// Ottieni tutte le sessioni di un utente
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { ruolo } = req.query;
    
    let query;
    if (ruolo === 'istruttore') {
      query = 'SELECT s.*, u.nome || \' \' || u.cognome as allievo_nome FROM sessions s JOIN users u ON s.allievo_id = u.id WHERE s.istruttore_id = $1 ORDER BY s.inizio DESC';
    } else {
      query = 'SELECT s.*, u.nome || \' \' || u.cognome as istruttore_nome FROM sessions s JOIN users u ON s.istruttore_id = u.id WHERE s.allievo_id = $1 ORDER BY s.inizio DESC';
    }
    
    const result = await pool.query(query, [userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Errore recupero sessioni' });
  }
});

export default router;
