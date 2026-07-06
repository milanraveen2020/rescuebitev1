# RescueBite — daily dev startup (Windows)
#
# Run this after first-time setup is already done (pnpm install, pnpm build,
# db:generate/db:migrate). It only turns the pieces back on:
#   - starts the rescuebite-db Docker container (creates it on first run)
#   - opens the API dev server in its own window
#   - opens the Expo dev server (for the customer app) in its own window
#
# It does NOT boot the Android emulator — start that from Android Studio's
# Device Manager, then press "a" in the Expo window once it's up.

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker doesn't seem to be running. Open Docker Desktop and wait for it to finish starting, then re-run this script." -ForegroundColor Yellow
    exit 1
}

$containerExists = (docker ps -a --filter "name=^rescuebite-db$" --format "{{.Names}}") -eq "rescuebite-db"
$containerRunning = (docker ps --filter "name=^rescuebite-db$" --format "{{.Names}}") -eq "rescuebite-db"

if ($containerRunning) {
    Write-Host "rescuebite-db is already running." -ForegroundColor Green
} elseif ($containerExists) {
    Write-Host "Starting existing rescuebite-db container..." -ForegroundColor Cyan
    docker start rescuebite-db | Out-Null
} else {
    Write-Host "Creating rescuebite-db container..." -ForegroundColor Cyan
    docker run --name rescuebite-db `
        -e POSTGRES_USER=rescuebite `
        -e POSTGRES_PASSWORD=rescuebite `
        -e POSTGRES_DB=rescuebite `
        -p 5432:5432 `
        -d postgres:16 | Out-Null
}

Write-Host "Opening API dev server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$repoRoot'; pnpm --filter @rescuebite/api dev"

Write-Host "Opening Expo dev server for the customer app..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$repoRoot\apps\customer'; npx expo start"

Write-Host ""
Write-Host "Next: boot the emulator from Android Studio's Device Manager if it isn't already running, then press 'a' in the Expo window." -ForegroundColor Yellow