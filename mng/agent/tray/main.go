package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"time"

	"github.com/getlantern/systray"
)

//go:embed icon.ico
var iconData []byte

const localBase = "http://127.0.0.1:46831"

type agentStatus struct {
	Version   string `json:"version"`
	LastScan  string `json:"last_scan"`
	ServiceOK bool   `json:"service_ok"`
	PanelURL  string `json:"panel_url"`
}

func main() {
	systray.Run(onReady, nil)
}

func onReady() {
	systray.SetIcon(iconData)
	systray.SetTooltip("xShield Agent")

	mService := systray.AddMenuItem("⚙ Servis: Kontrol ediliyor...", "Servis durumu")
	mService.Disable()
	mLastScan := systray.AddMenuItem("🕐 Son Tarama: —", "Son tarama zamanı")
	mLastScan.Disable()
	mVersion := systray.AddMenuItem("ℹ Sürüm: ...", "Ajan sürümü")
	mVersion.Disable()

	systray.AddSeparator()

	mScan := systray.AddMenuItem("🔍 Hemen Tara", "Ağ taraması başlat")
	mSysInfo := systray.AddMenuItem("📊 Bilgi Topla", "Sistem bilgisi gönder")

	systray.AddSeparator()

	mPanel := systray.AddMenuItem("🌐 Paneli Aç", "xShield panelini tarayıcıda aç")

	systray.AddSeparator()

	mQuit := systray.AddMenuItem("❌ Çıkış", "Tepsi uygulamasını kapat")

	panelURL := "https://mng.xshield.com.tr"

	// Refresh status every 5 seconds
	go func() {
		refreshStatus(mService, mLastScan, mVersion, &panelURL)
		tick := time.NewTicker(5 * time.Second)
		defer tick.Stop()
		for range tick.C {
			refreshStatus(mService, mLastScan, mVersion, &panelURL)
		}
	}()

	// Handle menu clicks
	go func() {
		for {
			select {
			case <-mScan.ClickedCh:
				doTrigger("scan")
			case <-mSysInfo.ClickedCh:
				doTrigger("sysinfo")
			case <-mPanel.ClickedCh:
				openBrowser(panelURL)
			case <-mQuit.ClickedCh:
				systray.Quit()
				return
			}
		}
	}()
}

func refreshStatus(mSvc, mScan, mVer *systray.MenuItem, panelURL *string) {
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(localBase + "/status")
	if err != nil {
		mSvc.SetTitle("⚠ Servis: Çalışmıyor")
		return
	}
	defer resp.Body.Close()
	var s agentStatus
	if json.NewDecoder(resp.Body).Decode(&s) != nil {
		mSvc.SetTitle("⚠ Servis: Hata")
		return
	}
	mSvc.SetTitle("✅ Servis: Çalışıyor")
	mVer.SetTitle(fmt.Sprintf("ℹ Sürüm: %s", s.Version))
	if s.LastScan != "" {
		if t, err := time.Parse(time.RFC3339, s.LastScan); err == nil {
			mScan.SetTitle(fmt.Sprintf("🕐 Son Tarama: %s", t.Local().Format("02.01 15:04")))
		}
	} else {
		mScan.SetTitle("🕐 Son Tarama: Henüz yok")
	}
	if s.PanelURL != "" {
		*panelURL = s.PanelURL
	}
}

func doTrigger(action string) {
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Post(localBase+"/trigger/"+action, "application/json", nil)
	if err == nil && resp != nil {
		resp.Body.Close()
	}
}

func openBrowser(url string) {
	exec.Command("cmd", "/c", "start", "", url).Start()
}
