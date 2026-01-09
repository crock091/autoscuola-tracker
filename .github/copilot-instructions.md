# Driving School Monitoring App

## Descrizione Progetto
Applicazione web progressiva per autoscuola che permette agli istruttori di tracciare i percorsi delle guide e segnalare eventi in tempo reale (errori, manovre corrette). Gli allievi possono poi visualizzare il percorso con tutti i feedback.

## Tech Stack
- **Backend**: Node.js, Express, PostgreSQL con PostGIS
- **Frontend**: React + Vite
- **Mappe**: Leaflet con OpenStreetMap (gratuito)
- **PWA**: Service Workers per funzionalità offline
- **Lingua**: Italiano

## Struttura Progetto
- `/backend` - Server API REST
- `/instructor-app` - PWA per istruttori
- `/student-app` - Dashboard per allievi

## Funzionalità Principali
1. Tracking GPS continuo durante la guida
2. Segnalazione eventi con coordinate precise
3. Visualizzazione percorsi su mappa interattiva
4. Storico sessioni per istruttori e allievi
5. Sistema di autenticazione
