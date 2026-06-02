//go:build windows

package main

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"
)

var (
	triggerCh  = make(chan string, 4)
	lastScanMu sync.RWMutex
	_lastScan  time.Time
)

type localStatus struct {
	Version   string `json:"version"`
	LastScan  string `json:"last_scan,omitempty"`
	ServiceOK bool   `json:"service_ok"`
	PanelURL  string `json:"panel_url"`
	APIURL    string `json:"api_url"`
}

func updateLastScan() {
	lastScanMu.Lock()
	_lastScan = time.Now()
	lastScanMu.Unlock()
}

func startLocalServer() {
	mux := http.NewServeMux()

	mux.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		lastScanMu.RLock()
		ls := _lastScan
		lastScanMu.RUnlock()
		var lsStr string
		if !ls.IsZero() {
			lsStr = ls.Format(time.RFC3339)
		}
		json.NewEncoder(w).Encode(localStatus{
			Version:   AgentVersion,
			LastScan:  lsStr,
			ServiceOK: true,
			PanelURL:  "https://mng.xshield.com.tr",
			APIURL:    cfg.APIURL,
		})
	})

	mux.HandleFunc("/trigger/scan", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "405", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		select {
		case triggerCh <- "scan":
			w.Write([]byte(`{"ok":true}`))
		default:
			w.Write([]byte(`{"ok":false,"error":"busy"}`))
		}
	})

	mux.HandleFunc("/trigger/sysinfo", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "405", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		select {
		case triggerCh <- "sysinfo":
			w.Write([]byte(`{"ok":true}`))
		default:
			w.Write([]byte(`{"ok":false,"error":"busy"}`))
		}
	})

	go func() {
		if err := http.ListenAndServe("127.0.0.1:46831", mux); err != nil {
			logger.Printf("[local] HTTP sunucu hatası: %v", err)
		}
	}()
	logger.Printf("[local] HTTP sunucu başlatıldı: 127.0.0.1:46831")
}
