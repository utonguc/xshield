//go:build !windows

package main

import (
	"encoding/json"
	"os"
	"os/exec"
	"strings"
)

func localHostnamePlatform() string {
	h, _ := os.Hostname()
	return h
}

// ── Installed packages (dpkg/rpm) ─────────────────────────────────────────────

func collectSoftware() []SoftwareItem {
	// Try dpkg (Debian/Ubuntu)
	out, err := exec.Command("dpkg-query", "-W", "-f=${Package}\t${Version}\t${Maintainer}\n").Output()
	if err == nil {
		var items []SoftwareItem
		for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
			parts := strings.SplitN(line, "\t", 3)
			if len(parts) < 2 || parts[0] == "" {
				continue
			}
			pub := ""
			if len(parts) == 3 {
				pub = parts[2]
			}
			items = append(items, SoftwareItem{Name: parts[0], Version: parts[1], Publisher: pub})
		}
		return items
	}
	// Try rpm (RHEL/CentOS/Fedora)
	out, err = exec.Command("rpm", "-qa", "--queryformat", "%{NAME}\t%{VERSION}\t%{VENDOR}\n").Output()
	if err == nil {
		var items []SoftwareItem
		for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
			parts := strings.SplitN(line, "\t", 3)
			if len(parts) < 2 {
				continue
			}
			pub := ""
			if len(parts) == 3 {
				pub = parts[2]
			}
			items = append(items, SoftwareItem{Name: parts[0], Version: parts[1], Publisher: pub})
		}
		return items
	}
	return nil
}

// ── Patches (last apt/yum upgrade log entries) ────────────────────────────────

func collectPatches() []PatchItem {
	// Try reading /var/log/dpkg.log for recent upgrades
	out, err := exec.Command("bash", "-c",
		`grep " upgrade " /var/log/dpkg.log 2>/dev/null | tail -30`).Output()
	if err != nil || len(out) == 0 {
		return nil
	}
	var items []PatchItem
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		parts := strings.Fields(line)
		if len(parts) < 5 {
			continue
		}
		items = append(items, PatchItem{
			HotfixID:    parts[3],
			Description: "dpkg upgrade",
			InstalledOn: parts[0] + " " + parts[1],
		})
	}
	return items
}

// ── Active users ──────────────────────────────────────────────────────────────

func collectActiveUsers() []string {
	out, err := exec.Command("who").Output()
	if err != nil {
		return nil
	}
	var users []string
	seen := map[string]bool{}
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		fields := strings.Fields(line)
		if len(fields) > 0 && !seen[fields[0]] {
			seen[fields[0]] = true
			users = append(users, fields[0])
		}
	}
	return users
}

// ── USB devices (udev history from syslog) ────────────────────────────────────

func collectUSBDevices() []USBDevice {
	out, err := exec.Command("bash", "-c",
		`grep -i "usb" /var/log/syslog 2>/dev/null | grep -i "new.*device\|product" | tail -30`).Output()
	if err != nil || len(out) == 0 {
		return nil
	}
	seen := map[string]bool{}
	var devices []USBDevice
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		if seen[line] {
			continue
		}
		seen[line] = true
		devices = append(devices, USBDevice{FriendlyName: line})
	}
	return devices
}

// ── Services (systemctl) ──────────────────────────────────────────────────────

func collectServices() []ServiceItem {
	out, err := exec.Command("systemctl", "list-units", "--type=service",
		"--no-pager", "--no-legend", "--all").Output()
	if err != nil {
		return nil
	}
	var items []ServiceItem
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 4 {
			continue
		}
		items = append(items, ServiceItem{
			Name:   strings.TrimSuffix(fields[0], ".service"),
			Status: fields[2],
		})
	}
	return items
}

// ── Security events (auth.log failed SSH/sudo) ────────────────────────────────

func collectSecurityEvents() []SecurityEvent {
	out, err := exec.Command("bash", "-c",
		`grep -i "failed\|invalid\|authentication failure" /var/log/auth.log 2>/dev/null | tail -30`).Output()
	if err != nil || len(out) == 0 {
		return nil
	}
	var items []SecurityEvent
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		if line == "" {
			continue
		}
		items = append(items, SecurityEvent{EventID: 0, Message: line})
	}
	return items
}

// keep json import used in platform-specific files happy on Linux builds
var _ = json.Marshal
