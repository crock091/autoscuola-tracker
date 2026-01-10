import requests
from datetime import datetime

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
print('\n=== Eventi Sessione 50 (dal DB) ===')
print(f"Totale eventi: {len(events)}")
if events:
    print(f"Chiavi disponibili: {events[0].keys()}")
    for e in events:
        ts = datetime.fromisoformat(e['ts'].replace('Z', '+00:00'))
        ts_naive = ts.replace(tzinfo=None)
        print(f"{e['tipo']:20s} | DB UTC: {ts_naive} | +1h: {ts_naive.hour+1:02d}:{ts_naive.minute:02d}:{ts_naive.second:02d}")

print('\n=== Video Dashcam Disponibili ===')
import os
for f in sorted(os.listdir('C:\\Video_Dashcam_Guida')):
    if f.endswith('.mp4'):
        name = f.replace('.mp4', '')
        dt = datetime.strptime(name, '%Y%m%d%H%M%S')
        print(f"{f} -> Inizio: {dt.strftime('%H:%M:%S')}")
