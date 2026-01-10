#!/usr/bin/env python3
"""
Script per estrarre clip video dalla dashcam basandosi sugli eventi registrati.
Estrae 30 secondi prima e 30 secondi dopo ogni evento.
"""

import os
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
import requests

# Configurazione Supabase
API_URL = 'https://wokjywwzgyrgkiriyvyj.supabase.co/rest/v1'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indva2p5d3d6Z3lyZ2tpcml5dnlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NDQzNzMsImV4cCI6MjA4MzUyMDM3M30.o6UVvuR3yOfyhG00-0FUsz6V6vC_qSzPG44TrEMCKA4'

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
    - YYYY_MM_DD_HH_MM_SS.mp4
    
    Modifica questa funzione in base al formato della TUA dashcam!
    """
    try:
        # Rimuovi estensione
        name = Path(filename).stem
        
        # Prova formato: 2026-01-10_15-30-00
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
    Assume che i video durino circa 15 minuti.
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
        # Assumi durata video ~15 minuti (900 secondi)
        # Verifica anche il video successivo per avere margine
        if i + 1 < len(video_files):
            next_start = video_files[i + 1][1]
            if start_time <= target_time < next_start:
                return filename, start_time
        else:
            # Ultimo video - controlla se è entro 20 minuti
            if start_time <= target_time <= start_time + timedelta(minutes=20):
                return filename, start_time
    
    return None, None

def extract_clip(video_path, output_path, offset_seconds, duration=60):
    """
    Estrae una clip dal video usando FFmpeg.
    
    Args:
        video_path: Percorso del video sorgente
        output_path: Percorso del video di output
        offset_seconds: Secondi dall'inizio del video
        duration: Durata della clip in secondi (default 60 = 30 prima + 30 dopo)
    """
    # Calcola il punto di inizio (30 secondi prima dell'evento)
    start = max(0, offset_seconds - 30)
    
    cmd = [
        'ffmpeg',
        '-i', video_path,
        '-ss', str(start),
        '-t', str(duration),
        '-c', 'copy',  # Copia senza re-encoding (veloce!)
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

def main():
    print("=" * 60)
    print("🎥 Video Clip Extractor - Autoscuola Tracker")
    print("=" * 60)
    print()
    
    # Verifica FFmpeg
    if not check_ffmpeg():
        return
    
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
    
    # Mostra sessioni
    print("\n🚗 Sessioni disponibili:")
    for i, session in enumerate(sessions, 1):
        inizio = datetime.fromisoformat(session['inizio'].replace('Z', '+00:00'))
        print(f"   {i}. {inizio.strftime('%d/%m/%Y %H:%M')} - Allievo ID: {session['allievo_id']}")
    
    # Selezione sessione
    try:
        choice = int(input("\n   Seleziona sessione (numero): "))
        if choice < 1 or choice > len(sessions):
            print("❌ Selezione non valida")
            return
        selected_session = sessions[choice - 1]
    except ValueError:
        print("❌ Input non valido")
        return
    
    # Carica eventi
    print(f"\n📊 Caricamento eventi...")
    events = get_events(selected_session['id'])
    
    if not events:
        print("⚠️  Nessun evento trovato per questa sessione")
        return
    
    print(f"✓ Trovati {len(events)} eventi")
    
    # Estrai clip per ogni evento
    print(f"\n🎬 Inizio estrazione clip...\n")
    
    success_count = 0
    skip_count = 0
    
    for i, event in enumerate(events, 1):
        # Converti timestamp (rimuovi timezone per compatibilità)
        event_time = datetime.fromisoformat(event['ts'].replace('Z', '+00:00'))
        
        # Rimuovi timezone per confronto
        event_time_naive = event_time.replace(tzinfo=None)
        
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
        output_filename = f"{event_time.strftime('%Y%m%d_%H%M%S')}_{tipo}_Sessione{selected_session['id']}.mp4"
        output_path = os.path.join(output_dir, output_filename)
        
        # Estrai clip
        video_path = os.path.join(video_dir, video_file)
        if extract_clip(video_path, output_path, offset_seconds):
            print("✓ Estratto")
            success_count += 1
        else:
            print("❌ Errore estrazione")
            skip_count += 1
    
    # Riepilogo
    print("\n" + "=" * 60)
    print(f"✅ Completato!")
    print(f"   - Clip estratti: {success_count}")
    print(f"   - Saltati: {skip_count}")
    print(f"   - Cartella output: {output_dir}")
    print("=" * 60)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Operazione annullata dall'utente")
    except Exception as e:
        print(f"\n❌ Errore: {e}")
        import traceback
        traceback.print_exc()
