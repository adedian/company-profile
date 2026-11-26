# Upload isi folder deploy-infinityfree ke InfinityFree lewat FTP.
# Jalankan di PowerShell:  .\upload-infinityfree.ps1
# Password FTP dimasukkan saat diminta (tidak disimpan di file).
param(
    [string]$FtpHost   = 'ftpupload.net',
    [string]$User      = 'if0_43101494',
    [string]$Domain    = 'digital-company-profile.infinityfree.me',
    [string]$LocalDir  = (Join-Path $PSScriptRoot 'deploy-infinityfree'),
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path $LocalDir)) { throw "Folder $LocalDir tidak ditemukan" }

$files = Get-ChildItem $LocalDir -Recurse -File
Write-Host "$($files.Count) file akan diupload dari $LocalDir" -ForegroundColor Cyan
if ($DryRun) { $files | ForEach-Object { $_.FullName.Substring($LocalDir.Length + 1) }; return }

$sec  = Read-Host "Password FTP untuk $User (lihat di dashboard > akun > FTP Details)" -AsSecureString
$pass = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
$cred = New-Object Net.NetworkCredential($User, $pass)

function New-Ftp($path, $method) {
    $r = [Net.FtpWebRequest]::Create("ftp://$FtpHost/$($path.TrimStart('/'))")
    $r.Method = $method; $r.Credentials = $cred; $r.UsePassive = $true; $r.UseBinary = $true; $r.KeepAlive = $false
    $r
}
function Get-List($path) {
    $r = New-Ftp $path ([Net.WebRequestMethods+Ftp]::ListDirectory)
    $s = New-Object IO.StreamReader($r.GetResponse().GetResponseStream())
    $t = $s.ReadToEnd(); $s.Close()
    $t -split "`r?`n" | Where-Object { $_ }
}

# Cari folder htdocs (bisa langsung /htdocs atau /<domain>/htdocs)
$root = Get-List '/'
Write-Host "Isi root FTP: $($root -join ', ')"
if ($root -contains $Domain)   { $remote = "/$Domain/htdocs" }
elseif ($root -contains 'htdocs') { $remote = '/htdocs' }
else { throw "Folder htdocs tidak ketemu di root FTP. Isi root: $($root -join ', ')" }
Write-Host "Target upload: $remote" -ForegroundColor Cyan

$made = @{}
function Ensure-Dir($dir) {
    if ($made[$dir]) { return }
    $parts = $dir.Trim('/') -split '/'; $cur = ''
    foreach ($p in $parts) {
        $cur += "/$p"
        if ($made[$cur]) { continue }
        try { (New-Ftp $cur ([Net.WebRequestMethods+Ftp]::MakeDirectory)).GetResponse().Close() } catch { }
        $made[$cur] = $true
    }
}

$i = 0; $fail = @()
foreach ($f in $files) {
    $i++
    $rel  = $f.FullName.Substring($LocalDir.Length + 1).Replace('\', '/')
    $dest = "$remote/$rel"
    Ensure-Dir (Split-Path $dest -Parent).Replace('\', '/')
    try {
        $r = New-Ftp $dest ([Net.WebRequestMethods+Ftp]::UploadFile)
        $r.ContentLength = $f.Length
        $in = [IO.File]::OpenRead($f.FullName); $out = $r.GetRequestStream()
        $in.CopyTo($out); $out.Close(); $in.Close()
        $r.GetResponse().Close()
        Write-Host ("[{0}/{1}] OK   {2}" -f $i, $files.Count, $rel)
    } catch {
        Write-Host ("[{0}/{1}] GAGAL {2} : {3}" -f $i, $files.Count, $rel, $_.Exception.Message) -ForegroundColor Red
        $fail += $rel
    }
}
if ($fail.Count) { Write-Host "`n$($fail.Count) file gagal, jalankan ulang skrip untuk mengulang." -ForegroundColor Yellow }
else { Write-Host "`nSelesai. Buka http://$Domain" -ForegroundColor Green }
