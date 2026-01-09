# 🚀 Guida Deploy Autoscuola Tracker

## Prerequisiti
1. Account GitHub (gratuito): https://github.com
2. Account Vercel (gratuito): https://vercel.com

## Passo 1: Prepara il progetto

Il database Supabase è già configurato e funzionante!
- URL: https://wokjywwzgyrgkiriyvyj.supabase.co

## Passo 2: Crea repository GitHub

1. Vai su https://github.com/new
2. Nome repository: `autoscuola-tracker`
3. Scegli "Private" o "Public"
4. NON aggiungere README, .gitignore, o licenza
5. Clicca "Create repository"

## Passo 3: Carica il codice su GitHub

Apri PowerShell nella cartella del progetto e esegui:

```powershell
cd "C:\Users\crock\Desktop\Nuova cartella\driving-school-tracker"

# Inizializza Git
git init

# Aggiungi tutti i file
git add .

# Commit
git commit -m "Initial commit - Autoscuola Tracker"

# Collega al tuo repository GitHub (SOSTITUISCI con il tuo username)
git remote add origin https://github.com/TUO-USERNAME/autoscuola-tracker.git

# Carica su GitHub
git branch -M main
git push -u origin main
```

## Passo 4: Deploy su Vercel

### Deploy App Istruttore:
1. Vai su https://vercel.com/new
2. Seleziona il repository `autoscuola-tracker`
3. Clicca "Import"
4. **IMPORTANTE** - Impostazioni:
   - Framework Preset: `Vite`
   - Root Directory: `instructor-app`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Clicca "Deploy"

### Deploy App Studente:
1. Vai di nuovo su https://vercel.com/new
2. Seleziona il repository `autoscuola-tracker`
3. **IMPORTANTE** - Impostazioni:
   - Framework Preset: `Vite`
   - Root Directory: `student-app`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Clicca "Deploy"

## ✅ Fatto!

Dopo 2-3 minuti avrai:
- App Istruttore: `https://instructor-app-xxx.vercel.app`
- App Studente: `https://student-app-xxx.vercel.app`

## 📱 Testa sullo smartphone

1. Apri le URL sul telefono
2. Safari/Chrome → Menu → "Aggiungi a Home"
3. Ora hai le app come icone!

## 🔐 Sicurezza (Opzionale)

Per ora le app sono accessibili a chiunque conosca l'URL. Per aggiungere login:
1. Chiedi e aggiungiamo autenticazione Supabase
2. Ogni utente avrà email + password

## 🆘 Problemi?

Se hai errori, controlla:
1. Root Directory corretta (instructor-app o student-app)
2. Build Command: `npm run build`
3. Output Directory: `dist`

---

**Database già pronto:** Il tuo Supabase è già configurato e funziona! Non serve nessuna modifica.
