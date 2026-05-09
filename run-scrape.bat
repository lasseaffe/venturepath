@echo off
cd /d "%~dp0"

echo [scrape] Checking Python dependencies...
py -m pip install -r scripts\scrape\requirements.txt --quiet

if %errorlevel% neq 0 (
    echo [ERROR] pip install failed
    pause
    exit /b %errorlevel%
)

echo [scrape] Starting VenturePath inspire data scrape...
py -m scripts.scrape.main

if %errorlevel% neq 0 (
    echo [ERROR] Scrape failed - check output above
    pause
    exit /b %errorlevel%
)

echo.
echo [scrape] Done! public\data\inspire_all.json has been updated.
pause
