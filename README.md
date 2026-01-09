# 🚗 Autoscuola Tracker

Applicazione completa per il monitoraggio delle guide nella tua autoscuola. Permette agli istruttori di tracciare i percorsi GPS e segnalare eventi in tempo reale, mentre gli allievi possono visualizzare le proprie guide con feedback dettagliati.

## ✨ Funzionalità

### App Istruttore (PWA)
- ✅ Tracking GPS in tempo reale del percorso
- ✅ Segnalazione eventi con un click (precedenze, stop, semafori, ecc.)
- ✅ Funziona offline con Service Workers
- ✅ Installabile come app su smartphone
- ✅ Inizio/fine sessione di guida

### Dashboard Allievo
- 📍 Visualizzazione percorso completo su mappa interattiva
- 🎯 Marker colorati per ogni evento (errori in rosso, manovre corrette in verde)
- 📊 Statistiche sessione (durata, numero eventi)
- 📅 Storico di tutte le guide effettuate
- 🔍 Dettagli completi di ogni evento con timestamp e posizione

### Backend API
- 🔐 Sistema di autenticazione JWT
- 🗄️ Database PostgreSQL con PostGIS per dati geospaziali
- 🚀 API REST per gestione sessioni, GPS, eventi
- 📈 Query ottimizzate con indici spaziali

## 🛠️ Tecnologie

- **Frontend**: React 18 + Vite
- **Mappe**: Leaflet + OpenStreetMap (100% gratuito)
- **Backend**: Node.js + Express
- **Database**: PostgreSQL + PostGIS
- **PWA**: Service Workers, Web App Manifest

## 📦 Installazione

### Prerequisiti
- Node.js 18+ 
- PostgreSQL 14+ con estensione PostGIS
- npm o yarn

### 1. Clona il repository
```bash
git clone <url-repository>
cd driving-school-tracker
```

### 2. Setup Backend

```bash
cd backend
npm install

# Copia e configura file ambiente
copy .env.example .env
# Modifica .env con le tue credenziali database
```

**Crea il database:**
```sql
CREATE DATABASE driving_school;
\c driving_school
CREATE EXTENSION postgis;
```

**Esegui lo schema:**
```bash
psql -U username -d driving_school -f database/schema.sql
```

**Avvia il server:**
```bash
npm run dev
```
Server disponibile su `http://localhost:3000`

### 3. Setup App Istruttore

```bash
cd ../instructor-app
npm install
npm run dev
```
App disponibile su `http://localhost:5173`

### 4. Setup Dashboard Allievo

```bash
cd ../student-app
npm install
npm run dev
```
Dashboard disponibile su `http://localhost:5174`

## 🚀 Utilizzo

### Per gli Istruttori:

1. Apri `http://localhost:5173` sul tuo smartphone
2. Clicca su "Aggiungi alla schermata home" per installare la PWA
3. Avvia una sessione di guida
4. Durante la guida, segnala gli eventi con i pulsanti colorati:
   - ❌ Errori (precedenze, stop, semafori, distanza)
   - ✅ Manovre corrette
5. Termina la sessione al completamento

### Per gli Allievi:

1. Accedi alla dashboard su `http://localhost:5174`
2. Visualizza la lista delle tue guide
3. Clicca su una guida per vedere:
   - Percorso completo su mappa
   - Tutti gli eventi segnalati con dettagli
   - Statistiche della sessione

## 📡 API Endpoints

### Autenticazione
- `POST /api/auth/register` - Registrazione utente
- `POST /api/auth/login` - Login

### Sessioni
- `POST /api/sessions` - Crea nuova sessione
- `PATCH /api/sessions/:id/end` - Termina sessione
- `POST /api/sessions/:id/gps` - Aggiungi punto GPS
- `GET /api/sessions/:id` - Dettagli sessione con tracciato
- `GET /api/sessions/user/:userId` - Sessioni utente

### Eventi
- `POST /api/events` - Crea evento
- `GET /api/events/session/:sessionId` - Eventi di una sessione

## 💰 Costi

**Totale: €0/mese**

- Leaflet + OpenStreetMap: Gratuito, nessun limite
- Hosting frontend: Vercel/Netlify free tier
- Hosting backend: Railway/Render free tier
- Database: PostgreSQL self-hosted o Supabase free tier

## 🔒 Privacy & GDPR

- ⚠️ Richiedi consenso esplicito per tracking GPS
- 📝 Fornisci informativa privacy chiara
- 🔐 Implementa possibilità di cancellare i dati
- 👤 Permetti disattivazione tracking fuori orario

## 📱 PWA - Installazione Mobile

### Android:
1. Apri Chrome/Edge
2. Vai su app istruttore
3. Menu → "Installa app" o "Aggiungi a Home"

### iOS:
1. Apri Safari
2. Vai su app istruttore  
3. Tocca icona condivisione
4. "Aggiungi a Home"

## 🔧 Personalizzazione

### Aggiungi nuovi tipi di eventi:
Modifica `instructor-app/src/App.jsx` e aggiungi pulsanti nella sezione `event-buttons`.

### Cambia colori/stile:
Modifica i file CSS in `src/App.css` di ciascuna app.

### Modifica URL API:
Cambia `API_URL` nei file `App.jsx` delle applicazioni frontend.

## 🐛 Troubleshooting

**GPS non funziona:**
- Verifica permessi geolocalizzazione nel browser
- Usa HTTPS in produzione (richiesto per GPS)
- Su iOS, usa Safari

**Mappa non si carica:**
- Controlla connessione internet
- Verifica console browser per errori
- Controlla che URL tile OpenStreetMap sia raggiungibile

**Errore connessione database:**
- Verifica che PostgreSQL sia avviato
- Controlla credenziali in `.env`
- Assicurati che estensione PostGIS sia installata

## 📈 Prossimi Sviluppi

- [ ] Sistema di autenticazione completo con JWT
- [ ] Selezione allievo prima di iniziare la guida
- [ ] Note vocali agli eventi
- [ ] Esportazione PDF report sessioni
- [ ] Statistiche avanzate per istruttore
- [ ] Notifiche push

## 📄 Licenza

MIT

## 🤝 Supporto

Per domande o problemi, apri una issue su GitHub.

---

Sviluppato con ❤️ per le autoscuole italiane
