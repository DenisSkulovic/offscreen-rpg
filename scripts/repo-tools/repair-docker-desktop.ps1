$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') {
  throw 'Docker Desktop socket repair is Windows-only.'
}

$localRoot = [System.IO.Path]::GetFullPath($env:LOCALAPPDATA).TrimEnd('\')
$runPath = [System.IO.Path]::GetFullPath((Join-Path $localRoot 'Docker\run'))
$secretsPath = [System.IO.Path]::GetFullPath((Join-Path $localRoot 'docker-secrets-engine'))
$dockerDesktop = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'

foreach ($target in @($runPath, $secretsPath)) {
  if (-not $target.StartsWith($localRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Resolved repair target escaped LOCALAPPDATA: $target"
  }
}
if (-not (Test-Path -LiteralPath $dockerDesktop)) {
  throw "Docker Desktop executable is missing: $dockerDesktop"
}

$dockerProcessNames = @(
  'Docker Desktop',
  'com.docker.backend',
  'com.docker.build',
  'com.docker.extensions',
  'com.docker.proxy',
  'com.docker.vpnkit'
)
Get-Process -Name $dockerProcessNames -ErrorAction SilentlyContinue |
  Stop-Process -Force

$deadline = (Get-Date).AddSeconds(10)
do {
  $remaining = Get-Process -Name $dockerProcessNames -ErrorAction SilentlyContinue
  if (-not $remaining) { break }
  Start-Sleep -Milliseconds 250
} while ((Get-Date) -lt $deadline)
if ($remaining) {
  throw 'Docker processes remain; refusing to move its socket directories.'
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$moves = @()
try {
  foreach ($source in @($runPath, $secretsPath)) {
    if (-not (Test-Path -LiteralPath $source)) { continue }
    $destination = "$source.stale-$stamp"
    if (Test-Path -LiteralPath $destination) {
      throw "Repair backup already exists: $destination"
    }
    Move-Item -LiteralPath $source -Destination $destination
    $moves += [pscustomobject]@{ Source = $source; Destination = $destination }
  }
} catch {
  for ($index = $moves.Count - 1; $index -ge 0; $index--) {
    $move = $moves[$index]
    if ((Test-Path -LiteralPath $move.Destination) -and -not (Test-Path -LiteralPath $move.Source)) {
      Move-Item -LiteralPath $move.Destination -Destination $move.Source
    }
  }
  throw
}

Start-Process -FilePath $dockerDesktop -WindowStyle Hidden
Write-Output 'Docker transient socket directories were moved to recoverable timestamped backups.'
foreach ($move in $moves) {
  Write-Output "  $($move.Destination)"
}
Write-Output 'Docker Desktop is restarting. Run pnpm infra:up after its engine is ready.'
