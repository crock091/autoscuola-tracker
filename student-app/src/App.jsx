import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css';

// Componente per controllare il centro della mappa
function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  
  return null;
}

// Fix per icona marker default
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Icone personalizzate per eventi
const errorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const successIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const API_URL = 'https://wokjywwzgyrgkiriyvyj.supabase.co/rest/v1';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indva2p5d3d6Z3lyZ2tpcml5dnlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NDQzNzMsImV4cCI6MjA4MzUyMDM3M30.o6UVvuR3yOfyhG00-0FUsz6V6vC_qSzPG44TrEMCKA4';

const supabaseHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

function App() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(true); // Sidebar visibile all'avvio
  const [selectedEventLocation, setSelectedEventLocation] = useState(null);
  const [highlightedEventId, setHighlightedEventId] = useState(null); // ID evento evidenziato
  const [videoModalOpen, setVideoModalOpen] = useState(false); // Modal video
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null); // URL video corrente
  
  // Carica sessioni all'avvio
  useEffect(() => {
    loadSessions();
  }, []);
  
  // Carica dettagli quando viene selezionata una sessione
  useEffect(() => {
    if (selectedSession) {
      loadSessionDetails(selectedSession);
    }
  }, [selectedSession]);
  
  const loadSessions = async () => {
    try {
      // TODO: usare ID reale da login (per ora allievo_id=2)
      const response = await fetch(`${API_URL}/sessions?allievo_id=eq.2&order=inizio.desc`, {
        headers: supabaseHeaders
      });
      const data = await response.json();
      setSessions(data);
      setLoading(false);
    } catch (error) {
      console.error('Errore caricamento sessioni:', error);
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId) => {
    if (!confirm('Sei sicuro di voler eliminare questa guida? Questa azione non può essere annullata.')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Elimina GPS points
      await fetch(`${API_URL}/gps_points?session_id=eq.${sessionId}`, {
        method: 'DELETE',
        headers: supabaseHeaders
      });
      
      // Elimina eventi
      await fetch(`${API_URL}/events?session_id=eq.${sessionId}`, {
        method: 'DELETE',
        headers: supabaseHeaders
      });
      
      // Elimina sessione
      await fetch(`${API_URL}/sessions?id=eq.${sessionId}`, {
        method: 'DELETE',
        headers: supabaseHeaders
      });
      
      alert('✅ Guida eliminata con successo');
      loadSessions(); // Ricarica la lista
      setSelectedSession(null);
      setSessionDetails(null);
      setEvents([]);
    } catch (error) {
      console.error('Errore eliminazione sessione:', error);
      alert('❌ Errore durante l\'eliminazione');
      setLoading(false);
    }
  };
  
  const loadSessionDetails = async (sessionId) => {
    try {
      setLoading(true);
      
      // Carica info sessione
      const sessionResponse = await fetch(`${API_URL}/sessions?id=eq.${sessionId}`, {
        headers: supabaseHeaders
      });
      const sessionData = await sessionResponse.json();
      console.log('Session data:', sessionData);
      
      // Carica punti GPS usando la funzione RPC
      const gpsResponse = await fetch(`${API_URL}/rpc/get_gps_points`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({ p_session_id: sessionId })
      });
      const gpsPoints = await gpsResponse.json();
      console.log('GPS points:', gpsPoints);
      
      setSessionDetails({
        session: sessionData[0] || {},
        gps_points: gpsPoints.map(p => ({ ...p, timestamp: p.ts }))
      });
      
      // Carica eventi usando la funzione RPC
      const eventsResponse = await fetch(`${API_URL}/rpc/get_events`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({ p_session_id: sessionId })
      });
      const events = await eventsResponse.json();
      console.log('Events:', events);
      
      setEvents(events.map(e => ({ ...e, timestamp: e.ts })));
      setLoading(false);
    } catch (error) {
      console.error('Errore caricamento dettagli:', error);
      setLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(new Date(dateString).getTime() + 60*60*1000);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getEventIcon = (tipo) => {
    return tipo === 'manovra_corretta' ? successIcon : errorIcon;
  };
  
  const getEventLabel = (tipo) => {
    const labels = {
      'precedenza_pedoni': 'Precedenza pedoni',
      'stop': 'Stop',
      'semaforo': 'Semaforo rosso',
      'distanza': 'Distanza sicurezza',
      'manovra_corretta': 'Manovra corretta'
    };
    return labels[tipo] || tipo;
  };
  
  // Calcola centro mappa dai punti GPS
  const getMapCenter = () => {
    if (!sessionDetails?.gps_points || sessionDetails.gps_points.length === 0) {
      return [45.4642, 9.1900]; // Milano di default
    }
    const firstPoint = sessionDetails.gps_points[0];
    return [firstPoint.lat, firstPoint.lon];
  };
  
  return (
    <div className="app">
      {/* Menu toggle visibile solo dopo aver selezionato una guida */}
      {selectedSession && !menuOpen && (
        <button 
          className="menu-toggle" 
          onClick={() => setMenuOpen(true)}
          aria-label="Apri menu"
        >
          ☰
        </button>
      )}

      {/* Overlay per chiudere menu su mobile */}
      <div 
        className={`overlay ${menuOpen ? 'visible' : ''}`}
        onClick={() => setMenuOpen(false)}
      />

      <div className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>📚 Le Mie Guide</h1>
        </div>
        
        <div className="sessions-list">
          {loading && !selectedSession ? (
            <div className="loading-text">Caricamento...</div>
          ) : sessions.length === 0 ? (
            <div className="empty-state">Nessuna guida disponibile</div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                className={`session-card ${selectedSession === session.id ? 'active' : ''}`}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div onClick={() => { 
                  setSelectedSession(session.id);
                  setMenuOpen(false); // Nascondi sidebar per vedere mappa
                }} style={{ flex: 1, cursor: 'pointer' }}>
                  <div className="session-date">
                    {formatDate(session.inizio)}
                  </div>
                  <div className="session-instructor">
                    Istruttore: {session.istruttore_nome}
                  </div>
                  <div className="session-status">
                    {session.stato === 'completata' ? '✓ Completata' : '⏱️ In corso'}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85em',
                    marginLeft: '10px'
                  }}
                  title="Elimina guida"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="main-content">
        {!selectedSession ? (
          <div className="empty-state-main">
            <h2>Seleziona una guida per visualizzare il percorso</h2>
            <p>Clicca su una sessione nella lista a sinistra</p>
          </div>
        ) : loading ? (
          <div className="loading-main">Caricamento percorso...</div>
        ) : sessionDetails && sessionDetails.gps_points.length > 0 ? (
          <>
            <div className="map-header">
              <h2>Percorso della guida</h2>
              <div className="stats">
                <div className="stat">
                  <span className="stat-label">Orario:</span>
                  <span className="stat-value">
                    {(() => {
                      // Converti da UTC a ora italiana (+1 ora)
                      const inizioDate = new Date(new Date(sessionDetails.session.inizio).getTime() + 60*60*1000);
                      const fineDate = sessionDetails.session.fine ? new Date(new Date(sessionDetails.session.fine).getTime() + 60*60*1000) : new Date();
                      
                      // Arrotonda l'ora di inizio all'ora precedente (es. 9:05 -> 9:00)
                      const oraInizio = inizioDate.getHours();
                      
                      // Arrotonda l'ora di fine all'ora successiva (es. 9:50 -> 10:00)
                      const oraFine = fineDate.getMinutes() > 0 ? fineDate.getHours() + 1 : fineDate.getHours();
                      
                      return `dalle ${oraInizio}:00 alle ${oraFine}:00`;
                    })()}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Eventi:</span>
                  <span className="stat-value">{events.length}</span>
                </div>
              </div>
            </div>
            
            <div className="map-wrapper">
              <MapContainer
                center={getMapCenter()}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
              >
                <MapController center={selectedEventLocation} zoom={17} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Tracciato percorso */}
                <Polyline
                  positions={sessionDetails.gps_points.map(p => [p.lat, p.lon])}
                  color="#2563eb"
                  weight={4}
                />
                
                {/* Marker inizio */}
                <Marker position={[sessionDetails.gps_points[0].lat, sessionDetails.gps_points[0].lon]}>
                  <Popup>
                    <strong>🚀 Inizio</strong><br />
                    {formatDate(sessionDetails.gps_points[0].timestamp)}
                  </Popup>
                </Marker>
                
                {/* Marker fine */}
                {sessionDetails.gps_points.length > 1 && (
                  <Marker 
                    position={[
                      sessionDetails.gps_points[sessionDetails.gps_points.length - 1].lat,
                      sessionDetails.gps_points[sessionDetails.gps_points.length - 1].lon
                    ]}
                  >
                    <Popup>
                      <strong>🏁 Fine</strong><br />
                      {formatDate(sessionDetails.gps_points[sessionDetails.gps_points.length - 1].timestamp)}
                    </Popup>
                  </Marker>
                )}
                
                {/* Marker eventi */}
                {events.map(event => {
                  const isHighlighted = highlightedEventId === event.id;
                  const markerIcon = getEventIcon(event.tipo);
                  
                  // Crea icona con classe CSS per animazione
                  const icon = L.divIcon({
                    html: `<div class="${isHighlighted ? 'highlighted-marker' : ''}" style="position: relative;">
                            <img src="${markerIcon.options.iconUrl}" 
                                 style="width: 25px; height: 41px; margin-left: -12px; margin-top: -41px;" />
                          </div>`,
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    className: ''
                  });
                  
                  return (
                    <Marker
                      key={event.id}
                      position={[event.lat, event.lon]}
                      icon={isHighlighted ? icon : markerIcon}
                    >
                      <Popup>
                        <div className="event-popup">
                          <strong>{getEventLabel(event.tipo)}</strong><br />
                          {event.descrizione && <span>{event.descrizione}<br /></span>}
                          <small>{formatDate(event.timestamp)}</small>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
            
            {/* Lista eventi */}
            {events.length > 0 && (
              <div className="events-panel">
                <h3>Eventi registrati</h3>
                <div className="events-list">
                  {events.map(event => (
                    <div 
                      key={event.id} 
                      className={`event-item ${event.tipo === 'manovra_corretta' ? 'success' : 'error'}`}
                      onClick={() => {
                        setSelectedEventLocation([event.lat, event.lon]);
                        setHighlightedEventId(event.id);
                        setTimeout(() => setHighlightedEventId(null), 3000);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="event-icon">
                        {event.tipo === 'manovra_corretta' ? '✓' : '❌'}
                      </div>
                      <div className="event-content">
                        <div className="event-title">{getEventLabel(event.tipo)}</div>
                        <div className="event-time">{formatDate(event.timestamp)}</div>
                        {event.video_url && (
                          <button
                            className="video-badge"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentVideoUrl(event.video_url);
                              setVideoModalOpen(true);
                            }}
                            style={{
                              background: '#2563eb',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              marginTop: '8px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            🎥 Guarda video
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state-main">
            <h2>Nessun dato disponibile per questa guida</h2>
          </div>
        )}
      </div>
      
      {/* Modal Video */}
      {videoModalOpen && currentVideoUrl && (
        <div className="video-modal-overlay" onClick={() => setVideoModalOpen(false)}>
          <div className="video-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setVideoModalOpen(false)}>✕</button>
            <h3>Video Evento</h3>
            <video 
              controls 
              autoPlay 
              style={{ width: '100%', maxHeight: '70vh', borderRadius: '8px' }}
            >
              <source src={currentVideoUrl} type="video/mp4" />
              Il tuo browser non supporta la riproduzione video.
            </video>
            <p style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
              Clip di 60 secondi (30s prima + 30s dopo l'evento)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
