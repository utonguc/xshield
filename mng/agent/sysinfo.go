package main

import (
	"time"

	psnet "github.com/shirou/gopsutil/v4/net"
	"github.com/shirou/gopsutil/v4/process"
)

// ── Payload structs ────────────────────────────────────────────────────────────

type SoftwareItem struct {
	Name        string `json:"name"`
	Version     string `json:"version,omitempty"`
	Publisher   string `json:"publisher,omitempty"`
	InstallDate string `json:"install_date,omitempty"`
}

type PatchItem struct {
	HotfixID    string `json:"hotfix_id"`
	Description string `json:"description,omitempty"`
	InstalledOn string `json:"installed_on,omitempty"`
}

type USBDevice struct {
	FriendlyName string `json:"friendly_name"`
	DeviceID     string `json:"device_id,omitempty"`
}

type ProcessItem struct {
	PID        int32   `json:"pid"`
	Name       string  `json:"name"`
	CPUPercent float64 `json:"cpu_percent"`
	MemMB      float64 `json:"mem_mb"`
	Status     string  `json:"status"`
}

type ServiceItem struct {
	Name      string `json:"name"`
	Display   string `json:"display,omitempty"`
	Status    string `json:"status"`
	StartType string `json:"start_type,omitempty"`
}

type SecurityEvent struct {
	EventID  int    `json:"event_id"`
	Time     string `json:"time"`
	User     string `json:"user,omitempty"`
	Computer string `json:"computer,omitempty"`
	Message  string `json:"message,omitempty"`
}

type NetIOItem struct {
	Interface string `json:"interface"`
	SentMB    float64 `json:"sent_mb"`
	RecvMB    float64 `json:"recv_mb"`
	SentPkts  uint64  `json:"sent_pkts"`
	RecvPkts  uint64  `json:"recv_pkts"`
}

type SysInfoPayload struct {
	Token          string          `json:"token"`
	Hostname       string          `json:"hostname"`
	IPAddress      string          `json:"ip_address"`
	CollectedAt    string          `json:"collected_at"`
	Software       []SoftwareItem  `json:"software"`
	Patches        []PatchItem     `json:"patches"`
	ActiveUsers    []string        `json:"active_users"`
	USBDevices     []USBDevice     `json:"usb_devices"`
	TopProcesses   []ProcessItem   `json:"top_processes"`
	Services       []ServiceItem   `json:"services"`
	SecurityEvents []SecurityEvent `json:"security_events"`
	NetIO          []NetIOItem     `json:"net_io"`
}

// ── Cross-platform collectors ──────────────────────────────────────────────────

func collectProcesses() []ProcessItem {
	procs, err := process.Processes()
	if err != nil {
		return nil
	}

	type scored struct {
		item  ProcessItem
		score float64
	}
	var all []scored

	for _, p := range procs {
		name, _ := p.Name()
		cpu, _ := p.CPUPercent()
		mem, _ := p.MemoryInfo()
		stat, _ := p.Status()
		if name == "" {
			continue
		}
		var memMB float64
		if mem != nil {
			memMB = round2(float64(mem.RSS) / 1024 / 1024)
		}
		var statusStr string
		if len(stat) > 0 {
			statusStr = stat[0]
		}
		all = append(all, scored{
			item:  ProcessItem{PID: p.Pid, Name: name, CPUPercent: round1(cpu), MemMB: memMB, Status: statusStr},
			score: cpu + memMB/100,
		})
	}

	// Sort by score descending (simple selection, top 20)
	for i := 0; i < len(all) && i < 20; i++ {
		max := i
		for j := i + 1; j < len(all); j++ {
			if all[j].score > all[max].score {
				max = j
			}
		}
		all[i], all[max] = all[max], all[i]
	}

	limit := 20
	if len(all) < limit {
		limit = len(all)
	}
	result := make([]ProcessItem, limit)
	for i := range result {
		result[i] = all[i].item
	}
	return result
}

func collectNetIO() []NetIOItem {
	counters, err := psnet.IOCounters(true)
	if err != nil {
		return nil
	}
	var items []NetIOItem
	for _, c := range counters {
		if c.BytesSent == 0 && c.BytesRecv == 0 {
			continue
		}
		items = append(items, NetIOItem{
			Interface: c.Name,
			SentMB:    round2(float64(c.BytesSent) / 1024 / 1024),
			RecvMB:    round2(float64(c.BytesRecv) / 1024 / 1024),
			SentPkts:  c.PacketsSent,
			RecvPkts:  c.PacketsRecv,
		})
	}
	return items
}

// ── Main sysinfo send ──────────────────────────────────────────────────────────

func sendSysInfo() {
	hostname := localHostnamePlatform()

	payload := SysInfoPayload{
		Token:          cfg.Token,
		Hostname:       hostname,
		IPAddress:      localIP(),
		CollectedAt:    time.Now().UTC().Format(time.RFC3339),
		Software:       collectSoftware(),
		Patches:        collectPatches(),
		ActiveUsers:    collectActiveUsers(),
		USBDevices:     collectUSBDevices(),
		TopProcesses:   collectProcesses(),
		Services:       collectServices(),
		SecurityEvents: collectSecurityEvents(),
		NetIO:          collectNetIO(),
	}

	if err := postJSON(cfg.APIURL+"/api/agent/sysinfo", payload); err != nil {
		logger.Printf("SysInfo hatası: %v", err)
	} else {
		logger.Printf("SysInfo gönderildi (yazılım:%d, olay:%d, process:%d)",
			len(payload.Software), len(payload.SecurityEvents), len(payload.TopProcesses))
	}
}
