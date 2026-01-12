"""
Script per pulire TUTTI i video_url dal database
"""
import os
from dotenv import load_dotenv
from supabase import create_client

# Carica .env dalla cartella corrente
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

if not supabase_url or not supabase_key:
    print(f"❌ Errore: credenziali mancanti!")
    print(f"   SUPABASE_URL: {'✓' if supabase_url else '✗'}")
    print(f"   SUPABASE_SERVICE_KEY: {'✓' if supabase_key else '✗'}")
    exit(1)

supabase = create_client(supabase_url, supabase_key)

print("🧹 Pulizia di TUTTI i video_url dal database...")

# Aggiorna tutti gli eventi impostando video_url a NULL
response = supabase.table('events').update({'video_url': None}).neq('id', 0).execute()

count = len(response.data) if response.data else 0
print(f"✅ Puliti {count} eventi!")
print("   Ora puoi rieseguire l'estrazione video.")
