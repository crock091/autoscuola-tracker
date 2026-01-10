# Setup Supabase Storage per Video Clips

## 1. Crea Bucket su Supabase Dashboard

1. Vai su https://supabase.com/dashboard
2. Apri il tuo progetto
3. Vai su **Storage** nel menu laterale
4. Clicca **New bucket**
5. Nome bucket: `driving-videos`
6. Imposta come **Public** (per permettere visualizzazione nell'app)
7. Clicca **Create bucket**

## 2. Configura Policy RLS (Row Level Security)

Il bucket pubblico permette già la lettura. Se vuoi maggiore controllo:

1. Vai su **Storage > Policies**
2. Per il bucket `driving-videos`:
   - **SELECT (Read)**: Pubblico ✅
   - **INSERT (Upload)**: Solo autenticati o usa Service Role Key

## 3. Ottieni credenziali

1. Vai su **Settings > API**
2. Copia:
   - **Project URL** (es: https://xxx.supabase.co)
   - **anon public** key (per l'app)
   - **service_role** key (per lo script Python - può uploadare)

## 4. Configura .env

Crea file `.env` nella cartella `video-extractor/`:

```env
SUPABASE_URL=https://tuoprogetto.supabase.co
SUPABASE_KEY=eyJh...tua-service-role-key
DATABASE_URL=postgresql://postgres:[TUA-PASSWORD]@db.xxx.supabase.co:5432/postgres
```

⚠️ **Usa la service_role key nello script Python** (non la anon key) per poter uploadare senza autenticazione.

## 5. Testa connessione

Dopo aver configurato .env, esegui:
```bash
python test_supabase.py
```

## Limiti Storage Supabase Free Tier
- **1GB** totale
- Ogni video clip: ~15-20 MB
- Capacità: ~50-60 video clips
- Consiglio: Cancella periodicamente vecchi video
