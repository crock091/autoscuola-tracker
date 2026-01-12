#!/usr/bin/env python3
"""
Script per estrarre clip video dalla dashcam basandosi sugli eventi registrati.
Estrae 50 secondi prima e 10 secondi dopo ogni evento.
Carica automaticamente i video su Supabase Storage.
"""

import os
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path
import requests
from dotenv import load_dotenv

# Carica variabili ambiente
load_dotenv()

# Configurazione Supabase
API_URL = os.getenv('SUPABASE_URL', 'https://wokjywwzgyrgkiriyvyj.supabase.co') + '/rest/v1'
STORAGE_URL = os.getenv('SUPABASE_URL', 'https://wokjywwzgyrgkiriyvyj.supabase.co') + '/storage/v1'
# Per upload video serve la service_role key (non la anon key!)
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indva2p5d3d6Z3lyZ2tpcml5dnlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NDQzNzMsImV4cCI6MjA4MzUyMDM3M30.o6UVvuR3yOfyhG00-0FUsz6V6vC_qSzPG44TrEMCKA4')

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}'
}

def check_ffmpeg():
    """Verifica che FFmpeg sia installato"""
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        print("✓ FFmpeg trovato")
        return True
    except FileNotFoundError:
        print("❌ FFmpeg non trovato!")
        print("   Scaricalo da: https://ffmpeg.org/download.html")
        return False

def get_sessions():
    """Recupera le sessioni dal database"""
    response = requests.get(
        f"{API_URL}/sessions?order=inizio.desc&limit=20",
        headers=headers
    )
    return response.json()

def get_events(session_id):
    """Recupera gli eventi di una sessione usando RPC"""
    response = requests.post(
        f"{API_URL}/rpc/get_events",
        headers={**headers, 'Content-Type': 'application/json'},
        json={'p_session_id': session_id}
    )
    return response.json()

def parse_dashcam_filename(filename):
    """
    Estrae data e ora dal nome file della dashcam.
    Supporta formati comuni: 
    - YYYY-MM-DD_HH-MM-SS.mp4
    - YYYYMMDD_HHMMSS.mp4
    - YYYYMMDDHHMMSS.mp4
    - YYYY_MM_DD_HH_MM_SS.mp4
    
    Modifica questa funzione in base al formato della TUA dashcam!
    """
    try:
        # Rimuovi estensione
        name = Path(filename).stem
        
        # Prova formato: YYYYMMDDHHMMSS (14 cifre)
        if name.isdigit() and len(name) == 14:
            return datetime.strptime(name, '%Y%m%d%H%M%S')
        
        # Prova formato: YYYY-MM-DD_HH-MM-SS
        if '_' in name and '-' in name:
            date_part, time_part = name.split('_', 1)
            date_str = date_part.replace('-', '')
            time_str = time_part.replace('-', '')
            datetime_str = date_str + time_str
            return datetime.strptime(datetime_str, '%Y%m%d%H%M%S')
        
        # Aggiungi qui altri formati se necessario
        return None
    except:
        return None

def find_video_file(video_dir, target_time):
    """
    Trova il file video che contiene il timestamp target.
    Gestisce video di qualsiasi durata (3-20 minuti).
    """
    video_files = []
    
    for file in os.listdir(video_dir):
        if file.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
            start_time = parse_dashcam_filename(file)
            if start_time:
                video_files.append((file, start_time))
    
    # Ordina per data/ora
    video_files.sort(key=lambda x: x[1])
    
    # Trova il video che contiene il target_time
    for i, (filename, start_time) in enumerate(video_files):
        # Verifica se il target è dopo questo video ma prima del successivo
        if i + 1 < len(video_files):
            next_start = video_files[i + 1][1]
            # Se target è tra start e next_start, è in questo video
            if start_time <= target_time < next_start:
                return filename, start_time
        else:
            # Ultimo video - accetta se entro 30 minuti (margine di sicurezza)
            if start_time <= target_time <= start_time + timedelta(minutes=30):
                return filename, start_time
    
    return None, None

def extract_clip(video_path, output_path, offset_seconds, duration=60):
    """
    Estrae una clip dal video usando FFmpeg.
    
    Args:
        video_path: Percorso del video sorgente
        output_path: Percorso del video di output
        offset_seconds: Secondi dall'inizio del video
        duration: Durata della clip in secondi (default 60 = 50 prima + 10 dopo)
    """
    # Calcola il punto di inizio (50 secondi prima dell'evento)
    start = max(0, offset_seconds - 50)
    
    cmd = [
        'ffmpeg',
        '-i', video_path,
        '-ss', str(start),
        '-t', str(duration),
        '-vcodec', 'libx264',  # Re-encode per comprimere
        '-crf', '30',  # Qualità aumentata per ridurre dimensione (era 28)
        '-preset', 'fast',  # Velocità encoding
        '-acodec', 'aac',  # Audio codec
        '-b:a', '96k',  # Bitrate audio ridotto (era 128k)
        '-avoid_negative_ts', '1',  # Evita problemi con timestamp negativi
        '-y',  # Sovrascrivi se esiste
        output_path
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Errore FFmpeg: {e.stderr}")
        return False

def format_event_type(tipo):
    """Formatta il tipo di evento per il nome file"""
    labels = {
        'precedenza_pedoni': 'Precedenza_Pedoni',
        'stop': 'Stop',
        'semaforo': 'Semaforo',
        'distanza': 'Distanza_Sicurezza',
        'eccesso_velocita': 'Eccesso_Velocita',
        'manovra_corretta': 'Manovra_Corretta'
    }
    return labels.get(tipo, tipo.replace('_', ' ').title())

def upload_to_supabase(file_path, bucket='driving-videos'):
    """
    Carica un file su Supabase Storage
    
    Args:
        file_path: Percorso del file locale da caricare
        bucket: Nome del bucket Supabase (default: 'driving-videos')
    
    Returns:
        URL pubblico del file caricato, o None se errore
    """
    try:
        filename = os.path.basename(file_path)
        
        # Leggi il file
        with open(file_path, 'rb') as f:
            file_content = f.read()
        
        # Upload su Supabase Storage con upsert per sovrascrivere se esiste
        upload_url = f"{STORAGE_URL}/object/{bucket}/{filename}"
        upload_response = requests.post(
            upload_url,
            headers={
                **headers,
                'Content-Type': 'video/mp4',
                'x-upsert': 'true'  # Sovrascrivi se il file esiste già
            },
            data=file_content
        )
        
        if upload_response.status_code in [200, 201]:
            # Genera URL pubblico
            public_url = f"{STORAGE_URL.replace('/storage/v1', '')}/storage/v1/object/public/{bucket}/{filename}"
            return public_url
        else:
            print(f"   ⚠️  Errore upload: {upload_response.status_code} - {upload_response.text}")
            return None
            
    except Exception as e:
        print(f"   ⚠️  Errore upload: {e}")
        return None

def update_event_video_url(event_id, video_url):
    """
    Aggiorna il campo video_url di un evento nel database
    
    Args:
        event_id: ID dell'evento
        video_url: URL del video su Supabase Storage
    
    Returns:
        True se successo, False altrimenti
    """
    try:
        response = requests.patch(
            f"{API_URL}/events?id=eq.{event_id}",
            headers={**headers, 'Content-Type': 'application/json'},
            json={'video_url': video_url}
        )
        return response.status_code in [200, 204]
    except Exception as e:
        print(f"   ⚠️  Errore aggiornamento DB: {e}")
        return False


def process_session(session, video_dir, output_dir):
    """Processa una singola sessione estraendo tutti i video degli eventi"""
    session_id = session['id']
    inizio = datetime.fromisoformat(session['inizio'].replace('Z', '+00:00'))
    
    print(f"\n{'='*60}")
    print(f"📅 Sessione #{session_id} - {inizio.strftime('%d/%m/%Y %H:%M')}")
    print(f"   Allievo ID: {session['allievo_id']}")
    print(f"{'='*60}")
    
    # Carica eventi
    events = get_events(session_id)
    
    if not events:
        print("   ⚠️  Nessun evento trovato")
        return 0, 0
    
    # Filtra eventi senza video
    events_to_process = [e for e in events if not e.get('video_url')]
    
    if not events_to_process:
        print(f"   ✓ Tutti i {len(events)} eventi hanno già il video caricato")
        return 0, 0
    
    print(f"   📊 Eventi da processare: {len(events_to_process)}/{len(events)}")
    print()
    
    success_count = 0
    skip_count = 0
    
    for i, event in enumerate(events_to_process, 1):
        # Converti timestamp (rimuovi timezone per compatibilità)
        event_time = datetime.fromisoformat(event['ts'].replace('Z', '+00:00'))
        
        # Rimuovi timezone per confronto
        event_time_naive = event_time.replace(tzinfo=None)
        
        # IMPORTANTE: Il DB salva in UTC, i video dashcam in ora locale italiana (UTC+1)
        # Aggiungi 1 ora per convertire da UTC a ora italiana
        event_time_naive = event_time_naive + timedelta(hours=1)
        
        tipo = format_event_type(event['tipo'])
        print(f"[{i}/{len(events)}] {tipo} alle {event_time.strftime('%H:%M:%S')}", end=' ')
        
        # Trova video corrispondente
        video_file, video_start = find_video_file(video_dir, event_time_naive)
        
        if not video_file:
            print("❌ Video non trovato")
            skip_count += 1
            continue
        
        # Calcola offset
        offset_seconds = (event_time_naive - video_start).total_seconds()
        
        # Nome file output
        output_filename = f"{event_time.strftime('%Y%m%d_%H%M%S')}_{tipo}_Sessione{session['id']}.mp4"
        output_path = os.path.join(output_dir, output_filename)
        
        # Estrai clip
        video_path = os.path.join(video_dir, video_file)
        if extract_clip(video_path, output_path, offset_seconds):
            print("✓ Estratto", end=' ')
            
            # Upload su Supabase
            print("→ Upload...", end=' ')
            video_url = upload_to_supabase(output_path)
            
            if video_url:
                # Aggiorna DB con URL video
                if update_event_video_url(event['id'], video_url):
                    print("✓ Caricato")
                    success_count += 1
                else:
                    print("⚠️  DB non aggiornato")
                    success_count += 1  # Conta comunque come successo (video estratto)
            else:
                print("⚠️  Upload fallito (video salvato localmente)")
                success_count += 1  # Conta come successo parziale
        else:
            print("❌ Errore estrazione")
            skip_count += 1
    
    return success_count, skip_count

def main():
    print("=" * 60)
    print("🎥 Video Clip Extractor - Autoscuola Tracker")
    print("=" * 60)
    print()
    
    # Verifica FFmpeg
    if not check_ffmpeg():
        return
    
    # Controlla se percorso video passato come argomento
    if len(sys.argv) > 1:
        video_dir = sys.argv[1].strip().strip('"')
    else:
        # Input directory video dashcam
        print("\n📁 Inserisci il percorso della cartella con i video della dashcam:")
        print("   (Es: D:\\Dashcam o /Volumes/DASHCAM)")
        video_dir = input("   > ").strip().strip('"')
    
    if not os.path.isdir(video_dir):
        print(f"❌ Cartella non trovata: {video_dir}")
        return
    
    # Output directory
    output_dir = os.path.join(os.path.dirname(__file__), 'clips_estratti')
    os.makedirs(output_dir, exist_ok=True)
    print(f"\n📂 I clip saranno salvati in: {output_dir}")
    
    # Carica sessioni
    print("\n📋 Caricamento sessioni...")
    sessions = get_sessions()
    
    if not sessions:
        print("❌ Nessuna sessione trovata")
        return
    
    print(f"✓ Trovate {len(sessions)} sessioni\n")
    
    # Chiedi se processare tutte o selezionare
    print("Vuoi processare:")
    print("   1. Tutte le sessioni automaticamente")
    print("   2. Selezionare una sessione specifica")
    
    try:
        # Se non è un terminale interattivo, usa modalità automatica
        mode = input("\n   Scelta (1 o 2, default 1): ").strip() or '1'
        
        if mode == '1':
            # Modalità automatica - processa tutte
            print("\n🤖 Modalità automatica: elaborazione di tutte le sessioni...\n")
            
            total_success = 0
            total_skip = 0
            sessions_processed = 0
            
            for session in sessions:
                success, skip = process_session(session, video_dir, output_dir)
                total_success += success
                total_skip += skip
                if success > 0 or skip > 0:
                    sessions_processed += 1
            
            # Riepilogo finale
            print("\n" + "=" * 60)
            print("✅ ELABORAZIONE COMPLETATA!")
            print("=" * 60)
            print(f"   📊 Sessioni elaborate: {sessions_processed}/{len(sessions)}")
            print(f"   ✅ Video estratti e caricati: {total_success}")
            print(f"   ⏭️  Eventi saltati: {total_skip}")
            print(f"   📂 Cartella output: {output_dir}")
            print("=" * 60)
            
        elif mode == '2':
            # Modalità manuale - selezione singola sessione
            print("\n🚗 Sessioni disponibili:")
            for i, session in enumerate(sessions, 1):
                inizio = datetime.fromisoformat(session['inizio'].replace('Z', '+00:00'))
                print(f"   {i}. {inizio.strftime('%d/%m/%Y %H:%M')} - Allievo ID: {session['allievo_id']}")
            
            choice = int(input("\n   Seleziona sessione (numero): "))
            if choice < 1 or choice > len(sessions):
                print("❌ Selezione non valida")
                return
            
            selected_session = sessions[choice - 1]
            success, skip = process_session(selected_session, video_dir, output_dir)
            
            # Riepilogo
            print("\n" + "=" * 60)
            print(f"✅ Completato!")
            print(f"   - Clip estratti: {success}")
            print(f"   - Saltati: {skip}")
            print(f"   - Cartella output: {output_dir}")
            print("=" * 60)
        else:
            print("❌ Scelta non valida")
            return
            
    except ValueError:
        print("❌ Input non valido")
        return
    except KeyboardInterrupt:
        print("\n\n⚠️  Operazione annullata dall'utente")
        return

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Operazione annullata dall'utente")
    except Exception as e:
        print(f"\n❌ Errore: {e}")
        import traceback
        traceback.print_exc()
