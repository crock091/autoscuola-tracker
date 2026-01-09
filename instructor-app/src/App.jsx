import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css';

// Fix per icona marker default di Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API_URL = 'https://wokjywwzgyrgkiriyvyj.supabase.co/rest/v1';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indva2p5d3d6Z3lyZ2tpcml5dnlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NDQzNzMsImV4cCI6MjA4MzUyMDM3M30.o6UVvuR3yOfyhG00-0FUsz6V6vC_qSzPG44TrEMCKA4';

const supabaseHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// Icone per gli eventi
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

// Componente per centrare la mappa sulla posizione corrente
function MapUpdater({ position }) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);
  
  return null;
}

function App() {
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [route, setRoute] = useState([]);
  const [watchId, setWatchId] = useState(null);
  const sessionIdRef = useRef(null);
  const [viewMode, setViewMode] = useState('live'); // 'live' o 'history'
  const [pastSessions, setPastSessions] = useState([]);
  const [selectedPastSession, setSelectedPastSession] = useState(null);
  const [pastSessionDetails, setPastSessionDetails] = useState(null);
  const [pastEvents, setPastEvents] = useState([]);
  
  // Richiedi permessi geolocalizzazione all'avvio
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = [position.coords.latitude, position.coords.longitude];
          setCurrentPosition(pos);
        },
        (error) => console.error('Errore geolocalizzazione:', error),
        { enableHighAccuracy: true }
      );
    }
  }, []);
  
  // Avvia tracking GPS
  const startTracking = () => {
    if ('geolocation' in navigator) {
      console.log('🌍 Avvio geolocalizzazione...');
      const id = navigator.geolocation.watchPosition(
        async (position) => {
          console.log('📍 Posizione ricevuta:', position.coords.latitude, position.coords.longitude);
          const pos = [position.coords.latitude, position.coords.longitude];
          setCurrentPosition(pos);
          setRoute(prev => [...prev, pos]);
          
          // Invia punto GPS al backend
          if (sessionIdRef.current) {
            try {
              console.log('💾 Salvataggio GPS point per session:', sessionIdRef.current);
              const gpsResponse = await fetch(`${API_URL}/gps_points`, {
                method: 'POST',
                headers: supabaseHeaders,
                body: JSON.stringify({
                  session_id: sessionIdRef.current,
                  location: `POINT(${pos[1]} ${pos[0]})`,
                  velocita: position.coords.speed || 0,
                  timestamp: new Date().toISOString()
                })
              });
              if (!gpsResponse.ok) {
                const error = await gpsResponse.text();
                console.error('❌ Errore salvataggio GPS:', error);
              } else {
                console.log('✓ GPS point salvato');
              }new Date().toISOString
            } catch (error) {
              console.error('❌ Errore invio GPS:', error);
            }
          } else {
            console.log('⚠️ sessionId non ancora disponibile');
          }
        },
        (error) => {
          console.error('❌ Errore tracking:', error.message, error.code);
          if (error.code === 1) {
            alert('⚠️ Permesso posizione negato. Abilita la geolocalizzazione nelle impostazioni del browser.');
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000
        }
      );
      setWatchId(id);
    } else {
      console.error('❌ Geolocalizzazione non supportata');
      alert('⚠️ Il tuo browser non supporta la geolocalizzazione');
    }
  };
  
  // Ferma tracking GPS
  const stopTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };
  
  // Inizia sessione
  const startSession = async () => {
    try {
      console.log('Avvio sessione...');
      const response = await fetch(`${API_URL}/sessions`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({
          istruttore_id: 1,
          allievo_id: 2,
          inizio: new Date().toISOString(),
          stato: 'in_corso'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }
      new Date().toISOString
      const data = await response.json();
      console.log('Sessione creata:', data);
      const newSessionId = data[0].id;
      setSessionId(newSessionId);
      sessionIdRef.current = newSessionId;
      setSessionActive(true);
      setRoute([]);
      startTracking();
      alert(`✅ Guida iniziata! ID sessione: ${newSessionId}`);
    } catch (error) {
      console.error('Errore avvio sessione:', error);
      alert(`❌ Errore avvio sessione: ${error.message}`);
    }
  };
  
  // Termina sessione
  const endSession = async () => {
    try {
      await fetch(`${API_URL}/sessions?id=eq.${sessionId}`, {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify({
          fine: new Date().toISOString(),
          stato: 'completata'
        })
      });
      stopTracking();
      setSessionActive(false);
      setSessionId(null);
      sessionIdRef.current = null;
      alert('Sesnew Date().toISOString successo');
    } catch (error) {
      console.error('Errore fine sessione:', error);
    }
  };
  
  // Segnala evento
  const reportEvent = async (tipo, descrizione) => {
    console.log('reportEvent chiamato:', { tipo, descrizione, currentPosition, sessionId });
    
    if (!currentPosition) {
      alert('❌ Posizione GPS non disponibile');
      return;
    }
    
    if (!sessionId) {
      alert('❌ Nessuna sessione attiva. Avvia prima una guida!');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({
          session_id: sessionId,
          tipo,
          descrizione,
          location: `POINT(${currentPosition[1]} ${currentPosition[0]})`,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Errore dettagliato:', errorText);
        throw new Error(`Errore HTTP: ${response.status}`);
      }new Date().toISOString
      
      alert(`✓ ${descrizione} segnalato`);
    } catch (error) {
      console.error('Errore segnalazione evento:', error);
      alert(`❌ Errore: ${error.message}`);
    }
  };

  // Carica guide passate
  const loadPastSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/sessions?istruttore_id=eq.1&order=inizio.desc&limit=20`, {
        headers: supabaseHeaders
      });
      const data = await response.json();
      setPastSessions(data);
    } catch (error) {
      console.error('Errore caricamento guide passate:', error);
    }
  };

  // Carica dettagli guida passata
  const loadPastSessionDetails = async (sessionId) => {
    try {
      // Carica GPS points
      const gpsResponse = await fetch(`${API_URL}/rpc/get_gps_points`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({ p_session_id: sessionId })
      });
      const gpsPoints = await gpsResponse.json();
      
      setPastSessionDetails({
        gps_points: gpsPoints.map(p => ({ ...p, timestamp: p.ts }))
      });
      
      // Carica eventi
      const eventsResponse = await fetch(`${API_URL}/rpc/get_events`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({ p_session_id: sessionId })
      });
      const events = await eventsResponse.json();
      setPastEvents(events.map(e => ({ ...e, timestamp: e.ts })));
    } catch (error) {
      console.error('Errore caricamento dettagli:', error);
    }
  };

  useEffect(() => {
    if (viewMode === 'history') {
      loadPastSessions();
    }
  }, [viewMode]);

  useEffect(() => {
    if (selectedPastSession) {
      loadPastSessionDetails(selectedPastSession);
    }
  }, [selectedPastSession]);
  
  return (
    <div className="app">
      <div className="header">
        <h1>🚗 Autoscuola Tracker</h1>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button 
            onClick={() => setViewMode('live')}
            style={{
              padding: '10px 20px',
              backgroundColor: viewMode === 'live' ? '#4CAF50' : '#ddd',
              color: viewMode === 'live' ? 'white' : 'black',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}>
            📍 Guida Live
          </button>
          <button 
            onClick={() => setViewMode('history')}
            style={{
              padding: '10px 20px',
              backgroundColor: viewMode === 'history' ? '#4CAF50' : '#ddd',
              color: viewMode === 'history' ? 'white' : 'black',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}>
            📋 Storico
          </button>
        </div>

        {viewMode === 'live' && (
          <div className="session-controls">
          {!sessionActive ? (
            <button onClick={startSession} className="btn btn-start">
              Inizia Guida
            </button>
          ) : (
            <button onClick={endSession} className="btn btn-end">
              Termina Guida
            </button>
          )}
        </div>
        )}
      </div>
      
      {viewMode === 'live' ? (
        <>
          <div className="map-container">
        {currentPosition ? (
          <MapContainer
            center={currentPosition}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={currentPosition} />
            {route.length > 1 && (
              <Polyline positions={route} color="blue" weight={4} />
            )}
            <MapUpdater position={currentPosition} />
          </MapContainer>
        ) : (
          <div className="loading">Caricamento mappa...</div>
        )}
      </div>
      
      {sessionActive && (
        <div className="event-buttons">
          <button 
            onClick={() => reportEvent('precedenza_pedoni', 'Precedenza pedoni saltata')}
            className="btn-event btn-error"
          >
            ❌ Precedenza Pedoni
          </button>
          <button 
            onClick={() => reportEvent('stop', 'Stop non rispettato')}
            className="btn-event btn-error"
          >
            ⚠️ Stop
          </button>
          <button 
            onClick={() => reportEvent('semaforo', 'Semaforo rosso')}
            className="btn-event btn-error"
          >
            🚦 Semaforo
          </button>
          <button 
            onClick={() => reportEvent('distanza', 'Distanza di sicurezza non rispettata')}
            className="btn-event btn-error"
          >
            🚗 Distanza
          </button>
          <button 
            onClick={() => reportEvent('manovra_corretta', 'Manovra eseguita bene')}
            className="btn-event btn-success"
          >
            ✅ Manovra OK
          </button>
        </div>
      )}
        </>
      ) : (
        <div style={{ padding: '20px', display: 'flex', height: 'calc(100vh - 150px)', gap: '10px' }}>
          <div style={{ width: '250px', borderRight: '1px solid #ddd', overflowY: 'auto', paddingRight: '10px', flexShrink: 0 }}>
            <h3>Guide Passate</h3>
            {pastSessions.map(session => (
              <div 
                key={session.id}
                onClick={() => setSelectedPastSession(session.id)}
                style={{
                  padding: '10px',
                  marginBottom: '10px',
                  backgroundColor: selectedPastSession === session.id ? '#e3f2fd' : 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                <div><strong>{new Date(new Date(session.inizio).getTime() + 60*60*1000).toLocaleDateString('it-IT')}</strong></div>
                <div style={{fontSize: '0.85em', color: '#666'}}>
                  {new Date(new Date(session.inizio).getTime() + 60*60*1000).toLocaleTimeString('it-IT')} - {session.fine ? new Date(new Date(session.fine).getTime() + 60*60*1000).toLocaleTimeString('it-IT') : 'In corso'}
                </div>
                <div style={{fontSize: '0.85em', color: '#666'}}>
                  Allievo ID: {session.allievo_id}
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ flex: 1, position: 'relative' }}>
            {selectedPastSession && pastSessionDetails ? (
              <MapContainer 
                center={pastSessionDetails.gps_points[0] ? [pastSessionDetails.gps_points[0].lat, pastSessionDetails.gps_points[0].lon] : [45.4642, 9.1900]}
                zoom={15} 
                style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                {pastSessionDetails.gps_points.length > 0 && (
                  <Polyline 
                    positions={pastSessionDetails.gps_points.map(p => [p.lat, p.lon])}
                    color="blue"
                    weight={4}
                  />
                )}
                {pastEvents.map((event, idx) => (
                  <Marker 
                    key={idx} 
                    position={[event.lat, event.lon]}
                    icon={event.tipo === 'manovra_corretta' ? successIcon : errorIcon}
                  >
                    <Popup>
                      <strong>{event.tipo}</strong><br/>
                      {event.descrizione}<br/>
                      {new Date(event.timestamp).toLocaleString()}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p>Seleziona una guida per vedere il percorso</p>
              </div>
            )}
          </div>

          {selectedPastSession && pastEvents.length > 0 && (
            <div style={{ 
              width: '300px', 
              borderLeft: '1px solid #ddd', 
              paddingLeft: '15px', 
              overflowY: 'auto',
              flexShrink: 0,
              backgroundColor: '#f9f9f9'
            }}>
              <h3 style={{ marginTop: 0 }}>Eventi Segnalati ({pastEvents.length})</h3>
              {pastEvents.map((event, idx) => (
                <div 
                  key={idx}
                  style={{
                    padding: '12px',
                    marginBottom: '10px',
                    backgroundColor: event.tipo === 'manovra_corretta' ? '#e8f5e9' : '#ffebee',
                    border: `2px solid ${event.tipo === 'manovra_corretta' ? '#4caf50' : '#f44336'}`,
                    borderRadius: '8px'
                  }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: event.tipo === 'manovra_corretta' ? '#2e7d32' : '#c62828'
                  }}>
                    {event.tipo === 'manovra_corretta' ? '✅' : '⚠️'} {event.tipo.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div style={{ fontSize: '0.9em', marginBottom: '5px' }}>
                    {event.descrizione}
                  </div>
                  <div style={{ fontSize: '0.8em', color: '#666' }}>
                    {new Date(new Date(event.timestamp).getTime() + 60*60*1000).toLocaleTimeString('it-IT')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
