import os
import requests
from dotenv import load_dotenv

load_dotenv()

STORAGE_URL = os.getenv('SUPABASE_URL', 'https://wokjywwzgyrgkiriyvyj.supabase.co') + '/storage/v1'
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

headers = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}'
}

files_to_delete = [
    '20260110_082347_Manovra_Corretta_Sessione50.mp4',
    '20260110_082643_Manovra_Corretta_Sessione50.mp4',
    '20260110_083821_Semaforo_Sessione50.mp4',
    '20260110_084131_Stop_Sessione50.mp4',
    '20260110_084204_Stop_Sessione50.mp4'
]

print('Cancellazione file duplicati da Supabase Storage...\n')
for filename in files_to_delete:
    delete_url = f"{STORAGE_URL}/object/driving-videos/{filename}"
    response = requests.delete(delete_url, headers=headers)
    
    if response.status_code in [200, 204]:
        print(f"✓ {filename} cancellato")
    else:
        print(f"⚠️  {filename}: {response.status_code} - {response.text}")

print('\n✅ Completato! Ora puoi ri-eseguire l\'estrazione.')
