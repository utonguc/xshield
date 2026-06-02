# xShield Agent — MSI Kurulum Paketi ve Kod İmzalama

## Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `xshield_agent.wxs` | WiX kaynak — MSI tanımı (UI, servis, registry, Defender exclusion) |
| `license.rtf` | Lisans metni (kurulum ekranında gösterilir) |
| `build_msi.ps1` | Windows build + imzalama scripti |

---

## MSI'nın yaptıkları

1. **Token + API URL girişi** — kurulum sihirbazı kullanıcıdan alır
2. **Registry yazımı** — `HKLM\SOFTWARE\xShield\Agent\Token` ve `ApiUrl` (ajan açılışta buradan okur)
3. **Servis kurulumu** — `xShieldAgent` Windows servisi; `LocalSystem` hesabıyla, otomatik başlangıç
4. **Servis kurtarma** — 3 hatadan sonra 10 saniyede otomatik yeniden başlatma
5. **Windows Defender exclusion** — `C:\Program Files\xShield Agent` yolu otomatik hariç tutulur
6. **Temiz kaldırma** — `msiexec /x` ile servis durur, silinir, dosyalar ve registry temizlenir

---

## Gereksinimler (Windows makinesinde)

### WiX Toolset 3.11
```
https://github.com/wixtoolset/wix3/releases/latest
→ wix311.exe → Install
```

### Windows SDK (signtool için)
```
https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/
→ "Signing Tools for Desktop Apps" seçeneğini işaretleyin
```

---

## Build

```powershell
# Yönetici olarak PowerShell açın
cd C:\xShield\Agent   # (veya wxs dosyasının bulunduğu dizin)

# İmzasız MSI üret (test için)
.\build_msi.ps1

# İmzalı MSI üret (production)
.\build_msi.ps1 -CertPfx "C:\certs\xshield_ev.pfx" -CertPassword "şifre"
```

---

## Kod İmzalama Sertifikası

Antivirüs imza veritabanlarında tanınmak ve SmartScreen uyarısını kaldırmak için  
**EV (Extended Validation) Kod İmzalama Sertifikası** gereklidir.

### Neden EV?

| OV Sertifikası | EV Sertifikası |
|----------------|----------------|
| Temel doğrulama | Şirket fiziksel doğrulaması |
| SmartScreen uyarısı gösterilebilir | SmartScreen uyarısı yok |
| AV itibar birikimi zaman alır | Anlık itibar (Microsoft, Trend Micro, vb.) |
| USB token gerekmez | USB donanım tokeni (zorunlu) |
| ~150-300 $/yıl | ~300-500 $/yıl |

### Tedarik

Aşağıdaki CA'lardan herhangi biri kabul edilir:

| CA | URL | Not |
|----|-----|-----|
| **DigiCert** | digicert.com/code-signing | En hızlı onay (~1-3 gün) |
| **Sectigo** | sectigo.com/ssl-certificates-tls/code-signing | Uygun fiyat |
| **GlobalSign** | globalsign.com/en/code-signing-certificate | Kurumsal tercih |
| **Certum** | certum.eu | Avrupa, uygun fiyat |

> **Türkiye'den tedarik için**: DigiCert veya Sectigo en yaygın kullanılan seçeneklerdir.  
> Şirket belgesi (vergi levhası, imza sirküleri) ve kimlik gerekir.

### EV Token ile imzalama

EV sertifikaları USB donanım tokeni ile gelir. İmzalama komutu:

```powershell
# Token + pin ile (DigiCert/Sectigo DigiCertUtil ya da SafeNet token)
signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 `
    /n "xShield Teknoloji" /v xshield_agent.msi
```

veya pfx export mümkünse:

```powershell
signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 `
    /f xshield_ev.pfx /p "TOKEN_ŞIFRE" /v xshield_agent.msi
```

---

## AV Vendor Submission (Sertifika Alındıktan Sonra)

İmzalı MSI'ı major AV firmalarına gönderin:

| Vendor | Portal | Süre |
|--------|--------|------|
| Microsoft Defender | security.microsoft.com/intel-report | 1-3 gün |
| Trend Micro (Apex One) | trendmicro.com/en_us/about/legal/privacy-portal.html → Whitelist | 3-5 gün |
| ESET | support.eset.com/en/kb6 → "Submit sample" | 2-5 gün |
| Kaspersky | opentip.kaspersky.com | 1-3 gün |
| Bitdefender | bitdefender.com/en-us/business/tools/whitelist-tool | 2-5 gün |

---

## Kurulum Örnekleri (Müşteri tarafında)

```batch
REM GUI ile kurulum (önerilen)
msiexec /i "xShield Agent.msi"

REM Sessiz kurulum — IT yöneticisi için
msiexec /i "xShield Agent.msi" AGENT_TOKEN=abc123 AGENT_APIURL=https://mng.xshield.com.tr /qb

REM Tamamen sessiz
msiexec /i "xShield Agent.msi" AGENT_TOKEN=abc123 /quiet /norestart

REM Kaldırma
msiexec /x "xShield Agent.msi" /quiet
```
