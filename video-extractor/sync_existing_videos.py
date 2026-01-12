"""
Script per sincronizzare video_url nel database con i file già esistenti su Supabase Storage
"""
import os
from dotenv import load_dotenv
from supabase import create_client

# Carica .env
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(supabase_url, supabase_key)

print("🔄 Sincronizzazione video_url dal Storage...")

# Lista tutti i file nella cartella event_clips su Storage
try:
    files = supabase.storage.from_('event_clips').list()
    print(f"✓ Trovati {len(files)} file su Storage")
except Exception as e:
    print(f"❌ Errore nel leggere Storage: {e}")
    exit(1)

# Per ogni file, estrae l'event_id dal nome e aggiorna il database
updated = 0
for file in files:
    filename = file['name']
    if filename.startswith('event_') and filename.endswith('.mp4'):
        # Estrae event_id dal formato: event_123_YYYYMMDD_HHMMSS.mp4
        try:
            event_id = int(filename.split('_')[1])
            
            # Costruisci l'URL pubblico
            video_url = f"{supabase_url}/storage/v1/object/public/event_clips/{filename}"
            
            # Aggiorna il database
            response = supabase.table('events').update({'video_url': video_url}).eq('id', event_id).execute()
            
            if response.data:
                print(f"   ✓ Event #{event_id}: {filename}")
                updated += 1
        except (ValueError, IndexError) as e:
            print(f"   ⚠️  Filename non valido: {filename}")

print(f"\n✅ Sincronizzati {updated} video!")
print("   Ora i video sono collegati agli eventi nel database.")
