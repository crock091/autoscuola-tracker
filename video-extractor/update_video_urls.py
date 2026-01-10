import os
import requests
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

API_URL = os.getenv('SUPABASE_URL', 'https://wokjywwzgyrgkiriyvyj.supabase.co') + '/rest/v1'
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

headers = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json'
}

# Mappa file video caricati su Supabase
video_files = [
    '20260110_081008_Eccesso_Velocita_Sessione50.mp4',
    '20260110_082347_Manovra_Corretta_Sessione50.mp4',
    '20260110_082643_Manovra_Corretta_Sessione50.mp4',
    '20260110_083821_Semaforo_Sessione50.mp4',
    '20260110_084131_Stop_Sessione50.mp4',
    '20260110_084204_Stop_Sessione50.mp4'
]

print('🔄 Aggiornamento video_url nel database...\n')

success = 0
for filename in video_files:
    # Estrai timestamp e tipo dal nome file
    # Formato: YYYYMMDD_HHMMSS_Tipo_SessioneXX.mp4
    parts = filename.replace('.mp4', '').split('_')
    date_str = parts[0]  # YYYYMMDD
    time_str = parts[1]  # HHMMSS
    tipo = parts[2].lower().replace('precedenza', 'precedenza_pedoni')  # Tipo evento
    
    # Converti a timestamp (UTC)
    timestamp_str = f"{date_str} {time_str}"
    dt = datetime.strptime(timestamp_str, '%Y%m%d %H%M%S')
    
    # Trova evento corrispondente (approssimazione ±10 secondi)
    # Gli eventi sono in UTC (08:XX), i nomi file sono in locale (08:XX → UTC stessa ora per update)
    url_public = f"https://wokjywwzgyrgkiriyvyj.supabase.co/storage/v1/object/public/driving-videos/{filename}"
    
    # Update tramite tipo e timestamp approssimativo
    update_url = f"{API_URL}/events?session_id=eq.50&tipo=eq.{tipo}"
    
    # Per manovre corrette multiple, uso timestamp esatto
    if tipo == 'manovra_corretta':
        # 082347 = 08:23:47, 082643 = 08:26:43
        hour = int(time_str[0:2])
        minute = int(time_str[2:4])
        second = int(time_str[4:6])
        update_url += f"&timestamp=gte.2026-01-10T{hour:02d}:{minute:02d}:{second-5:02d}&timestamp=lte.2026-01-10T{hour:02d}:{minute:02d}:{second+5:02d}"
    
    response = requests.patch(
        update_url,
        headers=headers,
        json={'video_url': url_public}
    )
    
    if response.status_code in [200, 204]:
        print(f"✅ {filename[:50]:50s} → DB aggiornato")
        success += 1
    else:
        print(f"⚠️  {filename[:50]:50s} → Errore: {response.status_code}")

print(f'\n✅ Completato! {success}/{len(video_files)} video_url aggiornati')
print('\nVerifica con: python check_videos.py')
