-- Migration: Aggiungi campo video_url alla tabella events
-- Data: 10 gennaio 2026

-- Aggiungi colonna video_url
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Commento per documentare il campo
COMMENT ON COLUMN events.video_url IS 'URL pubblico del video clip su Supabase Storage (60 secondi: 30s prima + 30s dopo evento)';
