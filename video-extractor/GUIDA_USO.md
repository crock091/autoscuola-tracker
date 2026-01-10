# Video Clip Extractor - Guida Migliorata

## 🚀 Modalità di Utilizzo

### Modalità 1: Automatica - Tutte le Sessioni
Processa automaticamente TUTTE le sessioni trovate nel database.

**Esecuzione rapida:**
```bash
Avvia_Auto_Tutte_Sessioni.bat
```

Oppure manualmente:
```bash
python extract_clips.py C:\Video_Dashcam_Guida
# Scegli opzione 1
```

**Cosa fa:**
- Carica tutte le sessioni dal database
- Per ogni sessione, estrae video degli eventi che NON hanno già video
- Upload automatico su Supabase Storage
- Aggiorna database con video_url
- Mostra statistiche finali

### Modalità 2: Singola Sessione
Processa solo una sessione specifica.

**Esecuzione:**
```bash
Avvia_Estrazione_Video.bat
```

Oppure:
```bash
python extract_clips.py C:\Video_Dashcam_Guida
# Scegli opzione 2
# Seleziona numero sessione
```

## ⏰ Gestione Timezone

Lo script gestisce automaticamente la conversione UTC ↔ Ora Italiana:

- **Database**: Eventi salvati in UTC (es: 08:10:08)
- **Video Dashcam**: Nomi file in ora locale italiana (es: 20260110091008.mp4 = 09:10:08)
- **Conversione automatica**: +1 ora da UTC a italiana

## 🎯 Caratteristiche Principali

✅ **Salta eventi già processati**: Non ri-estrae video se `video_url` è già popolato
✅ **Gestione automatica timezone**: Conversione UTC/Italiana
✅ **Compressione intelligente**: CRF 30 + audio 96k per restare sotto 50MB
✅ **Upload automatico**: Carica su Supabase Storage e aggiorna DB
✅ **Statistiche dettagliate**: Progresso per sessione e totale finale
✅ **Supporto multi-sessione**: Processa tutte le guide in un colpo solo

## 📊 Output Esempio

```
============================================================
📅 Sessione #50 - 10/01/2026 08:02
   Allievo ID: 2
============================================================
   📊 Eventi da processare: 6/7
   
[1/7] Eccesso_Velocita alle 08:10:08 ✓ Estratto → Upload... ✓ Caricato
[2/7] Manovra_Corretta alle 08:23:47 ✓ Estratto → Upload... ✓ Caricato
...

============================================================
✅ ELABORAZIONE COMPLETATA!
============================================================
   📊 Sessioni elaborate: 2/3
   ✅ Video estratti e caricati: 12
   ⏭️  Eventi saltati: 5
   📂 Cartella output: clips_estratti
============================================================
```

## 🔧 Requisiti

- Python 3.11+
- FFmpeg installato e configurato
- File `.env` con credenziali Supabase
- Video dashcam in formato YYYYMMDDHHMMSS.mp4

## 💡 Suggerimenti

**Per elaborazioni regolari:**
1. Copia video dashcam in `C:\Video_Dashcam_Guida`
2. Esegui `Avvia_Auto_Tutte_Sessioni.bat`
3. Aspetta completamento (~2 min per 10 video)
4. Controlla app web - video disponibili! 🎥

**Per test/debug:**
- Usa modalità singola sessione
- Controlla log per errori
- Verifica dimensioni video (<50MB)
