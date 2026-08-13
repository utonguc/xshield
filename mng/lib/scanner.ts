import { spawn } from "child_process";
import { existsSync, unlinkSync, writeFileSync } from "fs";
import { queryOne } from "@/lib/db";

export interface ScanFinding {
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  cvss_score: number | null;
  cve: string | null;
  affected_asset: string;
  description: string;
  exploit_refs: string | null;
  remediation: string;
  verified: boolean;
}

// CVE-specific step-by-step action plans (TR)
const CVE_ACTIONS: Record<string, string> = {
  // Network / OS
  "CVE-2017-0144": "⚠ EternalBlue/MS17-010 — 1) KB4012212 yamasını acilen uygulayın (Win7/2008R2 için KB4012212, Win10 için KB4013429). 2) SMBv1'i kapatın: PowerShell → Set-SmbServerConfiguration -EnableSMB1Protocol $false. 3) Güvenlik duvarında 445/TCP ve 139/TCP internet erişimini engelleyin. 4) Uygulama mümkün değilse sistemi ağ segmentasyonuna alın. 5) Metasploit ms17_010_eternalblue modülü ile sahada kanıt doğrulaması yapın.",
  "CVE-2019-0708": "⚠ BlueKeep (RDP RCE) — 1) KB4499175 (Win7) / KB4499180 (Win2008R2) yamasını uygulayın. 2) NLA (Network Level Authentication) zorunlu kılın: gpedit.msc → Bilgisayar Yapılandırması → İdari Şablonlar → Windows Bileşenleri → Uzak Masaüstü Hizmetleri → NLA Gereksinimini Etkinleştir. 3) TCP 3389'u internetten erişime kapatın; yalnızca VPN üzerinden erişime izin verin. 4) Yamalanamıyorsa RDP servisini durdurun.",
  "CVE-2014-0160": "⚠ Heartbleed (OpenSSL) — 1) OpenSSL'i 1.0.1g veya üstüne güncelleyin. 2) TÜM TLS özel anahtarlarını ve sertifikalarını iptal edip yeniden oluşturun (private key memory'de sızmış olabilir). 3) Tüm kullanıcı şifrelerini ve oturum tokenlarını sıfırlatın. 4) Yama öncesi dönemin tüm TLS loglarını forensics için saklayın. 5) sslyze veya testssl.sh ile yamanın etkinliğini doğrulayın.",
  "CVE-2014-3566": "⚠ POODLE (SSLv3) — 1) SSLv3 ve TLS 1.0'ı sunucu yapılandırmasında tamamen devre dışı bırakın. 2) Apache: SSLProtocol -SSLv3 -TLSv1 +TLSv1.2 +TLSv1.3. 3) Nginx: ssl_protocols TLSv1.2 TLSv1.3. 4) OpenSSL: SSL_CTX_set_options(ctx, SSL_OP_NO_SSLv3|SSL_OP_NO_TLSv1). 5) testssl.sh ile tüm protokolleri yeniden test edin.",
  "CVE-2014-6271": "⚠ Shellshock (Bash) — 1) Bash'i 4.3 patch 25+ sürümüne güncelleyin: apt-get update && apt-get install bash. 2) env -i bash -c 'true' komutuyla yama etkinliğini doğrulayın. 3) CGI scriptlerini WAF arkasına alın veya erişimlerini kısıtlayın. 4) Çevre değişkeni tabanlı kod çalıştırma riskini azaltmak için cgi-bin dizinini gözden geçirin.",
  "CVE-2021-44228": "⚠ Log4Shell (Log4j2) — 1) Log4j2'yi 2.17.1+ (Java 8) veya 2.12.4+ (Java 7) sürümüne güncelleyin. 2) Hemen uygulanamazsa log4j2.formatMsgNoLookups=true JVM parametresini ekleyin. 3) WAF ile ${jndi: kalıbını içeren istekleri engelleyin. 4) Outbound LDAP/RMI trafiğini güvenlik duvarında kısıtlayın. 5) 'java -jar log4j-scan.jar' ile tüm servisleri tarayın.",
  "CVE-2021-26855": "⚠ ProxyLogon (Exchange) — 1) KB5001779 güvenlik güncellemesini acilen uygulayın. 2) Microsoft'un MSERT aracıyla web shell varlığını kontrol edin. 3) IIS loglarında X-AnonResource-Backend ve X-BEResource header'larını filtreleyin. 4) ECP/OWA'yı geçici olarak dışarıdan erişime kapatın.",
  "CVE-2021-34473": "⚠ ProxyShell (Exchange) — 1) Exchange güncellemelerini en son sürüme (CU23+) çıkarın. 2) MSERT ile web shell taraması yapın. 3) OWA ve ECP endpoint'lerini WAF arkasına alın. 4) /autodiscover endpoint loglarını inceleyin.",
  "CVE-2020-1472": "⚠ Zerologon (Netlogon) — 1) DC'lere MS20-1472 yamasını uygulayın. 2) Aşama 2 (Temmuz 2021) enforcement modunu etkinleştirin: HKLM\\SYSTEM\\CurrentControlSet\\Services\\Netlogon\\Parameters → FullSecureChannelProtection = 1. 3) KVNO ve Kerberos biletlerini sıfırlayın. 4) Event ID 5827/5828 alarmlarını izleyin.",
  "CVE-2021-1675":  "⚠ PrintNightmare (Spooler) — 1) KB5004945 yamasını uygulayın. 2) Print Spooler servisini DC üzerinde kapatın: Stop-Service Spooler -Force. 3) Uzak yazdırma özelliğini GPO ile devre dışı bırakın: Computer Config → Admin Templates → Printers → Allow Print Spooler to accept client connections → Disabled.",
  "CVE-2020-0796": "⚠ SMBGhost (SMBv3) — 1) KB4551762 yamasını uygulayın (Win10 1903/1909, Server 1903/1909). 2) Yamalanamıyorsa SMBv3 sıkıştırmasını devre dışı bırakın: Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters' DisableCompression 1. 3) TCP 445'i internetten kapatın.",
  "CVE-2016-5195": "⚠ Dirty COW (Linux Kernel) — 1) Kernel'i 4.8.3+ veya dağıtım güvenlik güncellemesiyle yamayın (Ubuntu: apt-get update && apt-get dist-upgrade). 2) Yama uygulanamıyorsa /tmp noexec ile mount edin. 3) Yamayı uname -r ile doğrulayın. 4) Privilege escalation riski nedeniyle sistemi audit edin.",
  "CVE-2022-22965": "⚠ Spring4Shell — 1) Spring Framework'ü 5.3.18+ veya 5.2.20+ sürümüne güncelleyin. 2) JDK 9+ ile WAR deployment yapıyorsanız CachedIntrospectionResults.clearClassLoader() ile mitigasyon uygulayın. 3) WAF ile class.module.classLoader payload kalıplarını engelleyin.",
  "CVE-2014-0224": "⚠ SSL CCS Injection — 1) OpenSSL'i 0.9.8za+ / 1.0.0m+ / 1.0.1h+ sürümüne güncelleyin. 2) Hem istemci hem sunucu tarafında güncelleme gereklidir. 3) TLS oturumlarında MITM riski nedeniyle aktif saldırı loglarını inceleyin.",
  "CVE-2017-5638": "⚠ Apache Struts (RCE) — 1) Struts'u 2.3.35 veya 2.5.17+ sürümüne güncelleyin. 2) Struts kullanımını doğrulayın ve Jakarta Multipart parser'ı devre dışı bırakın. 3) WAF ile Content-Type header'ındaki OGNL payload kalıplarını engelleyin.",
  "CVE-2008-4250": "⚠ MS08-067 (Windows Server Service) — 1) KB958644 yamasını uygulayın. 2) Bu CVE 2008 tarihli; etkilenen sistem hâlâ kullanılıyorsa derhal modern işletim sistemine geçin (Windows 2016+). 3) Geçiş tamamlanana kadar sistemi ağ izolasyonuna alın, 445/TCP ve 135/TCP erişimini engelleyin.",
  // Web
  "CVE-2017-9805": "⚠ Apache Struts REST Plugin XStream RCE — 1) Struts 2.5.13+ sürümüne güncelleyin. 2) REST plugin kullanmıyorsanız struts2-rest-plugin JAR'ını kaldırın. 3) Outbound HTTP isteklerini güvenlik duvarıyla sınırlandırın.",
  "CVE-2019-11043": "⚠ PHP-FPM Path RCE — 1) PHP'yi 7.1.33+ / 7.2.24+ / 7.3.11+ sürümüne güncelleyin. 2) Nginx yapılandırmasında PATH_INFO geçirilmesini önleyin. 3) fastcgi_split_path_info regex'ini gözden geçirin.",
};

// Context-aware remediation patterns — ordered by specificity
const REMEDIATION_PATTERNS: Array<[RegExp, string]> = [
  // Specific vulnerabilities
  [/heartbleed|cve-2014-0160/i,        "OpenSSL'i 1.0.1g+ sürümüne güncelleyin. Tüm TLS sertifikalarını iptal edip yeniden oluşturun. Tüm kullanıcı şifrelerini ve oturum tokenlarını sıfırlatın."],
  [/poodle|sslv3|tls\s*1\.0/i,         "SSLv3 ve TLS 1.0'ı devre dışı bırakın. Yalnızca TLS 1.2 ve TLS 1.3'e izin verin. Apache: SSLProtocol +TLSv1.2 +TLSv1.3 / Nginx: ssl_protocols TLSv1.2 TLSv1.3."],
  [/ssl.*dh|diffie.hellman|weak.*dh/i, "DH parametrelerini minimum 2048 bit olarak güncelleyin: openssl dhparam -out dhparam.pem 2048. Export-grade şifreleri (EXPORT, DES, RC4) devre dışı bırakın."],
  [/ssl.*ccs|ccs.inject/i,             "OpenSSL'i 0.9.8za+ / 1.0.0m+ / 1.0.1h+ sürümüne güncelleyin. Hem istemci hem sunucu güncellemesi zorunludur."],
  [/self.signed|expired.*cert|cert.*expire/i, "Güvenilir bir CA'dan geçerli SSL sertifikası alın. Let's Encrypt ücretsiz ve otomatik yenilenebilir sertifika sağlar."],
  [/ms17.010|eternalblue|smb.*vuln/i,  "KB4012212 yamasını uygulayın. SMBv1'i kapatın: Set-SmbServerConfiguration -EnableSMB1Protocol $false. 445/TCP'yi internetten engelleyin."],
  [/ms08.067/i,                        "KB958644 yamasını uygulayın. Etkilenen sistem eski ise Windows 2016+'ya geçiş planlayın. Geçiş süresince ağ izolasyonu uygulayın."],
  [/bluekeep|rdp.*rce|cve-2019-0708/i, "KB4499175/KB4499180 yamasını uygulayın. NLA zorunlu kılın. RDP'yi VPN arkasına alın, TCP 3389'u internetten kapatın."],
  [/shellshock|bash.*4\.1|cve-2014-627/i, "Bash'i 4.3 patch 25+ sürümüne güncelleyin. CGI scriptlerini WAF arkasına alın. env -i bash -c 'true' ile doğrulayın."],
  [/log4j|log4shell|jndi/i,            "Log4j2'yi 2.17.1+ sürümüne güncelleyin. Yamalanamıyorsa log4j2.formatMsgNoLookups=true ekleyin. Outbound LDAP/RMI trafiğini kısıtlayın."],
  [/proxylogon|exchange.*rce|cve-2021-26855/i, "Exchange'e KB5001779 yamasını uygulayın. MSERT ile web shell taraması yapın."],
  [/zerologon|netlogon/i,              "MS20-1472 yamasını uygulayın. Enforcement modunu etkinleştirin: FullSecureChannelProtection=1. Event ID 5827/5828 alarmlarını izleyin."],
  [/printnightmare|print.spooler/i,    "KB5004945 yamasını uygulayın. DC üzerinde Print Spooler'ı durdurun: Stop-Service Spooler -Force."],
  // Web vulnerabilities
  [/xss|cross.site.script/i,           "Tüm kullanıcı girdilerini HTML encode edin (htmlspecialchars). Content-Security-Policy başlığı ekleyin: default-src 'self'. X-XSS-Protection: 1; mode=block. HttpOnly cookie flag'i kullanın."],
  [/sql.inject|sqli|' OR|UNION SELECT/i, "Prepared statement (parametreli sorgu) kullanın. ORM tercih edin. Kullanıcı girdilerini whitelist ile doğrulayın. Veritabanı kullanıcısına minimum yetki verin."],
  [/csrf|cross.site.request/i,         "Anti-CSRF token mekanizması uygulayın (Synchronizer Token Pattern). SameSite=Strict cookie özelliğini ekleyin. Origin/Referer header doğrulaması yapın."],
  [/command.inject|os.command|rce|remote.code/i, "Kullanıcı girdilerini kesinlikle shell komutlarına geçirmeyin. execve() ile doğrudan argüman geçirin, shell yorumlamasından kaçının. Girdi whitelist ile doğrulayın."],
  [/path.travers|directory.travers|\.\.\/|\.\.%2F/i, "Dosya yollarını normalize edin ve realpath() ile doğrulayın. İzin verilen dizin dışına çıkışı kontrol edin. Kullanıcı kontrolündeki dosya adlarını asla doğrudan kullanmayın."],
  [/file.upload|unrestricted.upload/i, "Dosya türünü sunucu tarafında doğrulayın (sadece mime-type değil, magic bytes da kontrol edin). Upload edilen dosyaları web root dışında saklayın. Execute izni vermeyin."],
  [/lfi|local.file.inclus/i,           "include/require fonksiyonlarına kullanıcı girdisi geçirmeyin. Whitelist bazlı dosya izni uygulayın. allow_url_include=Off (php.ini). Dosya yollarını mutlak path ile sabitleyın."],
  [/xxe|xml.external.entity/i,         "XML parser'da external entity işlemeyi devre dışı bırakın. PHP: libxml_disable_entity_loader(true). Java: XMLInputFactory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false)."],
  [/ssrf|server.side.request/i,        "URL doğrulaması için whitelist kullanın. İç ağ IP aralıklarına (169.254.x.x, 10.x.x.x, 192.168.x.x) çıkışı engelleyin. HTTP istemci redirect'lerini takip etmeyin."],
  [/open.redirect/i,                   "Redirect hedefini whitelist ile doğrulayın. Kullanıcı girdisini redirect URL'e dahil etmeyin. Göreceli URL kullanın, mutlak URL kullanıyorsanız domain kısıtlaması uygulayın."],
  [/clickjack|x.frame.option/i,        "X-Frame-Options: DENY veya SAMEORIGIN başlığı ekleyin. Content-Security-Policy: frame-ancestors 'none' kullanın."],
  // Authentication / Authorization
  [/default.cred|default.pass|default.login|admin:admin|admin:password/i, "Tüm varsayılan kimlik bilgilerini değiştirin. Güçlü parola politikası uygulayın (min 12 karakter, karmaşık). Hesap kilitleme mekanizması ekleyin (5 başarısız denemede 15 dakika kilit)."],
  [/brute.force|password.spray/i,      "Hesap kilitleme politikası uygulayın. Rate limiting ekleyin. Çok faktörlü kimlik doğrulama (MFA) zorunlu kılın. Fail2ban veya benzeri araç kullanın."],
  [/weak.cipher|rc4|des\b|3des|export.cipher/i, "Zayıf şifreleme algoritmalarını (RC4, DES, 3DES, EXPORT) devre dışı bırakın. Mozilla SSL Config Generator kullanarak güncel yapılandırma alın."],
  [/http.auth|basic.auth|digest.auth/i, "HTTP Basic Auth kullanımını HTTPS üzerinde zorunlu kılın. Daha güvenli kimlik doğrulama mekanizmasına (OAuth2, JWT) geçiş değerlendirin. Varsayılan kimlik bilgilerini değiştirin."],
  // Infrastructure
  [/open.port|unnecessary.*port|service.*expose/i, "Gereksiz açık portları kapatın. Güvenlik duvarı kurallarını gözden geçirin. Yalnızca ihtiyaç duyulan servisleri dışa açın."],
  [/outdated|old.version|eol|end.of.life|out.of.date/i, "Yazılımı en güncel kararlı sürüme güncelleyin. Destek ömrü dolmuş (EOL) sistemleri desteklenen versiyonlara yükseltin veya devre dışı bırakın."],
  [/wordpress|wp-admin|wp-login/i,     "WordPress core, tema ve eklentilerini güncelleyin. wp-admin ve xmlrpc.php'ye IP kısıtlaması uygulayın. Wordfence veya benzeri güvenlik eklentisi kurun. 2FA zorunlu kılın."],
  [/jenkins/i,                         "Jenkins'i güncelleyin. Kimlik doğrulamayı zorunlu kılın. Matris tabanlı güvenliği yapılandırın. Jenkins'i internetten erişime kapatın, VPN arkasına alın."],
  [/phpmyadmin/i,                      "phpMyAdmin'i güncelleyin veya gereksizse kaldırın. IP tabanlı erişim kısıtlaması uygulayın. SSL/TLS zorunlu kılın. Güçlü kimlik doğrulama kullanın."],
  [/elasticsearch|kibana/i,            "Elasticsearch/Kibana güvenlik özelliklerini etkinleştirin (X-Pack Security). Kimlik doğrulama zorunlu kılın. Harici erişimi engelleyin, yalnızca loopback'te dinleyin."],
  [/redis/i,                           "Redis için requirepass ile şifre zorunluluğu uygulayın. Harici erişimi güvenlik duvarıyla engelleyin (6379/TCP). Protected mode'u etkinleştirin."],
  [/mongodb/i,                         "MongoDB kimlik doğrulamasını zorunlu kılın: --auth flag ile başlatın. Harici erişimi engelleyin. TLS bağlantısını etkinleştirin."],
  [/ftp|vsftpd|proftpd/i,              "FTP yerine SFTP veya FTPS kullanın. Anonim FTP erişimini kapatın. Güçlü kimlik doğrulama uygulayın. Gereksizse servisi kapatın."],
  [/telnet/i,                          "Telnet servisini kapatın; yerine SSH kullanın. Güvenlik duvarında 23/TCP'yi engelleyin."],
  [/smb|samba/i,                       "SMBv1'i kapatın. SMB imzalamayı zorunlu kılın. 445/TCP ve 139/TCP'yi gereksiz konumlara kapatın. NTLM kimlik doğrulamasını kısıtlayın."],
  // Info disclosures
  [/server.header|x.powered.by|version.disclos/i, "Server ve X-Powered-By HTTP başlıklarını kaldırın veya gizleyin. Apache: ServerTokens Prod. Nginx: server_tokens off. PHP: expose_php = Off."],
  [/directory.listing|directory.index/i, "Web sunucusunda dizin listelemeyi devre dışı bırakın. Apache: Options -Indexes. Nginx: autoindex off."],
  [/backup.*file|\.bak|\.old|\.backup/i, "Yedek dosyaları web dizininden kaldırın. Web root dışında yedek alın. .htaccess ile bu dosya türlerine erişimi engelleyin."],
  [/git.*exposed|\.git|svn.*exposed/i, "\.git ve \.svn dizinlerini web root'tan kaldırın veya erişimi engelleyin. Apache: <Directory \.git> Deny from all. Nginx: location ~* /\.git { deny all; }"],
  [/env.*exposed|\.env.*file/i,        ".env dosyasını web erişimine kapatın. Hassas bilgileri environment variable olarak yönetin, kaynak koduna yazmayın. .htaccess: <Files .env> Deny from all."],
  // Default fallback
  [/cve-\d{4}-\d+/i,                   "Bu CVE için ilgili yazılımın yaması/güncellemesini uygulayın. NVD (nvd.nist.gov) üzerinden etkilenen versiyonları ve resmi düzeltmeleri kontrol edin."],
];

function buildRemediation(title: string, description: string, cve: string | null): string {
  // 1. CVE-specific detailed action plan
  if (cve && CVE_ACTIONS[cve]) return CVE_ACTIONS[cve];

  const text = `${title} ${description}`;

  // 2. Pattern-based context-aware remediation
  for (const [pattern, remedy] of REMEDIATION_PATTERNS) {
    if (pattern.test(text)) return remedy;
  }

  // 3. Generic fallback
  return "İlgili yazılımı en güncel sürüme güncelleyin. Güvenlik yamalarını düzenli takip edin. Kaynağa özgü CVE referanslarını NVD üzerinden inceleyin.";
}

function cvssToSeverity(score: number): ScanFinding["severity"] {
  if (score >= 9.0) return "critical";
  if (score >= 7.0) return "high";
  if (score >= 4.0) return "medium";
  if (score >= 0.1) return "low";
  return "info";
}

async function appendOutput(scanId: number, text: string) {
  await queryOne("UPDATE scan_jobs SET output = output || $1 WHERE id = $2", [text, scanId]);
}

// Module-level cancel state per scan (survives across async tool calls)
interface ScanState { proc: ReturnType<typeof spawn> | null; cancelled: boolean }
const activeScanStates = new Map<number, ScanState>();

export function cancelScan(scanId: number): void {
  const state = activeScanStates.get(scanId);
  if (state) {
    state.cancelled = true;
    state.proc?.kill("SIGTERM");
  } else {
    activeScanStates.set(scanId, { proc: null, cancelled: true });
  }
}

interface RunToolOpts {
  timeout?: number;
  env?: NodeJS.ProcessEnv;
}

async function runTool(
  scanId: number,
  cmd: string,
  args: string[],
  label: string,
  opts?: RunToolOpts,
): Promise<string> {
  // Skip tool if scan was cancelled before this step
  if (activeScanStates.get(scanId)?.cancelled) return "";

  return new Promise((resolve) => {
    const chunks: string[] = [];
    const sep = "═".repeat(56);
    appendOutput(scanId, `\n${sep}\n▶ ${label}\n   ${[cmd, ...args].join(" ")}\n${sep}\n`);

    let proc: ReturnType<typeof spawn>;
    try {
      proc = spawn(cmd, args, {
        stdio: ["ignore", "pipe", "pipe"],
        env: opts?.env ?? process.env,
      });
    } catch (e: any) {
      const msg = `[HATA] ${cmd} başlatılamadı: ${e.message}\n`;
      appendOutput(scanId, msg);
      return resolve(msg);
    }

    // Register running process so cancelScan() can kill it
    const state = activeScanStates.get(scanId);
    if (state) state.proc = proc;

    let buffer = "";
    const flush = async () => {
      if (!buffer) return;
      const c = buffer; buffer = "";
      chunks.push(c);
      await appendOutput(scanId, c);
    };
    const timer = setInterval(flush, 1500);
    const killer = setTimeout(() => proc?.kill("SIGTERM"), opts?.timeout ?? 300_000);

    proc.stdout?.on("data", (d) => { buffer += d.toString(); });
    proc.stderr?.on("data", (d) => { buffer += d.toString(); });
    proc.on("error", async (e) => {
      clearInterval(timer); clearTimeout(killer);
      const s = activeScanStates.get(scanId); if (s) s.proc = null;
      const msg = `[HATA] ${cmd}: ${e.message}\n`;
      await appendOutput(scanId, msg);
      resolve(msg);
    });
    proc.on("close", async () => {
      clearInterval(timer); clearTimeout(killer);
      const s = activeScanStates.get(scanId); if (s) s.proc = null;
      await flush();
      resolve(chunks.join(""));
    });
  });
}

function extractCVEs(text: string): string[] {
  const raw = text.match(/CVE-\d{4}-\d{4,7}/gi) || [];
  return [...new Set(raw.map(c => c.toUpperCase()))];
}

type RawFinding = Omit<ScanFinding, "cvss_score" | "exploit_refs">;

function parseNmapNikto(output: string, target: string): RawFinding[] {
  const findings: RawFinding[] = [];
  const addedCVEs = new Set<string>();

  // CVE-based findings from nmap vuln scripts
  for (const cve of extractCVEs(output)) {
    if (addedCVEs.has(cve)) continue;
    addedCVEs.add(cve);
    const idx = output.indexOf(cve);
    const ctx = output.substring(Math.max(0, idx - 300), idx + 600);
    const scriptMatch = ctx.match(/\|\s+([\w-]+):/);
    const title = scriptMatch ? `${scriptMatch[1].replace(/-/g, " ")} (${cve})` : `Güvenlik Açığı ${cve}`;
    const verified = /State: VULNERABLE|VULNERABLE:/i.test(ctx);
    findings.push({
      title, cve,
      severity: verified ? "high" : "medium",
      affected_asset: target,
      description: ctx.replace(/\|[\s]*/g, "").replace(/\n+/g, " ").trim().substring(0, 400),
      remediation: buildRemediation(title, ctx, cve),
      verified,
    });
  }

  // nmap VULNERABLE blocks without CVE
  const vulnMatches = output.matchAll(/\|\s+([\w-]+):\s*\n[\s\S]*?State:\s*VULNERABLE/g);
  for (const m of vulnMatches) {
    const name = m[1];
    const ctx = m[0];
    const cveInBlock = extractCVEs(ctx)[0] || null;
    if (cveInBlock && addedCVEs.has(cveInBlock)) continue;
    findings.push({
      title: name.replace(/-/g, " "),
      severity: "high",
      cve: cveInBlock,
      affected_asset: target,
      description: ctx.replace(/\|[\s]*/g, "").trim().substring(0, 300),
      remediation: buildRemediation(name, ctx, cveInBlock),
      verified: true,
    });
    if (cveInBlock) addedCVEs.add(cveInBlock);
  }

  // Detect directory listing from nmap service fingerprint blocks (SF-Port443-TCP etc.)
  const sfBlocks = output.split(/={10,}/);
  for (const block of sfBlocks) {
    const portMatch = block.match(/SF-Port(\d+)-TCP/);
    if (!portMatch) continue;
    if (!/Index(?:\\x20| )of(?:\\x20| )\/|<title>Index of/i.test(block)) continue;
    const port = portMatch[1];
    const scheme = ["443", "8443", "4443"].includes(port) ? "https" : "http";
    const url = `${scheme}://${target}`;
    if (findings.some(f => f.title.includes("Dizin Listeleme") && f.affected_asset === url)) continue;
    findings.push({
      title: `Dizin Listeleme Açık: ${url} (Port ${port})`,
      severity: "high",
      cve: null,
      affected_asset: url,
      description: `Port ${port} üzerinde dizin listeleme (directory listing) tespit edildi. Sunucu tüm dosya yapısını herkese açıyor — kaynak kodu, konfigürasyon dosyaları ve hardcoded kimlik bilgileri saldırganlara görünür olabilir.`,
      remediation: "Dizin listelemeyi kapatın: Nginx → autoindex off; Apache → Options -Indexes; IIS → directoryBrowse enabled=false. Tüm kaynak kod dosyalarını web root dışına taşıyın.",
      verified: true,
    });
  }

  // Nikto findings — ONLY lines that literally start with "+" (nikto format)
  for (const line of output.split("\n")) {
    if (!line.trimStart().startsWith("+")) continue;
    const clean = line.replace(/^\+\s*/, "").trim();
    if (!clean || clean.length < 20) continue;
    if (/^(Target|Start Time|Server:|Nikto|No web server)/i.test(clean)) continue;
    if (clean.startsWith("-")) continue;
    const cveInLine = clean.match(/CVE-\d{4}-\d+/)?.[0] ?? null;
    if (cveInLine && addedCVEs.has(cveInLine)) continue;
    const isHighRisk = /XSS|SQL|injection|RCE|exec|shellshock|traversal/i.test(clean);
    findings.push({
      title: clean.substring(0, 90),
      severity: isHighRisk ? "high" : "medium",
      cve: cveInLine,
      affected_asset: target,
      description: clean,
      remediation: buildRemediation(clean, clean, cveInLine),
      verified: false,
    });
    if (cveInLine) addedCVEs.add(cveInLine);
    if (findings.length > 40) break;
  }

  return findings;
}

function parseNucleiOutput(output: string, target: string): RawFinding[] {
  const findings: RawFinding[] = [];
  for (const line of output.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    try {
      const obj = JSON.parse(t);
      const severityRaw = (obj.info?.severity ?? "info").toLowerCase();
      const severity: ScanFinding["severity"] =
        ["critical", "high", "medium", "low", "info"].includes(severityRaw)
          ? (severityRaw as ScanFinding["severity"])
          : "info";
      const cveMatch = (obj["template-id"] ?? "").match(/CVE-\d{4}-\d+/i);
      const cve = cveMatch ? cveMatch[0].toUpperCase() : null;
      findings.push({
        title: obj.info?.name ?? obj["template-id"] ?? "Nuclei Bulgusu",
        severity,
        cve,
        affected_asset: obj["matched-at"] ?? target,
        description: `[${obj["template-id"]}] ${obj.info?.description ?? ""}`.trim().substring(0, 600),
        remediation: buildRemediation(obj.info?.name ?? obj["template-id"] ?? "", obj.info?.description ?? "", cve),
        verified: true,
      });
    } catch { /* skip non-JSON lines */ }
  }
  return findings;
}

function parseFfufOutput(output: string, target: string): RawFinding[] {
  // ffuf -json outputs a single JSON object; find it in the mixed stdout/stderr
  const jsonStart = output.indexOf('{"commandline"');
  if (jsonStart === -1) return [];
  try {
    const data = JSON.parse(output.substring(jsonStart));
    const results: any[] = data.results ?? [];
    return results
      .filter((r: any) => [200, 204, 301, 302, 307, 401, 403].includes(r.status))
      .slice(0, 25)
      .map((r: any) => {
        const path = r.input?.FUZZ ?? "";
        const isHighRisk = /admin|config|backup|passwd|env|secret|key|token|api|\.git|\.env|upload|shell|manager/i.test(path);
        return {
          title: `Dizin Keşfi: /${path}`,
          severity: (isHighRisk ? "medium" : "low") as ScanFinding["severity"],
          cve: null,
          affected_asset: r.url ?? target,
          description: `HTTP ${r.status} — ${r.url} (${r.length} byte, ${r.words} kelime)`,
          remediation: isHighRisk
            ? "Hassas dizinleri/dosyaları erişime kapatın. Gereksiz endpoint'leri ve yönetim arayüzlerini kaldırın."
            : "İlgili yazılımı en güncel sürüme güncelleyin. Güvenlik yamalarını düzenli takip edin.",
          verified: true,
        };
      });
  } catch { return []; }
}

function parseHttpxOutput(output: string, target: string): RawFinding[] {
  const findings: RawFinding[] = [];
  const riskyTechPattern = /wordpress|drupal|joomla|phpmyadmin|struts|jenkins|grafana|kibana|elasticsearch|weblogic|tomcat|jboss|coldfusion|sharepoint|iis|asp\.net/i;
  const eolPattern = /windows_server_2003|windows_server_2008|windows_xp|windows_2000|windows_nt_4|iis\/[1-6]\.|apache\/1\.|php\/[1-4]\.|php\/5\.[0-3]/i;

  for (const line of output.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    try {
      const obj = JSON.parse(t);
      if (obj.failed) continue;

      const url: string       = obj.url ?? obj.input ?? target;
      const techs: string[]   = obj.tech ?? obj.technologies ?? []; // httpx uses "tech" not "technologies"
      const title: string     = obj.title ?? "";
      const status: number    = obj.status_code ?? 0;
      const webserver: string = obj.webserver ?? "";

      // 1. Directory listing exposed
      if (/^index of\s*\//i.test(title)) {
        findings.push({
          title: `Dizin Listeleme Açık: ${url}`,
          severity: "medium",
          cve: null,
          affected_asset: url,
          description: `${url} adresinde dizin listeleme aktif (HTTP ${status}) — sunucu dosya yapısı herkese açık. Saldırganlar hassas dosyaları keşfedebilir.`,
          remediation: "Web sunucusunda dizin listelemeyi kapatın. Apache: Options -Indexes. Nginx: autoindex off. IIS: directoryBrowse enabled=false.",
          verified: true,
        });
      }

      // 2. Unencrypted HTTP on public endpoint
      if (obj.scheme === "http" && status < 400) {
        findings.push({
          title: `Şifresiz HTTP: ${url}`,
          severity: "medium",
          cve: null,
          affected_asset: url,
          description: `${url} HTTP üzerinden açık — trafik düz metin. Sunucu: ${webserver || "-"}. MITM saldırısına karşı savunmasız.`,
          remediation: "HTTPS zorunlu kılın. HTTP → HTTPS 301 yönlendirmesi ekleyin. HSTS (Strict-Transport-Security) başlığını etkinleştirin. Sertifika için Let's Encrypt kullanın.",
          verified: true,
        });
      }

      // 3. EOL OS/software via CPE
      const cpes: string[] = (obj.cpe ?? []).map((c: any) => (typeof c === "string" ? c : c.cpe ?? ""));
      for (const cpe of cpes) {
        if (eolPattern.test(cpe)) {
          findings.push({
            title: `EOL Yazılım/İşletim Sistemi: ${cpe.split(":")[4] ?? cpe}`,
            severity: "critical",
            cve: null,
            affected_asset: url,
            description: `${url} — Destek ömrü dolmuş (EOL) bileşen tespit edildi: ${cpe}. Bu sistem artık güvenlik güncellemesi almamaktadır ve bilinen exploit'lere karşı savunmasızdır.`,
            remediation: buildRemediation("outdated eol end of life", cpe, null),
            verified: false,
          });
          break;
        }
      }

      // 4. Risky technology
      const risky = techs.filter(t => riskyTechPattern.test(t));
      if (risky.length > 0) {
        findings.push({
          title: `Riskli Teknoloji: ${risky.join(", ")}`,
          severity: "medium",
          cve: null,
          affected_asset: url,
          description: `${url} — Teknolojiler: ${techs.join(", ")}. Sunucu: ${webserver || "-"}, Başlık: "${title || "-"}" (HTTP ${status}).`,
          remediation: buildRemediation(risky.join(" "), techs.join(" "), null),
          verified: false,
        });
      }

    } catch { /* skip non-JSON lines */ }
  }
  return findings;
}

const SENSITIVE_PATHS = [
  "/.env", "/.env.local", "/.env.production", "/.env.development", "/.env.example",
  "/wp-config.php", "/config.php", "/config.js", "/config.json", "/config.yml",
  "/.git/config", "/package.json", "/composer.json", "/yarn.lock",
  "/web.config", "/appsettings.json", "/appsettings.Development.json",
  "/settings.py", "/local_settings.py", "/settings/local.py",
  "/config/database.yml", "/database.yml", "/.htpasswd",
  "/app/api/email/route.ts", "/app/api/send-email/route.ts", "/app/api/mail/route.ts",
  "/pages/api/email.ts", "/pages/api/send-email.ts", "/pages/api/mailer.ts",
  "/src/config.ts", "/src/env.ts", "/src/secrets.ts", "/src/lib/mail.ts",
  "/application/config/database.php", "/config/database.php",
  "/includes/config.php", "/admin/config.php",
  "/config/smtp.php", "/config/mail.php",
];

const CRED_PATTERN = /(?:password|passwd|pass|secret|api[_-]?key|auth[_-]?token|db[_-]?pass|smtp[_-]?pass(?:word)?|mail[_-]?pass(?:word)?|private[_-]?key|access[_-]?key|client[_-]?secret)\s*[=:]\s*['"]?([^\s'"<>\r\n]{6,})/gi;

async function findExposedCredentials(scanId: number, baseUrls: string[]): Promise<RawFinding[]> {
  const findings: RawFinding[] = [];
  await appendOutput(scanId, `\n${"═".repeat(56)}\n🔑 Hassas Dosya ve Kimlik Bilgisi Taraması\n${"═".repeat(56)}\n`);

  for (const baseUrl of baseUrls) {
    const probes = SENSITIVE_PATHS.map(async (path) => {
      try {
        const res = await fetch(`${baseUrl}${path}`, {
          signal: AbortSignal.timeout(6000),
          headers: { "User-Agent": "Mozilla/5.0 (compatible; xShield-Scanner/1.0)" },
          redirect: "follow",
        });
        if (!res.ok) return null;
        const ct = res.headers.get("content-type") ?? "";
        if (!/text|javascript|json|yaml|xml|plain/.test(ct) && !/\.(ts|js|json|php|py|yml|yaml|env|config|rb|ini)$/.test(path)) return null;
        const content = await res.text();
        if (content.length > 150_000) return null;
        return { path, url: `${baseUrl}${path}`, content };
      } catch { return null; }
    });

    const results = await Promise.allSettled(probes);

    for (const r of results) {
      if (r.status !== "fulfilled" || !r.value) continue;
      const { path, url, content } = r.value;

      const matches = [...content.matchAll(CRED_PATTERN)];
      if (matches.length > 0) {
        await appendOutput(scanId, `  🚨 KİMLİK BİLGİSİ BULUNDU: ${url}\n`);
        const sample = matches.slice(0, 3).map(m => m[0].substring(0, 100)).join(" | ");
        findings.push({
          title: `Kaynak Kodda Hardcoded Kimlik Bilgisi: ${path}`,
          severity: "critical",
          cve: null,
          affected_asset: url,
          description: `Dosyada hardcoded kimlik bilgisi tespit edildi (${url}): ${sample}. Bu bilgiler saldırganlar tarafından e-posta sunucusu, veritabanı veya API sistemlerine yetkisiz erişim için kullanılabilir.`,
          remediation: "Hardcoded kimlik bilgilerini derhal kaldırın ve sızdırılan tüm şifreleri değiştirin. Ortam değişkenleri (.env + process.env) veya secrets manager (Vault, AWS Secrets Manager) kullanın. Dosyayı web erişimine kapatın veya web root dışına taşıyın.",
          verified: true,
        });
      } else {
        const isCriticalFile = [".env", "wp-config.php", ".git/config", "appsettings.json", "database.yml", ".htpasswd"].some(s => path.includes(s));
        if (isCriticalFile) {
          await appendOutput(scanId, `  ⚠ Hassas dosya erişilebilir (credential tespit edilmedi): ${url}\n`);
          findings.push({
            title: `Hassas Yapılandırma Dosyası Erişilebilir: ${path}`,
            severity: "high",
            cve: null,
            affected_asset: url,
            description: `${url} dosyası herkese açık erişilebilir durumda. Hassas yapılandırma bilgileri içerebilir.`,
            remediation: "Bu dosyayı web root dışına taşıyın. Web sunucusu erişim kurallarıyla (deny from all / location ~ { deny all; }) koruyun.",
            verified: true,
          });
        }
      }
    }
  }

  return findings;
}

async function fetchCVEDetails(cve: string): Promise<{ cvss: number | null; description: string; exploitRefs: string[] }> {
  try {
    const res = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cve}`, {
      headers: { "User-Agent": "xShield-MNG/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { cvss: null, description: "", exploitRefs: [] };
    const data = await res.json();
    const vuln = data.vulnerabilities?.[0]?.cve;
    if (!vuln) return { cvss: null, description: "", exploitRefs: [] };

    const cvss = vuln.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore
      ?? vuln.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore
      ?? vuln.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore ?? null;

    const description = vuln.descriptions?.find((d: any) => d.lang === "en")?.value ?? "";

    const exploitRefs: string[] = (vuln.references ?? [])
      .filter((r: any) =>
        r.url?.includes("exploit-db") ||
        r.url?.includes("packetstormsecurity") ||
        r.tags?.some((t: string) => t === "Exploit")
      )
      .map((r: any) => r.url as string)
      .slice(0, 4);

    return { cvss, description, exploitRefs };
  } catch {
    return { cvss: null, description: "", exploitRefs: [] };
  }
}

export async function runScan(scanId: number, target: string, scanType: string): Promise<void> {
  // Initialize cancel state (may already exist if cancelScan() was called before we started)
  if (!activeScanStates.has(scanId)) {
    activeScanStates.set(scanId, { proc: null, cancelled: false });
  }
  const isCancelled = () => activeScanStates.get(scanId)?.cancelled === true;

  if (isCancelled()) {
    await queryOne("UPDATE scan_jobs SET status='cancelled', completed_at=NOW() WHERE id=$1", [scanId]);
    activeScanStates.delete(scanId);
    return;
  }

  await queryOne("UPDATE scan_jobs SET status='running', started_at=NOW() WHERE id=$1", [scanId]);
  await appendOutput(scanId, `🎯 Hedef : ${target}\n⏰ Başlangıç: ${new Date().toLocaleString("tr-TR")}\n\n`);

  const clean = target.replace(/^https?:\/\//, "").split("/")[0].split("?")[0];
  const httpTarget = target.startsWith("http") ? target : `http://${target}`;
  const httpsTarget = `https://${clean}`;
  const subsFile = `/tmp/subs_${scanId}.txt`;
  const probeFile = `/tmp/probe_${scanId}.txt`;

  let nmapNiktoOutput = "";
  let nucleiOutput = "";
  let ffufOutput = "";
  let httpxOutput = "";

  // Always probe main target via httpx for web-relevant scan types
  if (["discovery", "web", "full", "ssl"].includes(scanType)) {
    try {
      writeFileSync(probeFile, `${httpTarget}\n${httpsTarget}\n`);
      httpxOutput += await runTool(
        scanId, "httpx",
        [
          "-l", probeFile,
          "-json", "-silent", "-title", "-tech-detect", "-status-code",
          "-web-server", "-follow-redirects", "-timeout", "10",
        ],
        "HTTP/HTTPS Probe — Ana Hedef (httpx)",
        { timeout: 60_000 },
      );
    } catch { /* ignore file write errors */ }
  }

  if (["discovery", "full"].includes(scanType)) {
    nmapNiktoOutput += await runTool(
      scanId, "nmap",
      ["-sV", "-O", "-T4", "--top-ports", "500", "--open", clean],
      "Keşif + OS Tespiti (Nmap)",
    );
  }
  if (["vuln", "full"].includes(scanType)) {
    nmapNiktoOutput += await runTool(
      scanId, "nmap",
      ["--script", "vuln", "-sV", "-T4", "--open", clean],
      "Güvenlik Açığı Taraması (Nmap Vuln Scripts)",
    );
  }
  if (["ssl", "full"].includes(scanType)) {
    nmapNiktoOutput += await runTool(
      scanId, "nmap",
      [
        "--script", "ssl-enum-ciphers,ssl-cert,ssl-heartbleed,ssl-poodle,ssl-dh-params,ssl-ccs-injection",
        "-p", "443,8443,993,465,587", clean,
      ],
      "SSL/TLS Analizi (Nmap)",
    );
  }
  if (["web", "full"].includes(scanType)) {
    nmapNiktoOutput += await runTool(
      scanId, "nikto",
      ["-h", httpTarget, "-maxtime", "120"],
      "Web Uygulama Taraması (Nikto)",
    );
    nmapNiktoOutput += await runTool(
      scanId, "whatweb",
      ["-a", "3", "--no-errors", httpTarget],
      "Web Teknoloji Tespiti (WhatWeb)",
    );
  }
  const aliveSubUrls: string[] = [];

  if (["subdomains", "full"].includes(scanType)) {
    await runTool(
      scanId, "subfinder",
      ["-d", clean, "-silent", "-o", subsFile],
      "Alt Alan Adı Keşfi (Subfinder)",
      { timeout: 120_000 },
    );
    if (existsSync(subsFile)) {
      const subHttpxOut = await runTool(
        scanId, "httpx",
        [
          "-l", subsFile,
          "-json", "-silent", "-title", "-tech-detect", "-status-code",
          "-web-server", "-follow-redirects", "-timeout", "10",
        ],
        "HTTP Probe + Teknoloji Tespiti (httpx) — Subdomainler",
        { timeout: 120_000 },
      );
      httpxOutput += subHttpxOut;

      // Extract alive subdomain URLs for deep scanning
      for (const line of subHttpxOut.split("\n")) {
        const t = line.trim();
        if (!t.startsWith("{")) continue;
        try {
          const obj = JSON.parse(t);
          if (!obj.failed && obj.url) aliveSubUrls.push(obj.url as string);
        } catch { /* skip */ }
      }

      // Deep scan alive subdomains: nikto on top 5, nuclei on all
      if (aliveSubUrls.length > 0) {
        await appendOutput(scanId, `\n📡 ${aliveSubUrls.length} canlı subdomain tespit edildi — derin tarama başlıyor...\n`);

        for (const subUrl of aliveSubUrls.slice(0, 5)) {
          if (isCancelled()) break;
          nmapNiktoOutput += await runTool(
            scanId, "nikto",
            ["-h", subUrl, "-maxtime", "60"],
            `Web Tarama (Nikto): ${subUrl}`,
            { timeout: 120_000 },
          );
        }

        if (!isCancelled() && aliveSubUrls.length > 0) {
          const subNucleiFile = `/tmp/subnuclei_${scanId}.txt`;
          try {
            writeFileSync(subNucleiFile, aliveSubUrls.join("\n") + "\n");
            nucleiOutput += await runTool(
              scanId, "nuclei",
              [
                "-l", subNucleiFile,
                "-severity", "critical,high,medium",
                "-no-interactsh",
                "-jsonl",
                "-timeout", "10",
                "-bulk-size", "25",
                "-rate-limit", "50",
              ],
              "Zafiyet Taraması (Nuclei) — Subdomainler",
              { timeout: 300_000, env: { ...process.env, HOME: "/opt/nuclei-home" } },
            );
          } catch { /* ignore */ } finally {
            try { if (existsSync(subNucleiFile)) unlinkSync(subNucleiFile); } catch { /* ignore */ }
          }
        }
      }
    }
  }
  if (["fuzz", "full"].includes(scanType)) {
    // Prefer HTTPS for fuzzing — most modern servers respond there
    const fuzzBase = target.startsWith("https://") ? target : httpsTarget;
    ffufOutput = await runTool(
      scanId, "ffuf",
      [
        "-u", `${fuzzBase}/FUZZ`,
        "-w", "/opt/wordlists/common.txt",
        "-mc", "200,204,301,302,307,401,403",
        "-t", "50", "-timeout", "10", "-json",
      ],
      "Dizin/Dosya Keşfi — HTTPS (ffuf)",
      { timeout: 180_000 },
    );
    // Also try HTTP if HTTPS had all errors
    if (!ffufOutput.includes('"results"')) {
      ffufOutput += await runTool(
        scanId, "ffuf",
        [
          "-u", `${httpTarget}/FUZZ`,
          "-w", "/opt/wordlists/common.txt",
          "-mc", "200,204,301,302,307,401,403",
          "-t", "50", "-timeout", "10", "-json",
        ],
        "Dizin/Dosya Keşfi — HTTP fallback (ffuf)",
        { timeout: 180_000 },
      );
    }
  }
  if (["nuclei", "full"].includes(scanType)) {
    // Use full HTTPS URL so nuclei's internal httpx can resolve the target
    const nucleiTarget = target.startsWith("http") ? target : httpsTarget;
    nucleiOutput = await runTool(
      scanId, "nuclei",
      [
        "-u", nucleiTarget,
        "-severity", "critical,high,medium",
        "-no-interactsh",
        "-jsonl",
        "-timeout", "10",
        "-bulk-size", "25",
        "-rate-limit", "50",
      ],
      "Zafiyet Şablonu Taraması (Nuclei)",
      { timeout: 300_000, env: { ...process.env, HOME: "/opt/nuclei-home" } },
    );
  }

  // Sensitive file & credential discovery — main target + alive subdomains
  let credentialFindings: RawFinding[] = [];
  if (!isCancelled() && ["web", "full", "subdomains"].includes(scanType)) {
    const credTargets = [httpsTarget, httpTarget, ...aliveSubUrls.slice(0, 20)];
    credentialFindings = await findExposedCredentials(scanId, credTargets);
  }

  await appendOutput(scanId, `\n${"═".repeat(56)}\n📊 BULGULAR ANALİZ EDİLİYOR…\n${"═".repeat(56)}\n`);

  // Merge all findings and deduplicate by title prefix
  const raw: RawFinding[] = [
    ...parseNmapNikto(nmapNiktoOutput, target),
    ...parseNucleiOutput(nucleiOutput, target),
    ...parseFfufOutput(ffufOutput, target),
    ...parseHttpxOutput(httpxOutput, target),
    ...credentialFindings,
  ];

  const seen = new Set<string>();
  const deduped = raw.filter(f => {
    const key = f.title.substring(0, 60).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const enriched: ScanFinding[] = [];
  for (const f of deduped) {
    let cvss: number | null = null;
    let exploitRefs: string | null = null;
    if (f.cve) {
      await appendOutput(scanId, `  🔍 ${f.cve} → NVD sorgulanıyor…\n`);
      const d = await fetchCVEDetails(f.cve);
      cvss = d.cvss;
      if (d.cvss) f.severity = cvssToSeverity(d.cvss);
      // Prefer NVD description (EN, authoritative) over parser-extracted context
      if (d.description) f.description = d.description.substring(0, 600);
      if (d.exploitRefs.length) {
        exploitRefs = d.exploitRefs.join("\n");
        await appendOutput(scanId, `  ⚡ ${d.exploitRefs.length} exploit referansı bulundu\n`);
      }
      // Upgrade remediation to CVE-specific action plan if available
      if (CVE_ACTIONS[f.cve]) {
        f.remediation = CVE_ACTIONS[f.cve];
      } else if (d.cvss && d.cvss >= 7.0) {
        // High/critical CVE without a specific plan: enrich with CVSS context
        f.remediation = `CVSS ${d.cvss} — ${f.remediation}`;
      }
    }
    enriched.push({ ...f, cvss_score: cvss, exploit_refs: exploitRefs });
  }

  // cleanup temp files
  try { if (existsSync(subsFile)) unlinkSync(subsFile); } catch { /* ignore */ }
  try { if (existsSync(probeFile)) unlinkSync(probeFile); } catch { /* ignore */ }

  if (isCancelled()) {
    activeScanStates.delete(scanId);
    await appendOutput(scanId, `\n⏹ Tarama kullanıcı tarafından durduruldu — ${enriched.length} bulgu tespit edildi.\n`);
    await queryOne(
      "UPDATE scan_jobs SET status='cancelled', completed_at=NOW(), findings_json=$1 WHERE id=$2",
      [JSON.stringify(enriched), scanId],
    );
    return;
  }

  activeScanStates.delete(scanId);
  await appendOutput(scanId, `\n✅ Tarama tamamlandı — ${enriched.length} bulgu tespit edildi.\n`);
  await queryOne(
    "UPDATE scan_jobs SET status='completed', completed_at=NOW(), findings_json=$1 WHERE id=$2",
    [JSON.stringify(enriched), scanId],
  );
}
