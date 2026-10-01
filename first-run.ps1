# HackMate first-run helper for Windows PowerShell (5.1 and 7+).
#
# Run it from the extracted hackmate folder (the one containing package.json):
#
#   powershell -ExecutionPolicy Bypass -File .\first-run.ps1
#
# If your local Postgres user has a password:
#
#   powershell -ExecutionPolicy Bypass -File .\first-run.ps1 -PgPassword "mypassword"
#
# What it does: install deps -> create .env.local -> create database ->
# run migrations -> seed taxonomy -> start the dev server on
# http://localhost:3000 (the sign-in hero page).

param(
    [string]$PgPassword = ""
)

$ErrorActionPreference = "Stop"

function Write-Step($msg)  { Write-Host "" ; Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "    $msg" -ForegroundColor Green }
function Write-Fail($msg)  { Write-Host "!   $msg" -ForegroundColor Red }

# --- 0. Must run from the project root -------------------------------------
if (-not (Test-Path ".\package.json")) {
    Write-Fail "package.json not found in the current folder."
    Write-Fail "Open PowerShell inside the extracted hackmate folder first:"
    Write-Fail '    cd C:\path\to\hackmate'
    exit 1
}

# --- 1. Pick a package manager (bun preferred, npm fallback) ----------------
$pm = "npm"
if (Get-Command bun -ErrorAction SilentlyContinue) { $pm = "bun" }
Write-Step "Using $pm"

if ($pm -eq "bun") { bun install } else { npm install }
if ($LASTEXITCODE -ne 0) { Write-Fail "dependency install failed"; exit 1 }
Write-Ok "dependencies installed"

# --- 2. Create .env.local ----------------------------------------------------
if (Test-Path ".\.env.local") {
    Write-Step ".env.local already exists, keeping it"
} else {
    Write-Step "Creating .env.local"
    if ($PgPassword -ne "") {
        if ($pm -eq "bun") { bun run setup -- $PgPassword } else { npm run setup -- $PgPassword }
    } else {
        if ($pm -eq "bun") { bun run setup } else { npm run setup }
    }
    if ($LASTEXITCODE -ne 0) { Write-Fail "setup failed"; exit 1 }
}

# --- 3. Database --------------------------------------------------------------
Write-Step "Creating the hackmate database (Postgres must be running)"
if ($pm -eq "bun") { bun run db:create } else { npm run db:create }
if ($LASTEXITCODE -ne 0) {
    Write-Fail "could not reach the Postgres server."
    Write-Fail "Start it from an Administrator PowerShell, then rerun this script:"
    Write-Fail "    Start-Service postgresql-x64-18"
    Write-Fail "(service name differs per version: postgresql-x64-16, -15, ...)"
    exit 1
}

Write-Step "Applying migrations"
if ($pm -eq "bun") { bun run db:migrate } else { npm run db:migrate }
if ($LASTEXITCODE -ne 0) { Write-Fail "migrations failed"; exit 1 }

Write-Step "Seeding skills, roles and badges"
if ($pm -eq "bun") { bun run db:seed } else { npm run db:seed }
if ($LASTEXITCODE -ne 0) { Write-Fail "seed failed"; exit 1 }

Write-Ok "optional: demo people/teams later with:  bun run db:seed:demo"

# --- 4. Start ------------------------------------------------------------------
Write-Step "Starting the dev server: http://localhost:3000"
Write-Ok "press Ctrl+C to stop it"
if ($pm -eq "bun") { bun run dev } else { npm run dev }
