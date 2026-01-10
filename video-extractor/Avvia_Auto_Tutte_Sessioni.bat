@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Configura FFmpeg
set "PATH=C:\ffmpeg\ffmpeg-master-latest-win64-gpl-shared\bin;%PATH%"

echo ============================================================
echo    Video Clip Extractor - MODALITA' AUTOMATICA
echo ============================================================
echo.
echo Questo script processera' TUTTE le sessioni automaticamente
echo senza richiedere conferme.
echo.
echo Configurazione:
echo   - Cartella video: C:\Video_Dashcam_Guida
echo   - Upload automatico su Supabase: SI
echo   - Salta eventi gia' con video: SI
echo.
pause
echo.

cd /d "%~dp0"

REM Esegui script con risposta automatica "1" (modalità automatica)
echo 1| python extract_clips.py C:\Video_Dashcam_Guida

echo.
echo ============================================================
pause
