-- Abilita estensione PostGIS per dati geospaziali
CREATE EXTENSION IF NOT EXISTS postgis;

-- Tabella utenti (istruttori e allievi)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    ruolo VARCHAR(20) NOT NULL CHECK (ruolo IN ('istruttore', 'allievo')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella sessioni di guida
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    istruttore_id INTEGER REFERENCES users(id),
    allievo_id INTEGER REFERENCES users(id),
    inizio TIMESTAMP NOT NULL,
    fine TIMESTAMP,
    stato VARCHAR(20) DEFAULT 'in_corso' CHECK (stato IN ('in_corso', 'completata')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella punti GPS del tracciato
CREATE TABLE gps_points (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    velocita DECIMAL(5,2),
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indice spaziale per query geografiche veloci
CREATE INDEX idx_gps_points_location ON gps_points USING GIST(location);

-- Tabella eventi (errori, manovre corrette, ecc.)
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    descrizione TEXT,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indice spaziale per eventi
CREATE INDEX idx_events_location ON events USING GIST(location);

-- Indici per performance
CREATE INDEX idx_sessions_istruttore ON sessions(istruttore_id);
CREATE INDEX idx_sessions_allievo ON sessions(allievo_id);
CREATE INDEX idx_gps_points_session ON gps_points(session_id);
CREATE INDEX idx_events_session ON events(session_id);
