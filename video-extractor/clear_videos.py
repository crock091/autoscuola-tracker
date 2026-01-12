#!/usr/bin/env python3
"""
Script per cancellare i video_url dal database per una specifica sessione.
"""

import requests
import os
from datetime import datetime

API_URL = 'https://wokjywwzgyrgkiriyvyj.supabase.co/rest/v1'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indva2p5d3d6Z3lyZ2tpcml5dnlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NDQzNzMsImV4cCI6MjA4MzUyMDM3M30.o6UVvuR3yOfyhG00-0FUsz6V6vC_qSzPG44TrEMCKA4'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Trova sessioni del 10/01/2026
print("🔍 Cerco sessioni del 10/01/2026...")
response = requests.get(
    f"{API_URL}/sessions?order=inizio.desc&limit=50",
    headers=headers
)

sessions = response.json()

# Filtra per data
target_sessions = []
for s in sessions:
    inizio = datetime.fromisoformat(s['inizio'].replace('Z', '+00:00'))
    if inizio.day == 10 and inizio.month == 1 and inizio.year == 2026:
        if inizio.hour >= 9 and inizio.hour < 10:
            target_sessions.append(s)
            print(f"✓ Trovata sessione ID {s['id']}: {inizio}")

if not target_sessions:
    print("❌ Nessuna sessione trovata per quella data/ora!")
    exit(1)

# Per ogni sessione, azzera video_url negli eventi
for session in target_sessions:
    session_id = session['id']
    print(f"\n🗑️ Pulisco video dalla sessione {session_id}...")
    
    # Aggiorna eventi (setta video_url = null)
    response = requests.patch(
        f"{API_URL}/events?session_id=eq.{session_id}",
        headers=headers,
        json={'video_url': None}
    )
    
    if response.status_code in [200, 204]:
        print(f"✅ Video rimossi dalla sessione {session_id}")
    else:
        print(f"⚠️ Errore: {response.text}")

print("\n✅ Pulizia completata! Ora puoi eseguire extract_clips.py")
