//go:build windows

package main

import (
	"encoding/json"
	"os"
	"os/exec"
	"strings"

	"golang.org/x/sys/windows/registry"
)

func localHostnamePlatform() string {
	h, _ := os.Hostname()
	return h
}

// ── Installed software (registry uninstall keys) ──────────────────────────────

func collectSoftware() []SoftwareItem {
	var items []SoftwareItem
	paths := []registry.Key{registry.LOCAL_MACHINE, registry.LOCAL_MACHINE}
	subkeys := []string{
		`SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`,
		`SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall`,
	}
	for i, root := range paths {
		k, err := registry.OpenKey(root, subkeys[i], registry.READ)
		if err != nil {
			continue
		}
		names, _ := k.ReadSubKeyNames(-1)
		for _, name := range names {
			sub, err := registry.OpenKey(k, name, registry.READ)
			if err != nil {
				continue
			}
			display, _, _ := sub.GetStringValue("DisplayName")
			if display == "" {
				sub.Close()
				continue
			}
			version, _, _ := sub.GetStringValue("DisplayVersion")
			publisher, _, _ := sub.GetStringValue("Publisher")
			installDate, _, _ := sub.GetStringValue("InstallDate")
			sub.Close()
			items = append(items, SoftwareItem{
				Name:        display,
				Version:     version,
				Publisher:   publisher,
				InstallDate: installDate,
			})
		}
		k.Close()
	}
	// Deduplicate by name
	seen := map[string]bool{}
	var deduped []SoftwareItem
	for _, s := range items {
		if !seen[s.Name] {
			seen[s.Name] = true
			deduped = append(deduped, s)
		}
	}
	return deduped
}

// ── Windows Update / patches ──────────────────────────────────────────────────

type psHotfix struct {
	HotFixID    string `json:"HotFixID"`
	Description string `json:"Description"`
	InstalledOn string `json:"InstalledOn"`
}

func collectPatches() []PatchItem {
	out, err := runPS(`Get-HotFix | Select-Object HotFixID,Description,InstalledOn | ConvertTo-Json -Depth 2`)
	if err != nil || len(out) == 0 {
		return nil
	}
	// ConvertTo-Json returns object if single result, array if multiple
	var arr []psHotfix
	if err2 := json.Unmarshal(out, &arr); err2 != nil {
		var single psHotfix
		if err3 := json.Unmarshal(out, &single); err3 == nil {
			arr = []psHotfix{single}
		}
	}
	items := make([]PatchItem, 0, len(arr))
	for _, h := range arr {
		items = append(items, PatchItem{
			HotfixID:    h.HotFixID,
			Description: h.Description,
			InstalledOn: h.InstalledOn,
		})
	}
	return items
}

// ── Active users ──────────────────────────────────────────────────────────────

func collectActiveUsers() []string {
	out, err := exec.Command("query", "user").Output()
	if err != nil {
		return nil
	}
	var users []string
	lines := strings.Split(string(out), "\n")
	for _, line := range lines[1:] { // skip header
		fields := strings.Fields(line)
		if len(fields) > 0 {
			users = append(users, strings.TrimPrefix(fields[0], ">"))
		}
	}
	return users
}

// ── USB device history (USBSTOR registry) ────────────────────────────────────

func collectUSBDevices() []USBDevice {
	k, err := registry.OpenKey(registry.LOCAL_MACHINE,
		`SYSTEM\CurrentControlSet\Enum\USBSTOR`, registry.READ)
	if err != nil {
		return nil
	}
	defer k.Close()

	deviceClasses, _ := k.ReadSubKeyNames(-1)
	seen := map[string]bool{}
	var devices []USBDevice

	for _, class := range deviceClasses {
		ck, err := registry.OpenKey(k, class, registry.READ)
		if err != nil {
			continue
		}
		instances, _ := ck.ReadSubKeyNames(-1)
		for _, inst := range instances {
			ik, err := registry.OpenKey(ck, inst, registry.READ)
			if err != nil {
				continue
			}
			friendly, _, _ := ik.GetStringValue("FriendlyName")
			ik.Close()
			if friendly == "" {
				// FriendlyName may be on the class level
				friendly, _, _ = ck.GetStringValue("FriendlyName")
			}
			if friendly == "" {
				friendly = class
			}
			if !seen[friendly] {
				seen[friendly] = true
				devices = append(devices, USBDevice{FriendlyName: friendly, DeviceID: class})
			}
		}
		ck.Close()
	}
	return devices
}

// ── Windows Services ──────────────────────────────────────────────────────────

type psService struct {
	Name      string `json:"Name"`
	DisplayName string `json:"DisplayName"`
	Status    string `json:"Status"`
	StartType string `json:"StartType"`
}

func collectServices() []ServiceItem {
	out, err := runPS(`Get-Service | Select-Object Name,DisplayName,Status,StartType | ConvertTo-Json -Depth 2`)
	if err != nil || len(out) == 0 {
		return nil
	}
	var arr []psService
	if err2 := json.Unmarshal(out, &arr); err2 != nil {
		var single psService
		if json.Unmarshal(out, &single) == nil {
			arr = []psService{single}
		}
	}
	items := make([]ServiceItem, 0, len(arr))
	for _, s := range arr {
		items = append(items, ServiceItem{
			Name:      s.Name,
			Display:   s.DisplayName,
			Status:    s.Status,
			StartType: s.StartType,
		})
	}
	return items
}

// ── Security events (failed logins = EventID 4625) ───────────────────────────

type psEvent struct {
	TimeCreated struct {
		DateTime string `json:"DateTime"`
	} `json:"TimeCreated"`
	Id      int    `json:"Id"`
	Message string `json:"Message"`
}

func collectSecurityEvents() []SecurityEvent {
	// Last 30 failed-login events
	out, err := runPS(`Get-WinEvent -FilterHashtable @{LogName='Security';Id=4625} -MaxEvents 30 -ErrorAction SilentlyContinue | Select-Object TimeCreated,Id,Message | ConvertTo-Json -Depth 3`)
	if err != nil || len(out) == 0 {
		return nil
	}
	var arr []psEvent
	if err2 := json.Unmarshal(out, &arr); err2 != nil {
		var single psEvent
		if json.Unmarshal(out, &single) == nil {
			arr = []psEvent{single}
		}
	}
	items := make([]SecurityEvent, 0, len(arr))
	for _, e := range arr {
		msg := e.Message
		if len(msg) > 500 {
			msg = msg[:500] + "…"
		}
		items = append(items, SecurityEvent{
			EventID: e.Id,
			Time:    e.TimeCreated.DateTime,
			Message: msg,
		})
	}
	return items
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func runPS(cmd string) ([]byte, error) {
	return exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command", cmd).Output()
}
