import os
import requests
from dotenv import load_dotenv

load_dotenv()

STORAGE_URL = os.getenv('SUPABASE_URL', 'https://wokjywwzgyrgkiriyvyj.supabase.co') + '/storage/v1'
API_URL = os.getenv('SUPABASE_URL', 'https://wokjywwzgyrgkiriyvyj.supabase.co') + '/rest/v1'
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

headers = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}'
}

file_path = 'clips_estratti/20260110_081008_Eccesso_Velocita_Sessione50_compressed.mp4'
filename = '20260110_081008_Eccesso_Velocita_Sessione50.mp4'  # Nome originale

print(f'Caricamento {filename}...')

with open(file_path, 'rb') as f:
    file_content = f.read()

upload_url = f"{STORAGE_URL}/object/driving-videos/{filename}"
response = requests.post(
    upload_url,
    headers={**headers, 'Content-Type': 'video/mp4'},
    data=file_content
)

if response.status_code in [200, 201]:
    public_url = f"https://wokjywwzgyrgkiriyvyj.supabase.co/storage/v1/object/public/driving-videos/{filename}"
    print(f'✓ Video caricato: {public_url}')
    
    # Aggiorna DB - trova evento eccesso_velocita della sessione 50
    update_url = f"{API_URL}/events?session_id=eq.50&tipo=eq.eccesso_velocita"
    update_response = requests.patch(
        update_url,
        headers={**headers, 'Content-Type': 'application/json'},
        json={'video_url': public_url}
    )
    
    if update_response.status_code in [200, 204]:
        print('✓ Database aggiornato')
    else:
        print(f'⚠️  Errore DB: {update_response.status_code}')
else:
    print(f'❌ Errore upload: {response.status_code} - {response.text}')
