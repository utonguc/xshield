import "server-only";
import fs from "fs";
import path from "path";
import { queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";

const EXE_PATH  = path.join(process.cwd(), "agent", "xshield_agent.exe");
const TRAY_PATH = path.join(process.cwd(), "agent", "xshield_tray.exe");

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const id    = searchParams.get("id");

  type AgentRow = { id: number; name: string; token: string; subnets: string | null; company_name: string };
  let agent: AgentRow | null = null;

  if (token) {
    // Agent self-update — authenticated by token
    agent = await queryOne<AgentRow>(
      `SELECT na.id, na.name, na.token, na.subnets, c.company_name
       FROM network_agents na JOIN customers c ON c.id = na.customer_id
       WHERE na.token=$1`,
      [token]
    );
    if (!agent) return new Response("Unauthorized", { status: 401 });
  } else {
    // Panel download — authenticated by session
    const session = await getSession();
    if (!session) return new Response("Forbidden", { status: 403 });
    if (!id) return new Response("Bad Request", { status: 400 });
    agent = await queryOne<AgentRow>(
      `SELECT na.id, na.name, na.token, na.subnets, c.company_name
       FROM network_agents na JOIN customers c ON c.id = na.customer_id
       WHERE na.id=$1`,
      [id]
    );
    if (!agent) return new Response("Not Found", { status: 404 });
  }

  if (!fs.existsSync(EXE_PATH)) {
    return new Response("Agent EXE not found on server", { status: 503 });
  }

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://mng.xshield.com.tr";
  const subnets = agent.subnets
    ? agent.subnets.split(",").map((s) => s.trim()).filter(Boolean)
    : ["192.168.1.0/24"];

  const safe = agent.company_name.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const subnetsValue = subnets.join(",");

  // Embed both EXEs as base64 — BAT is self-contained, no network needed during install.
  const exeB64  = fs.readFileSync(EXE_PATH).toString("base64");
  const trayB64 = fs.existsSync(TRAY_PATH)
    ? fs.readFileSync(TRAY_PATH).toString("base64")
    : "";

  // PowerShell one-liner: extract between __EXE_DATA__ and __TRAY_DATA__ markers
  const psExtractAgent =
    `$r=New-Object IO.StreamReader('%BAT_PATH%');$b=New-Object System.Collections.ArrayList;$f=0;` +
    `while(($l=$r.ReadLine())-ne$null){if($f-eq 1){if($l-eq'__TRAY_DATA__'){break};[void]$b.Add($l)}` +
    `elseif($l-eq'__EXE_DATA__'){$f=1}};$r.Close();` +
    `[IO.File]::WriteAllBytes('%EXE_PATH%',[Convert]::FromBase64String(($b-join'')))`;

  // PowerShell one-liner: extract after __TRAY_DATA__ marker
  const psExtractTray =
    `$r=New-Object IO.StreamReader('%BAT_PATH%');$b=New-Object System.Collections.ArrayList;$f=0;` +
    `while(($l=$r.ReadLine())-ne$null){if($f-eq 1){[void]$b.Add($l)}` +
    `elseif($l-eq'__TRAY_DATA__'){$f=1}};$r.Close();` +
    `[IO.File]::WriteAllBytes('%TRAY_PATH%',[Convert]::FromBase64String(($b-join'')))`;

  const hasTray = trayB64.length > 0;

  const bat = [
    `@echo off`,
    `setlocal`,
    ``,
    `net session >nul 2>&1`,
    `if %errorLevel% neq 0 (`,
    `    echo Yonetici haklari gereklidir. Sag tiklayip "Yonetici olarak calistir" secin.`,
    `    pause`,
    `    exit /b 1`,
    `)`,
    ``,
    `set AGENT_TOKEN=${agent.token}`,
    `set AGENT_API_URL=${BASE_URL}`,
    `set AGENT_SUBNETS=${subnetsValue}`,
    `set INSTALL_DIR=C:\\xShield\\Agent`,
    `set EXE_PATH=%INSTALL_DIR%\\xshield_agent.exe`,
    `set TRAY_PATH=%INSTALL_DIR%\\xshield_tray.exe`,
    `set BAT_PATH=%~f0`,
    ``,
    `echo [1/5] Kurulum klasoru hazirlaniyor...`,
    `sc stop xShieldAgent >nul 2>&1`,
    `sc delete xShieldAgent >nul 2>&1`,
    `timeout /t 2 /nobreak >nul`,
    `if not exist "%INSTALL_DIR%" md "%INSTALL_DIR%"`,
    `powershell -ExecutionPolicy Bypass -Command "Add-MpPreference -ExclusionPath '%INSTALL_DIR%' -ExclusionProcess 'xshield_agent.exe' -ExclusionProcess 'xshield_tray.exe' -ErrorAction SilentlyContinue" 2>nul`,
    ``,
    `echo [2/5] xShield Agent hazirlaniyor...`,
    `powershell -ExecutionPolicy Bypass -Command "${psExtractAgent}"`,
    `if not exist "%EXE_PATH%" (`,
    `    echo HATA: Agent EXE olusturulamadi!`,
    `    pause`,
    `    exit /b 1`,
    `)`,
    `powershell -ExecutionPolicy Bypass -Command "Unblock-File -Path '%EXE_PATH%' -ErrorAction SilentlyContinue" 2>nul`,
    `icacls "%EXE_PATH%" /grant "NT AUTHORITY\\SYSTEM:(RX)" /grant "Administrators:(F)" >nul 2>nul`,
    ``,
    ...(hasTray ? [
    `echo [3/5] xShield Tray hazirlaniyor...`,
    `powershell -ExecutionPolicy Bypass -Command "${psExtractTray}"`,
    `if exist "%TRAY_PATH%" (`,
    `    powershell -ExecutionPolicy Bypass -Command "Unblock-File -Path '%TRAY_PATH%' -ErrorAction SilentlyContinue" 2>nul`,
    `    icacls "%TRAY_PATH%" /grant "NT AUTHORITY\\SYSTEM:(RX)" /grant "Administrators:(F)" >nul 2>nul`,
    `)`,
    ] : [`echo [3/5] Tray atlandı (dosya yok).`]),
    ``,
    `echo [4/5] Servis kaydediliyor...`,
    `sc create xShieldAgent binPath= "%INSTALL_DIR%\\xshield_agent.exe" DisplayName= "xShield Network Agent" start= auto`,
    `if %errorLevel% neq 0 (`,
    `    echo HATA: Servis olusturulamadi!`,
    `    pause`,
    `    exit /b 1`,
    `)`,
    `sc description xShieldAgent "xShield network discovery and monitoring agent"`,
    `sc failure xShieldAgent reset= 86400 actions= restart/5000/restart/10000/restart/30000`,
    ``,
    `echo [5/5] Konfigurasyon ve baslangic...`,
    `if not exist "%EXE_PATH%" (`,
    `    echo HATA: EXE bulunamadi - antivirüs karantinaya almis olabilir!`,
    `    echo Cozum: Windows Defender > Karantina > xshield_agent.exe dosyasini geri yukle`,
    `    pause`,
    `    exit /b 1`,
    `)`,
    `reg add "HKLM\\SOFTWARE\\xShield\\Agent" /v Token   /t REG_SZ /d "%AGENT_TOKEN%"   /f >nul`,
    `reg add "HKLM\\SOFTWARE\\xShield\\Agent" /v ApiUrl  /t REG_SZ /d "%AGENT_API_URL%" /f >nul`,
    `reg add "HKLM\\SOFTWARE\\xShield\\Agent" /v Subnets /t REG_SZ /d "%AGENT_SUBNETS%" /f >nul`,
    ...(hasTray ? [
    `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" /v "xShieldTray" /t REG_SZ /d "\\"%TRAY_PATH%\\"" /f >nul`,
    ] : []),
    `sc start xShieldAgent`,
    `timeout /t 2 /nobreak >nul`,
    ...(hasTray ? [
    `if exist "%TRAY_PATH%" start "" "%TRAY_PATH%"`,
    ] : []),
    ``,
    `echo.`,
    `echo xShield Agent kuruldu!`,
    `echo   Token     : %AGENT_TOKEN%`,
    `echo   API URL   : %AGENT_API_URL%`,
    `echo   Subnetler : %AGENT_SUBNETS%`,
    `pause`,
    `exit /b 0`,
    `__EXE_DATA__`,
    exeB64,
    ...(hasTray ? [`__TRAY_DATA__`, trayB64] : []),
  ].join("\r\n");

  console.log(`[agent/download] BAT oluşturuldu: agent=${agent.id} customer=${agent.company_name} tray=${hasTray}`);

  return new Response(bat, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="xshield_agent_${safe}.bat"`,
    },
  });
}
