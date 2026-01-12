#!/usr/bin/env python3
"""
Script per vedere tutte le sessioni disponibili.
"""

import requests
from datetime import datetime

API_URL = 'https://wokjywwzgyrgkiriyvyj.supabase.co/rest/v1'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indva2p5d3d6Z3lyZ2tpcml5dnlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NDQzNzMsImV4cCI6MjA4MzUyMDM3M30.o6UVvuR3yOfyhG00-0FUsz6V6vC_qSzPG44TrEMCKA4'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}'
}

print("📋 Sessioni disponibili:\n")
response = requests.get(
    f"{API_URL}/sessions?order=inizio.desc&limit=20",
    headers=headers
)

sessions = response.json()

for s in sessions:
    inizio = datetime.fromisoformat(s['inizio'].replace('Z', '+00:00'))
    fine = s.get('fine')
    fine_str = ""
    if fine:
        fine_dt = datetime.fromisoformat(fine.replace('Z', '+00:00'))
        fine_str = f" - {fine_dt.strftime('%H:%M:%S')}"
    
    print(f"ID: {s['id']:3d} | {inizio.strftime('%d/%m/%Y %H:%M:%S')}{fine_str} | Stato: {s['stato']}")
