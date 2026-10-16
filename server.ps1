# Server lokal kecil untuk membuka presentasi HME tanpa instalasi apa pun (khusus localhost, tanpa hak admin).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.webp' = 'image/webp'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.svg' = 'image/svg+xml'
  '.woff2' = 'font/woff2'; '.woff' = 'font/woff'; '.json' = 'application/json'; '.ico' = 'image/x-icon'; '.mp4' = 'video/mp4'
}
$listener = $null; $port = 0
foreach ($p in 8080..8099) {
  try {
    $l = New-Object System.Net.HttpListener
    $l.Prefixes.Add("http://localhost:$p/")
    $l.Start(); $listener = $l; $port = $p; break
  } catch { }
}
if (-not $listener) { Write-Host 'Tidak menemukan port kosong (8080-8099).'; Read-Host 'Tekan Enter untuk menutup'; exit 1 }

$url = "http://localhost:$port/index.html"
Write-Host ''
Write-Host '  PT Hexa Multi Energi - Company Profile' -ForegroundColor Yellow
Write-Host "  Berjalan di $url"
Write-Host '  Jendela ini harus tetap terbuka selama presentasi. Tutup jendela ini untuk berhenti.'
Write-Host ''
if (-not $env:HME_NOBROWSER) { Start-Process $url }

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
    $file = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
    if ($file.StartsWith($root) -and (Test-Path $file -PathType Leaf)) {
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      $ctx.Response.ContentType = $(if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' })
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else { $ctx.Response.StatusCode = 404 }
  } catch { $ctx.Response.StatusCode = 500 }
  finally { $ctx.Response.OutputStream.Close() }
}
