-- Funzione per ottenere GPS points con coordinate già convertite
CREATE OR REPLACE FUNCTION get_session_gps_with_coords(session_id_param INTEGER)
RETURNS TABLE (
  id INTEGER,
  velocita DECIMAL(5,2),
  ts TIMESTAMP,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gps_points.id,
    gps_points.velocita,
    gps_points.timestamp AS ts,
    ST_Y(gps_points.location::geometry) AS lat,
    ST_X(gps_points.location::geometry) AS lon
  FROM gps_points
  WHERE gps_points.session_id = session_id_param
  ORDER BY gps_points.timestamp ASC;
END;
$$ LANGUAGE plpgsql;

-- Funzione per ottenere eventi con coordinate già convertite
CREATE OR REPLACE FUNCTION get_session_events_with_coords(session_id_param INTEGER)
RETURNS TABLE (
  id INTEGER,
  tipo VARCHAR(50),
  descrizione TEXT,
  ts TIMESTAMP,
  video_url TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    events.id,
    events.tipo,
    events.descrizione,
    events.timestamp AS ts,
    events.video_url,
    ST_Y(events.location::geometry) AS lat,
    ST_X(events.location::geometry) AS lon
  FROM events
  WHERE events.session_id = session_id_param
  ORDER BY events.timestamp ASC;
END;
$$ LANGUAGE plpgsql;
