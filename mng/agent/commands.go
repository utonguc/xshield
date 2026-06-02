package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"
)

type PollResponse struct {
	Commands        []AgentCommand `json:"commands"`
	Subnets         []string       `json:"subnets"`
	LatestVersion   string         `json:"latest_version"`
	WMIUser         string         `json:"wmi_user"`
	WMIPass         string         `json:"wmi_pass"`
	SNMPCommunities []string       `json:"snmp_communities"`
	ADConfig        *ADConfig      `json:"ad_config"`
}

var currentADConfig *ADConfig

type AgentCommand struct {
	ID      int             `json:"id"`
	Command string          `json:"command"`
	Params  json.RawMessage `json:"params"`
}

type AckPayload struct {
	Token     string `json:"token"`
	CommandID int    `json:"command_id"`
	Status    string `json:"status"` // "done" | "error"
	Result    string `json:"result,omitempty"`
}

func pollCommands() {
	url := cfg.APIURL + "/api/agent/poll?token=" + cfg.Token + "&version=" + AgentVersion
	resp, err := httpClient.Get(url)
	if err != nil {
		logger.Printf("[poll] Hata: %v", err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		logger.Printf("[poll] HTTP %d", resp.StatusCode)
		return
	}

	body, _ := io.ReadAll(resp.Body)
	var pr PollResponse
	if err := json.Unmarshal(body, &pr); err != nil {
		logger.Printf("[poll] Parse hatası: %v", err)
		return
	}

	if len(pr.Subnets) > 0 {
		cfg.Subnets = pr.Subnets
	}
	if pr.WMIUser != "" {
		cfg.WMIUser = pr.WMIUser
		cfg.WMIPass = pr.WMIPass
	}
	if len(pr.SNMPCommunities) > 0 {
		cfg.SNMPCommunities = pr.SNMPCommunities
	}
	if pr.ADConfig != nil && pr.ADConfig.Enabled {
		currentADConfig = pr.ADConfig
	}

	for _, cmd := range pr.Commands {
		logger.Printf("[poll] Komut: %s (id=%d)", cmd.Command, cmd.ID)
		switch cmd.Command {
		case "stop":
			ackCommand(cmd.ID, "done", "Servis durduruluyor...")
			time.Sleep(500 * time.Millisecond)
			os.Exit(0)
		case "update":
			if err := selfUpdate(cmd.ID); err != nil {
				logger.Printf("[update] Hata: %v", err)
				ackCommand(cmd.ID, "error", err.Error())
			}
			// selfUpdate acks + exits on success
		case "uninstall":
			if err := selfUninstall(cmd.ID); err != nil {
				logger.Printf("[uninstall] Hata: %v", err)
				ackCommand(cmd.ID, "error", err.Error())
			}
			// selfUninstall acks + exits on success
		default:
			status, result := executeCommand(cmd)
			ackCommand(cmd.ID, status, result)
		}
	}
}

func executeCommand(cmd AgentCommand) (string, string) {
	switch cmd.Command {
	case "scan_now", "deep_scan":
		logger.Printf("[cmd] Ağ taraması başlatılıyor...")
		scanNetwork()
		return "done", fmt.Sprintf("%d ağ tarandı", len(cfg.Subnets))
	case "sysinfo_now":
		logger.Printf("[cmd] Sistem bilgisi toplanıyor...")
		sendSysInfo()
		return "done", "Sistem bilgisi gönderildi"
	case "ad_test":
		logger.Printf("[cmd] AD bağlantı testi...")
		ac := currentADConfig
		if ac == nil {
			return "error", "AD yapılandırması alınamadı — ajan bir kez daha poll yapana kadar bekleyin"
		}
		adTest(*ac)
		return "done", "Test sonucu sunucuya gönderildi"
	case "ad_sync":
		logger.Printf("[cmd] AD kullanıcı senkronizasyonu...")
		ac := currentADConfig
		if ac == nil {
			return "error", "AD yapılandırması alınamadı — ajan bir kez daha poll yapana kadar bekleyin"
		}
		count, err := adSync(*ac)
		if err != nil {
			return "error", err.Error()
		}
		return "done", fmt.Sprintf("%d kullanıcı senkronize edildi", count)
	default:
		return "error", fmt.Sprintf("Bilinmeyen komut: %s", cmd.Command)
	}
}

func ackCommand(id int, status, result string) {
	payload := AckPayload{
		Token:     cfg.Token,
		CommandID: id,
		Status:    status,
		Result:    result,
	}
	if err := postJSON(cfg.APIURL+"/api/agent/commands/ack", payload); err != nil {
		logger.Printf("[poll] ACK hatası (id=%d): %v", id, err)
	}
}

// ── Self-update ───────────────────────────────────────────────────────────────

func selfUpdate(cmdID int) error {
	if runtime.GOOS != "windows" {
		return fmt.Errorf("güncelleme yalnızca Windows'ta destekleniyor")
	}
	exe, err := os.Executable()
	if err != nil {
		return fmt.Errorf("exe yolu alınamadı: %w", err)
	}
	exeDir := filepath.Dir(exe)
	newExe := filepath.Join(exeDir, "xshield_agent_new.exe")
	trayExe := filepath.Join(exeDir, "xshield_tray.exe")
	newTray := filepath.Join(exeDir, "xshield_tray_new.exe")

	logger.Printf("[update] Yeni EXE indiriliyor...")
	if err := downloadFile(cfg.APIURL+"/api/agent/exe?token="+cfg.Token, newExe); err != nil {
		return fmt.Errorf("indirme hatası: %w", err)
	}

	// Try to update tray EXE too — best-effort, don't fail if missing
	trayUpdated := false
	if err := downloadFile(cfg.APIURL+"/api/agent/tray?token="+cfg.Token, newTray); err == nil {
		trayUpdated = true
	}

	// BAT: stop service → replace EXEs → start service → restart tray
	batPath := filepath.Join(exeDir, "xshield_update.bat")
	bat := "@echo off\r\n" +
		"ping -n 4 127.0.0.1 > nul\r\n" +
		"sc stop \"xShieldAgent\"\r\n" +
		"ping -n 6 127.0.0.1 > nul\r\n" +
		"copy /y \"" + newExe + "\" \"" + exe + "\"\r\n" +
		"del \"" + newExe + "\"\r\n"
	if trayUpdated {
		bat += "taskkill /f /im xshield_tray.exe >nul 2>nul\r\n" +
			"copy /y \"" + newTray + "\" \"" + trayExe + "\"\r\n" +
			"del \"" + newTray + "\"\r\n"
	}
	bat += "sc start \"xShieldAgent\"\r\n"
	if trayUpdated {
		bat += "start \"\" \"" + trayExe + "\"\r\n"
	}
	bat += "del \"%~f0\"\r\n"

	if err := os.WriteFile(batPath, []byte(bat), 0644); err != nil {
		return fmt.Errorf("bat yazılamadı: %w", err)
	}

	if err := exec.Command("cmd", "/C", "start", "", "/min", batPath).Start(); err != nil {
		return fmt.Errorf("güncelleme scripti başlatılamadı: %w", err)
	}

	ackCommand(cmdID, "done", "Güncelleme başlatıldı — servis ~15sn içinde yeniden başlayacak")
	time.Sleep(500 * time.Millisecond)
	os.Exit(0)
	return nil
}

// ── Self-uninstall ────────────────────────────────────────────────────────────

func selfUninstall(cmdID int) error {
	if runtime.GOOS != "windows" {
		return fmt.Errorf("kaldırma yalnızca Windows'ta destekleniyor")
	}
	exe, err := os.Executable()
	if err != nil {
		return fmt.Errorf("exe yolu alınamadı: %w", err)
	}
	exeDir := filepath.Dir(exe)

	// BAT: stop → delete service → delete files
	batPath := filepath.Join(exeDir, "xshield_uninstall.bat")
	bat := "@echo off\r\n" +
		"ping -n 4 127.0.0.1 > nul\r\n" +
		"sc stop \"xShieldAgent\"\r\n" +
		"ping -n 3 127.0.0.1 > nul\r\n" +
		"sc delete \"xShieldAgent\"\r\n" +
		"ping -n 3 127.0.0.1 > nul\r\n" +
		"cd /d \"%TEMP%\"\r\n" +
		"rmdir /s /q \"" + exeDir + "\"\r\n"
	if err := os.WriteFile(batPath, []byte(bat), 0644); err != nil {
		return fmt.Errorf("bat yazılamadı: %w", err)
	}

	if err := exec.Command("cmd", "/C", "start", "", "/min", batPath).Start(); err != nil {
		return fmt.Errorf("kaldırma scripti başlatılamadı: %w", err)
	}

	ackCommand(cmdID, "done", "Kaldırma işlemi başlatıldı")
	time.Sleep(500 * time.Millisecond)
	os.Exit(0)
	return nil
}

// ── File download helper ──────────────────────────────────────────────────────

func downloadFile(url, destPath string) error {
	resp, err := httpClient.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	f, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, resp.Body)
	return err
}
