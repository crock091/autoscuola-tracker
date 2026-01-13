import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css';

// ===== FILTRO KALMAN PER GPS =====
class KalmanFilter {
  constructor() {
    this.variance = -1; // Varianza processo
    this.minAccuracy = 1; // Accuratezza minima
  }

  filter(lat, lon, accuracy, timestamp) {
    if (accuracy < this.minAccuracy) accuracy = this.minAccuracy;
    if (this.variance < 0) {
      // Prima misura
      this.variance = accuracy * accuracy;
      this.lat = lat;
      this.lon = lon;
      this.timestamp = timestamp;
      return { lat, lon };
    }

    // Predizione
    const timeInc = timestamp - this.timestamp;
    if (timeInc > 0) {
      this.variance += (timeInc * 0.001); // Process noise
      this.timestamp = timestamp;
    }

    // Kalman gain
    const K = this.variance / (this.variance + accuracy * accuracy);

    // Update
    this.lat += K * (lat - this.lat);
    this.lon += K * (lon - this.lon);
    this.variance = (1 - K) * this.variance;

    return { lat: this.lat, lon: this.lon };
  }

  reset() {
    this.variance = -1;
  }
}

// ===== CALCOLO VELOCITÀ DA DISTANZA/TEMPO =====
function calculateSpeed(lat1, lon1, lat2, lon2, timeDiffMs) {
  // Formula Haversine per distanza in metri
  const R = 6371000; // Raggio Terra in metri
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // metri

  // Velocità = distanza / tempo (converti in km/h)
  const timeInSeconds = timeDiffMs / 1000;
  if (timeInSeconds <= 0) return 0;
  const speedMps = distance / timeInSeconds;
  return speedMps * 3.6; // Converti m/s a km/h
}

// ===== VALIDAZIONE DATI GPS =====
function isValidGPS(position, isFirstPoint = false) {
  const { latitude, longitude, accuracy } = position.coords;
  
  // Controlla coordinate valide
  if (!latitude || !longitude || 
      latitude < -90 || latitude > 90 || 
      longitude < -180 || longitude > 180) {
    return false;
  }
  
  // Accuracy progressiva: più permissiva all'inizio, poi più restrittiva
  const maxAccuracy = isFirstPoint ? 500 : 150; // 500m per primi punti, 150m dopo
  
  if (accuracy && accuracy > maxAccuracy) {
    console.warn('⚠️ GPS accuracy troppo bassa:', accuracy, 'm (max:', maxAccuracy, 'm)');
    return false;
  }
  
  return true;
}

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

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Componente per centrare la mappa sulla posizione corrente o su eventi
function MapController({ center, zoom, position }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 17);
    } else if (position) {
      map.setView(position, map.getZoom());
    }
  }, [center, zoom, position, map]);
  
  return null;
}

function App() {
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [currentPosition, setCurrentPosition] = useState([41.9028, 12.4964]); // Roma default per iOS
  const [route, setRoute] = useState([]);
  const [watchId, setWatchId] = useState(null);
  const sessionIdRef = useRef(null);
  const [viewMode, setViewMode] = useState('live'); // 'live' o 'history'
  const [pastSessions, setPastSessions] = useState([]);
  const [selectedPastSession, setSelectedPastSession] = useState(null);
  const [pastSessionDetails, setPastSessionDetails] = useState(null);
  const [pastEvents, setPastEvents] = useState([]);
  const [gpsReady, setGpsReady] = useState(false);
  const [gpsRequested, setGpsRequested] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [historySidebarOpen, setHistorySidebarOpen] = useState(true); // Sidebar aperta all'inizio per vedere le guide
  const [selectedEventLocation, setSelectedEventLocation] = useState(null);
  const [highlightedEventId, setHighlightedEventId] = useState(null); // ID evento evidenziato
  const [currentSpeed, setCurrentSpeed] = useState(0); // Velocità in km/h
  const [speedLimit, setSpeedLimit] = useState(null); // Limite di velocità della strada
  const lastSpeedCheckRef = useRef(null); // Ultima posizione per cui abbiamo controllato il limite
  const [videoModalOpen, setVideoModalOpen] = useState(false); // Modal video
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null); // URL video corrente
  const kalmanFilter = useRef(new KalmanFilter()); // Filtro Kalman per GPS
  const lastGPSPoint = useRef(null); // Ultimo punto GPS per calcolo velocità
  const speedHistory = useRef([]); // Storia velocità per media mobile
  
  // Funzione per ottenere il limite di velocità dalla strada (Overpass API)
  const fetchSpeedLimit = async (lat, lon) => {
    try {
      // Evita di fare troppe richieste - controlla solo se ci siamo spostati di almeno 50m
      if (lastSpeedCheckRef.current) {
        const distance = Math.sqrt(
          Math.pow((lat - lastSpeedCheckRef.current.lat) * 111000, 2) +
          Math.pow((lon - lastSpeedCheckRef.current.lon) * 111000, 2)
        );
        if (distance < 50) return; // Meno di 50m, non ricontrolla
      }
      
      lastSpeedCheckRef.current = { lat, lon };
      
      const query = `
        [out:json];
        way(around:30,${lat},${lon})["highway"]["maxspeed"];
        out tags;
      `;
      
      // Timeout di 5 secondi per la richiesta
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        headers: {
          'Content-Type': 'text/plain'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Verifica se la risposta è OK prima di parsare
      if (!response.ok) {
        console.warn('Overpass API errore:', response.status, response.statusText);
        return;
      }
      
      // Verifica che la risposta sia JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Overpass API ha ritornato un formato non-JSON');
        return;
      }
      
      const data = await response.json();
      
      if (data.elements && data.elements.length > 0) {
        const maxspeed = data.elements[0].tags.maxspeed;
        // Parsing del limite (può essere "50", "50 km/h", "IT:urban", etc.)
        let limit = null;
        if (maxspeed) {
          if (maxspeed === 'IT:urban') limit = 50;
          else if (maxspeed === 'IT:rural') limit = 90;
          else if (maxspeed === 'IT:motorway') limit = 130;
          else {
            const parsed = parseInt(maxspeed);
            if (!isNaN(parsed)) limit = parsed;
          }
        }
        setSpeedLimit(limit);
        console.log('🚦 Limite velocità rilevato:', limit, 'km/h');
      } else {
        console.log('⚠️ Nessun limite velocità trovato per questa strada');
        setSpeedLimit(null);
      }
    } catch (error) {
      // Gestione specifica degli errori
      if (error.name === 'AbortError') {
        console.warn('⏱️ Timeout recupero limite velocità (richiesta annullata dopo 5s)');
      } else if (error instanceof SyntaxError) {
        console.error('❌ Errore parsing risposta Overpass API (formato non valido):', error.message);
      } else {
        console.error('❌ Errore recupero limite velocità:', error.message);
      }
      // Non bloccare l'app, continua senza limite di velocità
      setSpeedLimit(null);
    }
  };
  
  // Funzione per richiedere GPS (serve user gesture su iOS)
  const requestGPS = () => {
    if (!('geolocation' in navigator)) {
      setGpsError('GPS non supportato dal browser');
      return;
    }
    
    setGpsRequested(true);
    setGpsError(null);
    console.log('🔍 Richiesta GPS...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ GPS ricevuto:', position.coords.latitude, position.coords.longitude);
        const pos = [position.coords.latitude, position.coords.longitude];
        setCurrentPosition(pos);
        setGpsReady(true);
        setGpsError(null);
      },
      (error) => {
        console.error('❌ Errore GPS:', error.code, error.message);
        setGpsRequested(false);
        let msg = 'Errore GPS';
        if (error.code === 1) msg = 'Permesso GPS negato.\n\nVai in:\nImpostazioni > Safari > Posizione\ne attiva "Chiedi" o "Consenti"';
        if (error.code === 2) msg = 'Posizione non disponibile.';
        if (error.code === 3) msg = 'Timeout GPS. Sei all\'aperto?';
        setGpsError(msg);
      },
      { 
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      }
    );
  };
  
  // Non richiedere GPS automaticamente - solo quando l'utente preme il pulsante
  // useEffect(() => {
  //   requestGPS();
  // }, []);
  
  // Avvia tracking GPS
  const startTracking = () => {
    if ('geolocation' in navigator) {
      console.log('🌍 Avvio geolocalizzazione...');
      const id = navigator.geolocation.watchPosition(
        async (position) => {
          // Validazione dati GPS (più permissiva per i primi punti)
          const isFirst = !lastGPSPoint.current;
          if (!isValidGPS(position, isFirst)) {
            console.warn('⚠️ Dati GPS non validi, salto questo punto');
            return;
          }

          console.log('📍 Posizione ricevuta:', position.coords.latitude, position.coords.longitude, 
                      'Accuracy:', position.coords.accuracy, 'm');
          
          // Applica filtro Kalman
          const timestamp = position.timestamp || Date.now();
          const filtered = kalmanFilter.current.filter(
            position.coords.latitude,
            position.coords.longitude,
            position.coords.accuracy || 10,
            timestamp
          );
          
          const pos = [filtered.lat, filtered.lon];
          setCurrentPosition(pos);
          setRoute(prev => [...prev, pos]);
          
          // Calcolo velocità intelligente
          let speedKmh = 0;
          if (lastGPSPoint.current) {
            const timeDiff = timestamp - lastGPSPoint.current.timestamp;
            if (timeDiff > 0) {
              speedKmh = calculateSpeed(
                lastGPSPoint.current.lat,
                lastGPSPoint.current.lon,
                filtered.lat,
                filtered.lon,
                timeDiff
              );
              
              // Limita velocità massima (ignora valori anomali > 200 km/h)
              if (speedKmh > 200) {
                console.warn('⚠️ Velocità anomala rilevata:', speedKmh, 'km/h');
                speedKmh = lastGPSPoint.current.speed || 0;
              }
              
              // Media mobile su ultimi 3 punti per smoothing
              speedHistory.current.push(speedKmh);
              if (speedHistory.current.length > 3) {
                speedHistory.current.shift();
              }
              const avgSpeed = speedHistory.current.reduce((a, b) => a + b, 0) / speedHistory.current.length;
              speedKmh = Math.round(avgSpeed);
            }
          }
          
          setCurrentSpeed(speedKmh);
          lastGPSPoint.current = { lat: filtered.lat, lon: filtered.lon, timestamp, speed: speedKmh };
          
          // Rileva limite di velocità della strada
          fetchSpeedLimit(filtered.lat, filtered.lon);
          
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
                  velocita: speedKmh / 3.6, // Salva in m/s
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
      
      // Reset filtro Kalman per nuova sessione
      kalmanFilter.current.reset();
      lastGPSPoint.current = null;
      speedHistory.current = [];
      
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
      
      const data = await response.json();
      console.log('Sessione creata:', data);
      const newSessionId = data[0].id;
      setSessionId(newSessionId);
      sessionIdRef.current = newSessionId;
      setSessionActive(true);
      setRoute([]);
      
      // Registra evento inizio guida
      if (currentPosition) {
        await fetch(`${API_URL}/events`, {
          method: 'POST',
          headers: supabaseHeaders,
          body: JSON.stringify({
            session_id: newSessionId,
            tipo: 'inizio_guida',
            descrizione: 'Inizio della guida',
            location: `POINT(${currentPosition[1]} ${currentPosition[0]})`,
            timestamp: new Date().toISOString()
          })
        });
      }
      
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
      // Registra evento fine guida prima di terminare
      if (currentPosition && sessionId) {
        await fetch(`${API_URL}/events`, {
          method: 'POST',
          headers: supabaseHeaders,
          body: JSON.stringify({
            session_id: sessionId,
            tipo: 'fine_guida',
            descrizione: 'Fine della guida',
            location: `POINT(${currentPosition[1]} ${currentPosition[0]})`,
            timestamp: new Date().toISOString()
          })
        });
      }
      
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
      alert('✅ Sessione terminata con successo');
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

  // Cancella sessione
  const deleteSession = async (sessionId) => {
    if (!confirm('Sei sicuro di voler cancellare questa guida? L\'operazione non può essere annullata.')) {
      return;
    }
    
    try {
      // Prima cancella GPS points (CASCADE dovrebbe farlo automaticamente ma per sicurezza)
      await fetch(`${API_URL}/gps_points?session_id=eq.${sessionId}`, {
        method: 'DELETE',
        headers: supabaseHeaders
      });
      
      // Cancella eventi
      await fetch(`${API_URL}/events?session_id=eq.${sessionId}`, {
        method: 'DELETE',
        headers: supabaseHeaders
      });
      
      // Cancella sessione
      const response = await fetch(`${API_URL}/sessions?id=eq.${sessionId}`, {
        method: 'DELETE',
        headers: supabaseHeaders
      });
      
      if (response.ok) {
        alert('✅ Guida cancellata');
        if (selectedPastSession === sessionId) {
          setSelectedPastSession(null);
          setPastSessionDetails(null);
          setPastEvents([]);
        }
        loadPastSessions();
      } else {
        throw new Error('Errore nella cancellazione');
      }
    } catch (error) {
      console.error('Errore cancellazione:', error);
      alert('❌ Errore durante la cancellazione');
    }
  };

  // Carica dettagli guida passata
  const loadPastSessionDetails = async (sessionId) => {
    try {
      // Usa RPC con conversione coordinate lato server
      const gpsResponse = await fetch(
        `${API_URL}/rpc/get_session_gps_with_coords`,
        {
          method: 'POST',
          headers: supabaseHeaders,
          body: JSON.stringify({ session_id_param: sessionId })
        }
      );
      const gpsPoints = await gpsResponse.json();
      
      // Rinomina ts -> timestamp per compatibilità
      const gpsPointsFormatted = gpsPoints.map(p => ({ ...p, timestamp: p.ts }));
      
      setPastSessionDetails({ gps_points: gpsPointsFormatted });
      
      // Usa RPC con conversione coordinate lato server per eventi
      const eventsResponse = await fetch(
        `${API_URL}/rpc/get_session_events_with_coords`,
        {
          method: 'POST',
          headers: supabaseHeaders,
          body: JSON.stringify({ session_id_param: sessionId })
        }
      );
      const events = await eventsResponse.json();
      
      // Rinomina ts -> timestamp per compatibilità
      const eventsFormatted = events.map(e => ({ ...e, timestamp: e.ts }));
      
      setPastEvents(eventsFormatted);
    } catch (error) {
      console.error('❌ Errore caricamento dettagli:', error);
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setViewMode('live')}
              style={{
                padding: '14px',
                backgroundColor: viewMode === 'live' ? '#2563eb' : '#f3f4f6',
                color: viewMode === 'live' ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '1.3rem',
                minWidth: '52px',
                minHeight: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: viewMode === 'live' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                transition: 'all 0.2s'
              }}
              title="Guida Live">
              📍
            </button>
            <button 
              onClick={() => setViewMode('history')}
              style={{
                padding: '14px',
                backgroundColor: viewMode === 'history' ? '#2563eb' : '#f3f4f6',
                color: viewMode === 'history' ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '1.3rem',
                minWidth: '52px',
                minHeight: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: viewMode === 'history' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                transition: 'all 0.2s'
              }}
              title="Storico">
              📋
            </button>
          </div>

          {viewMode === 'live' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {!sessionActive ? (
                <button 
                  onClick={startSession}
                  style={{
                    padding: '14px 24px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    minHeight: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.2s'
                  }}
                  title="Inizia Guida">
                  ▶️
                </button>
              ) : (
                <button 
                  onClick={endSession}
                  style={{
                    padding: '14px 24px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    minHeight: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                    transition: 'all 0.2s'
                  }}
                  title="Termina Guida">
                  ⏹️
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {viewMode === 'live' ? (
        <>
          <div className="map-container">
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
              <MapController position={currentPosition} />
            </MapContainer>
            
            {/* Indicatore velocità */}
            {gpsReady && sessionActive && (
              <div 
                className="speed-indicator"
                style={{
                  background: (() => {
                    if (speedLimit && currentSpeed > speedLimit) return 'rgba(239, 68, 68, 0.95)'; // Rosso se supera il limite
                    if (speedLimit && currentSpeed > speedLimit - 5) return 'rgba(245, 158, 11, 0.95)'; // Arancione se vicino al limite
                    return 'rgba(16, 185, 129, 0.95)'; // Verde altrimenti
                  })()
                }}>
                <div style={{ fontSize: '0.7rem', marginBottom: '5px', opacity: 0.9 }}>VELOCITÀ</div>
                <div style={{ fontSize: '2rem', lineHeight: '1' }}>
                  {currentSpeed}
                  {speedLimit && (
                    <span style={{ fontSize: '1.2rem', opacity: 0.7 }}> / {speedLimit}</span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>km/h</div>
                {!speedLimit && (
                  <div style={{ fontSize: '0.6rem', marginTop: '5px', opacity: 0.6 }}>Rilevamento limite...</div>
                )}
              </div>
            )}
            
            {!gpsReady && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(255, 255, 255, 0.98)',
                color: '#1f2937',
                padding: '30px',
                borderRadius: '16px',
                zIndex: 1000,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                textAlign: 'center',
                maxWidth: '90%'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                  {gpsError ? '⚠️' : '📍'}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {gpsError ? 'Errore GPS' : gpsRequested ? 'Rilevamento GPS...' : 'Attiva GPS'}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '1.5rem', whiteSpace: 'pre-line' }}>
                  {gpsError || (gpsRequested ? 'Attendi qualche secondo' : 'Tocca il pulsante per attivare la posizione')}
                </div>
                {!gpsRequested && (
                  <button 
                    onClick={requestGPS}
                    style={{
                      padding: '12px 32px',
                      background: gpsError ? '#dc2626' : '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: gpsError ? '0 4px 12px rgba(220, 38, 38, 0.3)' : '0 4px 12px rgba(37, 99, 235, 0.3)'
                    }}
                  >
                    {gpsError ? 'Riprova' : 'Attiva GPS'}
                  </button>
                )}
              </div>
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
            onClick={() => {
              if (speedLimit) {
                reportEvent('eccesso_velocita', `Eccesso di velocità: ${currentSpeed} km/h (limite: ${speedLimit} km/h)`);
              } else {
                reportEvent('eccesso_velocita', `Eccesso di velocità: ${currentSpeed} km/h`);
              }
            }}
            className="btn-event btn-error"
            disabled={currentSpeed === 0}
            style={{ 
              opacity: currentSpeed === 0 ? 0.5 : 1,
              cursor: currentSpeed === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            🚨 Eccesso Velocità
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
        <>
          {/* Hamburger menu (visibile sempre quando sidebar chiusa) */}
          {!historySidebarOpen && (
            <button 
              className="history-toggle"
              onClick={() => setHistorySidebarOpen(true)}>
              ☰
            </button>
          )}
          
          {/* Sidebar con guide passate */}
          <div className={`history-sidebar ${historySidebarOpen ? 'open' : ''}`}>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>Guide Passate</h3>
                <button 
                  onClick={() => setHistorySidebarOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '0',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Chiudi"
                >
                  ✕
                </button>
              </div>
              {pastSessions.map(session => (
                <div 
                  key={session.id}
                  onClick={() => {
                    setSelectedPastSession(session.id);
                    setHistorySidebarOpen(false);
                  }}
                  style={{
                    padding: '15px',
                    marginBottom: '10px',
                    backgroundColor: selectedPastSession === session.id ? '#e3f2fd' : 'white',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    position: 'relative'
                  }}>
                  <div><strong>{new Date(new Date(session.inizio).getTime() + 60*60*1000).toLocaleDateString('it-IT')}</strong></div>
                  <div style={{fontSize: '0.85em', color: '#666'}}>
                    {new Date(new Date(session.inizio).getTime() + 60*60*1000).toLocaleTimeString('it-IT')} - {session.fine ? new Date(new Date(session.fine).getTime() + 60*60*1000).toLocaleTimeString('it-IT') : 'In corso'}
                  </div>
                  <div style={{fontSize: '0.85em', color: '#666'}}>
                    Allievo ID: {session.allievo_id}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                    title="Cancella guida"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {/* Contenuto principale: mappa e lista eventi */}
          <div style={{ 
            display: 'flex',
            height: 'calc(100vh - 150px)',
            position: 'relative'
          }}>
            {/* Mappa e pannello eventi mobile */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {selectedPastSession && pastSessionDetails ? (
                <>
                  <div className="map-wrapper">
                    <MapContainer 
                      center={pastSessionDetails.gps_points && pastSessionDetails.gps_points.length > 0 ? [pastSessionDetails.gps_points[0].lat, pastSessionDetails.gps_points[0].lon] : [45.4642, 9.1900]}
                      zoom={15} 
                      style={{ height: '100%', width: '100%' }}
                      key={selectedPastSession}>
                      <MapController center={selectedEventLocation} zoom={17} />
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                      />
                      {pastSessionDetails.gps_points && pastSessionDetails.gps_points.length > 0 && (
                        <Polyline 
                          positions={pastSessionDetails.gps_points.map(p => [p.lat, p.lon])}
                          color="blue"
                          weight={4}
                        />
                      )}
                      {pastEvents.map((event, idx) => {
                        const isHighlighted = highlightedEventId === event.id;
                        const isStartEnd = event.tipo === 'inizio_guida' || event.tipo === 'fine_guida';
                        
                        // Seleziona icona: blu per inizio/fine, verde per manovre corrette, rossa per errori
                        let markerIcon;
                        if (isStartEnd) {
                          markerIcon = blueIcon;
                        } else {
                          markerIcon = event.tipo === 'manovra_corretta' ? successIcon : errorIcon;
                        }
                        
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
                        
                        // Formatta data: per inizio/fine mostra solo data, per altri eventi data e ora
                        const eventDate = new Date(new Date(event.timestamp).getTime() + 60*60*1000);
                        const formattedDate = isStartEnd 
                          ? eventDate.toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })
                          : eventDate.toLocaleString('it-IT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                        
                        return (
                          <Marker 
                            key={idx} 
                            position={[event.lat, event.lon]}
                            icon={isHighlighted ? icon : markerIcon}
                          >
                            <Popup>
                              <strong>{event.tipo.replace(/_/g, ' ').toUpperCase()}</strong><br/>
                              {event.descrizione}<br/>
                              {formattedDate}
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                  </div>
                  
                  {/* Pannello eventi mobile */}
                  {pastEvents.length > 0 && (
                    <div className="events-panel">
                      <h3>Eventi registrati ({pastEvents.length})</h3>
                      <div className="events-list">
                        {pastEvents.map((event, idx) => {
                          const isStartEnd = event.tipo === 'inizio_guida' || event.tipo === 'fine_guida';
                          const eventDate = new Date(new Date(event.timestamp).getTime() + 60*60*1000);
                          const formattedTime = isStartEnd 
                            ? eventDate.toLocaleDateString('it-IT', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })
                            : eventDate.toLocaleTimeString('it-IT');
                          
                          // Classe CSS e icona in base al tipo
                          let cssClass, icon;
                          if (isStartEnd) {
                            cssClass = 'info'; // blu per inizio/fine
                            icon = '🔵';
                          } else if (event.tipo === 'manovra_corretta') {
                            cssClass = 'success'; // verde
                            icon = '✓';
                          } else {
                            cssClass = 'error'; // rosso
                            icon = '❌';
                          }
                          
                          return (
                          <div 
                            key={idx}
                            className={`event-item ${cssClass}`}
                            onClick={() => {
                              setSelectedEventLocation([event.lat, event.lon]);
                              setHighlightedEventId(event.id);
                              setTimeout(() => setHighlightedEventId(null), 3000);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="event-icon">
                              {icon}
                            </div>
                            <div className="event-content">
                              <div className="event-title">{event.tipo.replace(/_/g, ' ').toUpperCase()}</div>
                              <div className="event-time">{formattedTime}</div>
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
                        );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <p>Seleziona una guida per vedere il percorso</p>
                </div>
              )}
            </div>

            {/* Lista eventi (desktop only) */}
            {selectedPastSession && pastEvents.length > 0 && (
              <div style={{ 
                width: '300px', 
                borderLeft: '1px solid #ddd', 
                paddingLeft: '15px', 
                paddingRight: '15px',
                overflowY: 'auto',
                flexShrink: 0,
                backgroundColor: '#f9f9f9'
              }}>
                <h3 style={{ marginTop: '15px' }}>Eventi Segnalati ({pastEvents.length})</h3>
                {pastEvents.map((event, idx) => {
                  const isStartEnd = event.tipo === 'inizio_guida' || event.tipo === 'fine_guida';
                  const eventDate = new Date(new Date(event.timestamp).getTime() + 60*60*1000);
                  const formattedTime = isStartEnd 
                    ? eventDate.toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })
                    : eventDate.toLocaleTimeString('it-IT');
                  
                  // Colori per inizio/fine guida (blu), manovre corrette (verde), errori (rosso)
                  let bgColor, borderColor, textColor, icon;
                  if (isStartEnd) {
                    bgColor = '#e3f2fd';
                    borderColor = '#2196f3';
                    textColor = '#1565c0';
                    icon = '🔵';
                  } else if (event.tipo === 'manovra_corretta') {
                    bgColor = '#e8f5e9';
                    borderColor = '#4caf50';
                    textColor = '#2e7d32';
                    icon = '✅';
                  } else {
                    bgColor = '#ffebee';
                    borderColor = '#f44336';
                    textColor = '#c62828';
                    icon = '⚠️';
                  }
                  
                  return (
                  <div 
                    key={idx}
                    onClick={() => {
                      setSelectedEventLocation([event.lat, event.lon]);
                      setHighlightedEventId(event.id);
                      setTimeout(() => setHighlightedEventId(null), 3000);
                    }}
                    style={{
                      padding: '12px',
                      marginBottom: '10px',
                      backgroundColor: bgColor,
                      border: `2px solid ${borderColor}`,
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      marginBottom: '5px',
                      color: textColor
                    }}>
                      {icon} {event.tipo.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.9em', marginBottom: '5px' }}>
                      {event.descrizione}
                    </div>
                    <div style={{ fontSize: '0.8em', color: '#666' }}>
                      {formattedTime}
                    </div>
                    {event.video_url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentVideoUrl(event.video_url);
                          setVideoModalOpen(true);
                        }}
                        style={{
                          background: '#2563eb',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          marginTop: '8px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          width: '100%'
                        }}
                      >
                        🎥 Guarda video
                      </button>
                    )}
                  </div>
                );
                })}
              </div>
            )}
          </div>
        </>
      )}
      
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
