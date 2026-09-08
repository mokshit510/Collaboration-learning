<#
.SYNOPSIS
    PRAMAAN Unified Multi-Service Launcher
.DESCRIPTION
    Launches all 4 PRAMAAN microservices simultaneously in separate PowerShell terminal windows:
      1. Backend           - Port 5000 (npm run dev)
      2. AI Service         - Port 8000 (python server.py)
      3. Desktop Frontend   - Port 5173 (npm run dev)
      4. Mobile Web         - Port 5174 (npm run dev)
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

# 1. Determine PRAMAAN project root directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) {
    $ScriptDir = (Get-Location).Path
}

# Auto-detect service folders
if (Test-Path -LiteralPath (Join-Path $ScriptDir "backend")) {
    $ProjectRoot = $ScriptDir
} elseif (Test-Path -LiteralPath (Join-Path $ScriptDir "Collaboration-learning\backend")) {
    $ProjectRoot = Join-Path $ScriptDir "Collaboration-learning"
} else {
    $cwd = (Get-Location).Path
    if (Test-Path -LiteralPath (Join-Path $cwd "backend")) {
        $ProjectRoot = $cwd
    } elseif (Test-Path -LiteralPath (Join-Path $cwd "Collaboration-learning\backend")) {
        $ProjectRoot = Join-Path $cwd "Collaboration-learning"
    } else {
        Write-Host "[-] ERROR: Could not locate PRAMAAN project folders." -ForegroundColor Red
        Write-Host "    Expected folders: backend, ai-services, frontend, mobile-web" -ForegroundColor Yellow
        exit 1
    }
}

# Set current location to project root
Set-Location -LiteralPath $ProjectRoot

# Display header banner
Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "          PRAMAAN: Unified Multi-Service Launcher               " -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  Project Root: $ProjectRoot" -ForegroundColor DarkGray
Write-Host ""

# 2. Check for port conflicts (informative only)
$busyPorts = @()
foreach ($port in @(5000, 8000, 5173, 5174)) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        $busyPorts += $port
    }
}
if ($busyPorts.Count -gt 0) {
    Write-Host "[!] Note: Port(s) $($busyPorts -join ', ') are already in use." -ForegroundColor Yellow
    Write-Host "    If an existing instance is running, close it first to avoid port conflicts." -ForegroundColor DarkYellow
    Write-Host ""
}

# Helper function to launch a service in a separate PowerShell window
function Start-ServiceWindow {
    param (
        [string]$StepNum,
        [string]$TotalSteps,
        [string]$Name,
        [string]$SubFolder,
        [string]$Command,
        [int]$Port,
        [string]$Url,
        [string]$Color,
        [string]$Category
    )

    $ServiceDir = Join-Path $ProjectRoot $SubFolder

    if (-not (Test-Path -LiteralPath $ServiceDir)) {
        Write-Host "[-] Directory not found for $($Name): $ServiceDir" -ForegroundColor Red
        return
    }

    $escapedDir = $ServiceDir.Replace("'", "''")
    $windowTitle = "PRAMAAN: $Name (Port $Port)"

    $scriptLines = @(
        "`$host.UI.RawUI.WindowTitle = '$windowTitle'"
        "Set-Location -LiteralPath '$escapedDir'"
        "Write-Host '=================================================================' -ForegroundColor $Color"
        "Write-Host '  PRAMAAN: $Name' -ForegroundColor $Color"
        "Write-Host '  Role:        $Category' -ForegroundColor Gray"
        "Write-Host '  Port:        $Port' -ForegroundColor Yellow"
        "Write-Host '  Directory:   $escapedDir' -ForegroundColor DarkGray"
        "Write-Host '  URL:         $Url' -ForegroundColor Green"
        "Write-Host '  Command:     $Command' -ForegroundColor White"
        "Write-Host '=================================================================' -ForegroundColor $Color"
        "Write-Host ''"
        "$Command"
    )

    $scriptText = $scriptLines -join [Environment]::NewLine
    $bytes = [System.Text.Encoding]::Unicode.GetBytes($scriptText)
    $encoded = [Convert]::ToBase64String($bytes)

    $argList = @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-EncodedCommand", $encoded
    )

    Write-Host "  [$StepNum/$TotalSteps] Starting $($Name) on port $Port..." -ForegroundColor $Color -NoNewline
    Start-Process powershell.exe -WorkingDirectory $ServiceDir -ArgumentList $argList
    Write-Host " [STARTED]" -ForegroundColor Green
}

# 3. Step 1: Start Backend (Port 5000)
Start-ServiceWindow `
    -StepNum "1" `
    -TotalSteps "4" `
    -Name "Backend" `
    -SubFolder "backend" `
    -Command "npm run dev" `
    -Port 5000 `
    -Url "http://localhost:5000" `
    -Color "Cyan" `
    -Category "Express REST API & Database Service"

# 4. Step 2: Start AI Service (Port 8000)
Start-ServiceWindow `
    -StepNum "2" `
    -TotalSteps "4" `
    -Name "AI Service" `
    -SubFolder "ai-services" `
    -Command "python server.py" `
    -Port 8000 `
    -Url "http://localhost:8000" `
    -Color "Magenta" `
    -Category "FastAPI Unified AI & Forensic Models"

# 5. Brief pause before frontends to allow core services to initialize
Write-Host ""
Write-Host "  Waiting 2 seconds for backend and AI services to initialize..." -ForegroundColor DarkGray
Start-Sleep -Seconds 2
Write-Host ""

# 6. Step 3: Start Desktop Frontend (Port 5173)
Start-ServiceWindow `
    -StepNum "3" `
    -TotalSteps "4" `
    -Name "Desktop Frontend" `
    -SubFolder "frontend" `
    -Command "npm run dev" `
    -Port 5173 `
    -Url "http://localhost:5173" `
    -Color "Green" `
    -Category "Vite + React Desktop Web Application"

# 7. Step 4: Start Mobile Web (Port 5174)
Start-ServiceWindow `
    -StepNum "4" `
    -TotalSteps "4" `
    -Name "Mobile Web" `
    -SubFolder "mobile-web" `
    -Command "npm run dev" `
    -Port 5174 `
    -Url "http://localhost:5174" `
    -Color "Yellow" `
    -Category "Vite + React Mobile Web Application (LAN enabled)"

# 8. Resolve LAN IP for Mobile Access
$lanIp = "192.168.0.104"
try {
    $detected = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.IPAddress -notlike "127.*" -and
        $_.IPAddress -notlike "169.254.*" -and
        $_.InterfaceAlias -notlike "*Loopback*" -and
        $_.InterfaceAlias -notlike "*vEthernet*"
    } | Select-Object -ExpandProperty IPAddress -First 1)
    if ($detected) {
        $lanIp = $detected
    }
} catch {
    # Keep fallback IP 192.168.0.104
}

# 9. Final Summary Output
Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "                 PRAMAAN SERVICES ACTIVE                         " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "    Backend: http://localhost:5000" -ForegroundColor White
Write-Host "    AI: http://localhost:8000" -ForegroundColor White
Write-Host "    Desktop: http://localhost:5173" -ForegroundColor White
Write-Host "    Mobile: http://localhost:5174" -ForegroundColor White
Write-Host "    Mobile LAN: http://${lanIp}:5174" -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  Each service is running in its own PowerShell terminal window." -ForegroundColor DarkGray
Write-Host "  To stop a service, simply close its corresponding window." -ForegroundColor DarkGray
Write-Host ""
