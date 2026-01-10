@echo off
chcp 65001 >nul
title Video Clip Extractor - Autoscuola Tracker

REM Aggiungi FFmpeg al PATH temporaneamente
set "PATH=C:\ffmpeg\ffmpeg-master-latest-win64-gpl-shared\bin;%PATH%"

REM Vai nella cartella dello script
cd /d "%~dp0"

echo.
echo ============================================================
echo    Video Clip Extractor - Autoscuola Tracker
echo ============================================================
echo.

REM Verifica FFmpeg
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo [ERRORE] FFmpeg non trovato!
    echo Assicurati che sia in: C:\ffmpeg\ffmpeg-master-latest-win64-gpl-shared\bin
    echo.
    pause
    exit /b 1
)

echo [OK] FFmpeg trovato
echo.

REM Avvia lo script Python
python extract_clips.py

echo.
echo ============================================================
echo.
pause
