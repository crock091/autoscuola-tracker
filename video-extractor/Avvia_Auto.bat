@echo off
chcp 65001 >nul
set "PATH=C:\Users\crock\Desktop\ffmpeg-master-latest-win64-gpl-shared\bin;%PATH%"

echo ============================================================
echo    Video Clip Extractor - Auto Mode
echo ============================================================
echo.

cd /d "%~dp0"
echo C:\Video_Dashcam_Guida | python extract_clips.py

pause
