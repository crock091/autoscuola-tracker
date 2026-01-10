import requests

headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indva2p5d3d6Z3lyZ2tpcml5dnlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NDQzNzMsImV4cCI6MjA4MzUyMDM3M30.o6UVvuR3yOfyhG00-0FUsz6V6vC_qSzPG44TrEMCKA4',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indva2p5d3d6Z3lyZ2tpcml5dnlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NDQzNzMsImV4cCI6MjA4MzUyMDM3M30.o6UVvuR3yOfyhG00-0FUsz6V6vC_qSzPG44TrEMCKA4'
}

r = requests.post(
    'https://wokjywwzgyrgkiriyvyj.supabase.co/rest/v1/rpc/get_events',
    headers=headers,
    json={'p_session_id': 50}
)

events = r.json()
print('\n=== Eventi Sessione 50 - Video URL ===\n')
for e in events:
    video = e.get('video_url', 'NULL')
    if video and video != 'NULL':
        print(f"✅ {e['tipo']:20s} | video_url: {video[:80]}...")
    else:
        print(f"❌ {e['tipo']:20s} | video_url: NULL")
