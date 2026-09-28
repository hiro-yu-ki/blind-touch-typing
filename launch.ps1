$ErrorActionPreference = 'Stop'

$appRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$logDirectory = Join-Path $appRoot 'logs'
$launcherLog = Join-Path $logDirectory 'launcher.log'
$serverOutputLog = Join-Path $logDirectory 'server-output.log'
$serverErrorLog = Join-Path $logDirectory 'server-error.log'
$pidFile = Join-Path $logDirectory 'server.pid'
$appUrl = 'http://127.0.0.1:5173/'
$healthUrl = 'http://127.0.0.1:5173/src/data.ts'

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
Set-Content -LiteralPath $launcherLog -Value '' -Encoding UTF8

function Write-LauncherLog {
  param([string]$Message)
  $line = '[{0}] {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Add-Content -LiteralPath $launcherLog -Value $line -Encoding UTF8
  Write-Host $line
}

function Test-ShigotoTypeServer {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 2
    return $response.StatusCode -eq 200 -and $response.Content -match 'export const lessons'
  }
  catch {
    return $false
  }
}

try {
  Set-Location -LiteralPath $appRoot
  Write-LauncherLog "Launcher started. Root: $appRoot"

  $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $nodeCommand) {
    throw 'Node.js was not found. Install Node.js 20 or newer, then sign out of Windows and sign in again.'
  }

  $nodePath = $nodeCommand.Source
  $npmPath = Join-Path (Split-Path -Parent $nodePath) 'npm.cmd'
  if (-not (Test-Path -LiteralPath $npmPath)) {
    throw "npm.cmd was not found: $npmPath"
  }

  $packageJson = Join-Path $appRoot 'package.json'
  if (-not (Test-Path -LiteralPath $packageJson)) {
    throw "package.json was not found: $packageJson"
  }

  $viteScript = Join-Path $appRoot 'node_modules\vite\bin\vite.js'
  if (-not (Test-Path -LiteralPath $viteScript)) {
    Write-LauncherLog 'node_modules is missing. Running the first-time setup.'
    & $npmPath install *>> $launcherLog
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed with exit code $LASTEXITCODE."
    }
  }

  if (-not (Test-Path -LiteralPath $viteScript)) {
    throw "The Vite entry file was not found: $viteScript"
  }

  if (Test-ShigotoTypeServer) {
    Write-LauncherLog 'Shigoto Type is already running. Opening the browser.'
    Start-Process $appUrl
    exit 0
  }

  Set-Content -LiteralPath $serverOutputLog -Value '' -Encoding UTF8
  Set-Content -LiteralPath $serverErrorLog -Value '' -Encoding UTF8

  $viteArguments = '"{0}" --host 127.0.0.1 --port 5173 --strictPort' -f $viteScript
  Write-LauncherLog "Starting Vite. Node: $nodePath"
  $serverProcess = Start-Process -FilePath $nodePath `
    -ArgumentList $viteArguments `
    -WorkingDirectory $appRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $serverOutputLog `
    -RedirectStandardError $serverErrorLog `
    -PassThru

  Set-Content -LiteralPath $pidFile -Value $serverProcess.Id -Encoding ASCII

  for ($attempt = 1; $attempt -le 40; $attempt++) {
    Start-Sleep -Milliseconds 500
    $serverProcess.Refresh()

    if ($serverProcess.HasExited) {
      $errorTail = if (Test-Path -LiteralPath $serverErrorLog) {
        (Get-Content -LiteralPath $serverErrorLog -Tail 20 -ErrorAction SilentlyContinue) -join [Environment]::NewLine
      } else { '' }
      throw "Vite exited during startup. Exit code: $($serverProcess.ExitCode)`n$errorTail"
    }

    if (Test-ShigotoTypeServer) {
      Write-LauncherLog "Startup confirmed. PID: $($serverProcess.Id)"
      Start-Process $appUrl
      exit 0
    }
  }

  throw 'Startup was not confirmed within 20 seconds. Check whether another application is using port 5173.'
}
catch {
  Write-LauncherLog "ERROR: $($_.Exception.Message)"
  Write-LauncherLog 'Also check server-error.log and server-output.log.'
  exit 1
}
