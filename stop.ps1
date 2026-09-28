$ErrorActionPreference = 'Stop'

$appRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $appRoot 'logs\server.pid'
$viteScript = Join-Path $appRoot 'node_modules\vite\bin\vite.js'

try {
  if (-not (Test-Path -LiteralPath $pidFile)) {
    Write-Host 'Shigoto Type is not running, or no launcher PID was recorded.'
    exit 0
  }

  $serverPid = [int](Get-Content -LiteralPath $pidFile -Raw)
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$serverPid" -ErrorAction SilentlyContinue

  if (-not $process) {
    Remove-Item -LiteralPath $pidFile -Force
    Write-Host 'The recorded process has already stopped.'
    exit 0
  }

  $expectedPath = [Regex]::Escape($viteScript)
  if ($process.Name -ne 'node.exe' -or $process.CommandLine -notmatch $expectedPath) {
    throw "PID $serverPid no longer belongs to this application. It was not stopped."
  }

  Stop-Process -Id $serverPid
  Remove-Item -LiteralPath $pidFile -Force
  Write-Host 'Shigoto Type stopped successfully.'
  exit 0
}
catch {
  Write-Host "[ERROR] $($_.Exception.Message)"
  exit 1
}
