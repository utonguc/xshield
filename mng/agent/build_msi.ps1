#Requires -RunAsAdministrator
<#
.SYNOPSIS
  xShield Agent MSI build + code signing script.

.DESCRIPTION
  1. Derler Go kaynak kodunu (GOOS=windows GOARCH=amd64)
  2. WiX 3 ile MSI üretir
  3. signtool ile exe + MSI imzalar (sertifika varsa)

.PARAMETER WixDir
  WiX Toolset kurulum dizini. Varsayılan: C:\Program Files (x86)\WiX Toolset v3.11\bin

.PARAMETER CertPfx
  Kod imzalama sertifikası (.pfx). Belirtilmezse imzalama adımı atlanır.

.PARAMETER CertPassword
  PFX şifresi (CertPfx ile birlikte kullanın).

.PARAMETER TimestampUrl
  TSA zaman damgası URL. Varsayılan: http://timestamp.digicert.com

.EXAMPLE
  # Sadece MSI üret (imzasız)
  .\build_msi.ps1

.EXAMPLE
  # Üret + imzala
  .\build_msi.ps1 -CertPfx "C:\certs\xshield_ev.pfx" -CertPassword "P@ssw0rd"
#>

param(
    [string]$WixDir      = "C:\Program Files (x86)\WiX Toolset v3.11\bin",
    [string]$CertPfx     = "",
    [string]$CertPassword= "",
    [string]$TimestampUrl= "http://timestamp.digicert.com"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
Push-Location $ScriptDir

function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host "─────────────────────────────────────────" -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "─────────────────────────────────────────" -ForegroundColor Cyan
}

function Invoke-Cmd([string]$exe, [string[]]$args) {
    Write-Host "> $exe $($args -join ' ')" -ForegroundColor DarkGray
    & $exe @args
    if ($LASTEXITCODE -ne 0) { throw "$exe failed with exit code $LASTEXITCODE" }
}

# ── 1. Go build (opsiyonel — exe zaten varsa atla) ────────────────────────────
Write-Step "1. xshield_agent.exe kontrolü"

if (Test-Path "xshield_agent.exe") {
    $sz = (Get-Item "xshield_agent.exe").Length / 1MB
    Write-Host "  ✓ xshield_agent.exe mevcut ($( '{0:N1}' -f $sz ) MB) — derleme atlandı" -ForegroundColor Green
} elseif (Get-Command go -ErrorAction SilentlyContinue) {
    Write-Host "  ~ xshield_agent.exe bulunamadı, Go ile derleniyor..." -ForegroundColor Yellow
    $env:GOOS        = "windows"
    $env:GOARCH      = "amd64"
    $env:CGO_ENABLED = "0"
    Invoke-Cmd go @("build", "-ldflags", "-s -w", "-o", "xshield_agent.exe", ".")
    Write-Host "  ✓ xshield_agent.exe derlendi" -ForegroundColor Green
} else {
    Write-Host "  HATA: xshield_agent.exe bulunamadı ve Go kurulu değil." -ForegroundColor Red
    Write-Host "  Mevcut kurulum dizininden kopyalayın:" -ForegroundColor Yellow
    Write-Host '  Copy-Item "C:\Program Files\xShield Agent\xshield_agent.exe" .' -ForegroundColor DarkYellow
    exit 1
}

# Tray EXE varsa kontrol et
$hasTray = Test-Path "xshield_tray.exe"
if (-not $hasTray) {
    Write-Host "  ! xshield_tray.exe bulunamadı — tray feature MSI'dan çıkarılacak" -ForegroundColor Yellow
}

# ── 2. WiX check ───────────────────────────────────────────────────────────────
Write-Step "2. WiX Toolset kontrolü"

$candle = Join-Path $WixDir "candle.exe"
$light  = Join-Path $WixDir "light.exe"

if (-not (Test-Path $candle)) {
    Write-Host "  HATA: WiX bulunamadı: $candle" -ForegroundColor Red
    Write-Host "  İndir: https://github.com/wixtoolset/wix3/releases" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✓ WiX: $WixDir" -ForegroundColor Green

# ── 3. WXS hazırlık ────────────────────────────────────────────────────────────
Write-Step "3. WXS hazırlık"

# Tray EXE yoksa WXS'ten FeatureTray component'ini geçici olarak kaldır
$wxsOriginal = Get-Content "xshield_agent.wxs" -Raw
$wxsBuild    = $wxsOriginal

if (-not $hasTray) {
    # CmpTrayExe component ve FeatureTray feature'ını yorum satırına al
    $wxsBuild = $wxsBuild -replace '(?s)(<Component Id="CmpTrayExe".*?</Component>)', '<!-- TRAY_DISABLED $1 -->'
    $wxsBuild = $wxsBuild -replace '(?s)(<Feature Id="FeatureTray".*?</Feature>)', '<!-- TRAY_DISABLED $1 -->'
    Set-Content "xshield_agent_build.wxs" $wxsBuild -Encoding UTF8
    $wxsFile = "xshield_agent_build.wxs"
    Write-Host "  ~ Tray feature devre dışı bırakıldı" -ForegroundColor Yellow
} else {
    $wxsFile = "xshield_agent.wxs"
    Write-Host "  ✓ Tray dahil edildi" -ForegroundColor Green
}

# ── 4. candle (WXS → WIXOBJ) ──────────────────────────────────────────────────
Write-Step "4. candle.exe — WXS → WIXOBJ"

Invoke-Cmd $candle @(
    "-ext", "WixUtilExtension",
    "-ext", "WixUIExtension",
    "-nologo",
    $wxsFile
)

$wixobj = $wxsFile -replace '\.wxs$', '.wixobj'
Write-Host "  ✓ $wixobj oluşturuldu" -ForegroundColor Green

# ── 5. light (WIXOBJ → MSI) ───────────────────────────────────────────────────
Write-Step "5. light.exe — WIXOBJ → MSI"

Invoke-Cmd $light @(
    "-ext", "WixUtilExtension",
    "-ext", "WixUIExtension",
    "-nologo",
    "-cultures:tr-TR",
    "-out", "xshield_agent.msi",
    $wixobj
)

$msiSize = (Get-Item "xshield_agent.msi").Length / 1MB
Write-Host "  ✓ xshield_agent.msi oluşturuldu ($( '{0:N1}' -f $msiSize ) MB)" -ForegroundColor Green

# Geçici dosyaları temizle
if ($wxsFile -eq "xshield_agent_build.wxs") { Remove-Item $wxsFile -ErrorAction SilentlyContinue }
Remove-Item "*.wixobj" -ErrorAction SilentlyContinue
Remove-Item "*.wixpdb" -ErrorAction SilentlyContinue

# ── 6. İmzalama ───────────────────────────────────────────────────────────────
if ($CertPfx -eq "") {
    Write-Host ""
    Write-Host "⚠  İmzalama atlandı (CertPfx belirtilmedi)." -ForegroundColor Yellow
    Write-Host "   İmzalamak için:" -ForegroundColor Yellow
    Write-Host '   .\build_msi.ps1 -CertPfx "C:\certs\xshield_ev.pfx" -CertPassword "şifre"' -ForegroundColor DarkYellow
} else {
    Write-Step "6. signtool — Kod imzalama"

    # signtool.exe yolu (Windows SDK)
    $sdkBin = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64"
    $signtool = Join-Path $sdkBin "signtool.exe"
    if (-not (Test-Path $signtool)) {
        # Farklı SDK sürümleri dene
        $sdkRoot = "C:\Program Files (x86)\Windows Kits\10\bin"
        $signtool = Get-ChildItem $sdkRoot -Filter "signtool.exe" -Recurse |
                    Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
    }
    if (-not $signtool -or -not (Test-Path $signtool)) {
        Write-Host "  HATA: signtool.exe bulunamadı. Windows SDK kurulu mu?" -ForegroundColor Red
        exit 1
    }

    $signArgs = @(
        "sign",
        "/fd",  "SHA256",
        "/tr",  $TimestampUrl,
        "/td",  "SHA256",
        "/f",   $CertPfx,
        "/p",   $CertPassword,
        "/v"
    )

    Write-Host "  → xshield_agent.exe imzalanıyor..."
    Invoke-Cmd $signtool ($signArgs + @("xshield_agent.exe"))
    Write-Host "  ✓ xshield_agent.exe imzalandı" -ForegroundColor Green

    if ($hasTray) {
        Write-Host "  → xshield_tray.exe imzalanıyor..."
        Invoke-Cmd $signtool ($signArgs + @("xshield_tray.exe"))
        Write-Host "  ✓ xshield_tray.exe imzalandı" -ForegroundColor Green
    }

    Write-Host "  → xshield_agent.msi imzalanıyor..."
    Invoke-Cmd $signtool ($signArgs + @("xshield_agent.msi"))
    Write-Host "  ✓ xshield_agent.msi imzalandı" -ForegroundColor Green

    # İmza doğrula
    Write-Host "  → İmza doğrulanıyor..."
    & $signtool verify /pa /v "xshield_agent.msi"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ İmza geçerli" -ForegroundColor Green
    } else {
        Write-Host "  ! İmza doğrulanamadı" -ForegroundColor Yellow
    }
}

# ── Özet ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Green
Write-Host "  MSI hazır: xshield_agent.msi"            -ForegroundColor Green
Write-Host "═══════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Kurulum (GUI):"
Write-Host "    msiexec /i xshield_agent.msi"
Write-Host ""
Write-Host "  Kurulum (sessiz, token ile):"
Write-Host "    msiexec /i xshield_agent.msi AGENT_TOKEN=TOKEN_BURAYA /qb"
Write-Host ""
Write-Host "  Kaldırma:"
Write-Host "    msiexec /x xshield_agent.msi"
Write-Host ""

Pop-Location
