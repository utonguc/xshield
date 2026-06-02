package main

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"sync"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/mem"
)

const AgentVersion = "2.0.0"

// Config is read from config.json next to the binary
type Config struct {
	Token           string   `json:"token"`
	APIURL          string   `json:"api_url"`
	Subnets         []string `json:"subnets"`
	ScanEvery       int      `json:"scan_every"`       // seconds, default 3600
	MetricEvery     int      `json:"metric_every"`     // seconds, default 300
	WMIUser         string   `json:"wmi_user"`
	WMIPass         string   `json:"wmi_pass"`
	SNMPCommunities []string `json:"snmp_communities"` // default ["public"]
}

var (
	cfg    Config
	logger *log.Logger
)

func loadConfig() error {
	// Windows MSI installs write config to registry; try that first
	if loadConfigFromPlatform() {
		if cfg.ScanEvery == 0 {
			cfg.ScanEvery = 3600
		}
		if cfg.MetricEvery == 0 {
			cfg.MetricEvery = 300
		}
		if len(cfg.Subnets) == 0 {
			cfg.Subnets = []string{"192.168.1.0/24"}
		}
		return nil
	}
	// Fallback: config.json (Linux / manual installs)
	exePath, err := os.Executable()
	if err != nil {
		return err
	}
	cfgPath := filepath.Join(filepath.Dir(exePath), "config.json")
	data, err := os.ReadFile(cfgPath)
	if err != nil {
		return fmt.Errorf("config.json okunamadı (%s): %w", cfgPath, err)
	}
	if err := json.Unmarshal(data, &cfg); err != nil {
		return fmt.Errorf("config.json parse hatası: %w", err)
	}
	if cfg.ScanEvery == 0 {
		cfg.ScanEvery = 3600
	}
	if cfg.MetricEvery == 0 {
		cfg.MetricEvery = 300
	}
	return nil
}

func localIP() string {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		return ""
	}
	defer conn.Close()
	return conn.LocalAddr().(*net.UDPAddr).IP.String()
}

// ── Metrics ──────────────────────────────────────────────────────────────────

type MetricsPayload struct {
	Token       string  `json:"token"`
	Hostname    string  `json:"hostname"`
	IPAddress   string  `json:"ip_address"`
	CPUPercent  float64 `json:"cpu_percent"`
	RAMPercent  float64 `json:"ram_percent"`
	RAMTotalGB  float64 `json:"ram_total_gb"`
	DiskPercent float64 `json:"disk_percent"`
	DiskTotalGB float64 `json:"disk_total_gb"`
	UptimeHours float64 `json:"uptime_hours"`
	Platform    string  `json:"platform"`
}

func sendMetrics() {
	hostname, _ := os.Hostname()
	cpuPct, _ := cpu.Percent(time.Second, false)
	vmStat, _ := mem.VirtualMemory()
	uptimeSec, _ := host.Uptime()
	diskPath := "/"
	if runtime.GOOS == "windows" {
		diskPath = "C:\\"
	}
	diskStat, _ := disk.Usage(diskPath)

	var cpuVal float64
	if len(cpuPct) > 0 {
		cpuVal = cpuPct[0]
	}

	payload := MetricsPayload{
		Token:       cfg.Token,
		Hostname:    hostname,
		IPAddress:   localIP(),
		CPUPercent:  round1(cpuVal),
		RAMPercent:  round1(vmStat.UsedPercent),
		RAMTotalGB:  round2(float64(vmStat.Total) / 1e9),
		DiskPercent: round1(diskStat.UsedPercent),
		DiskTotalGB: round2(float64(diskStat.Total) / 1e9),
		UptimeHours: round1(float64(uptimeSec) / 3600),
		Platform:    fmt.Sprintf("%s %s", runtime.GOOS, runtime.GOARCH),
	}

	if err := postJSON(cfg.APIURL+"/api/agent/metrics", payload); err != nil {
		logger.Printf("Metrik hatası: %v", err)
	} else {
		logger.Printf("Metrik gönderildi (CPU:%.1f%% RAM:%.1f%%)", payload.CPUPercent, payload.RAMPercent)
	}
}

// ── Network Scan ─────────────────────────────────────────────────────────────

type NmapXML struct {
	Hosts []NmapHost `xml:"host"`
}
type NmapHost struct {
	Status    NmapStatus    `xml:"status"`
	Addresses []NmapAddress `xml:"address"`
	Hostnames []NmapHostnames `xml:"hostnames"`
}
type NmapStatus struct {
	State string `xml:"state,attr"`
}
type NmapAddress struct {
	Addr     string `xml:"addr,attr"`
	AddrType string `xml:"addrtype,attr"`
	Vendor   string `xml:"vendor,attr"`
}
type NmapHostnames struct {
	Names []NmapHostname `xml:"hostname"`
}
type NmapHostname struct {
	Name string `xml:"name,attr"`
	Type string `xml:"type,attr"`
}

type Host struct {
	IP             string `json:"ip"`
	MAC            string `json:"mac,omitempty"`
	Hostname       string `json:"hostname,omitempty"`
	Vendor         string `json:"vendor,omitempty"`
	OSName         string `json:"os_name,omitempty"`
	OSVersion      string `json:"os_version,omitempty"`
	DeviceType     string `json:"device_type,omitempty"`
	Domain         string `json:"domain,omitempty"`
	LoggedUser     string `json:"logged_user,omitempty"`
	ConnectionType string `json:"connection_type,omitempty"`
	SerialNumber   string `json:"serial_number,omitempty"`
	Model          string `json:"model,omitempty"`
}

type ScanPayload struct {
	Token    string `json:"token"`
	ScanTime string `json:"scan_time"`
	Subnet   string `json:"subnet"`
	Hosts    []Host `json:"hosts"`
}

func parseNmapXML(data []byte) []Host {
	var nmapResult NmapXML
	if err := xml.Unmarshal(data, &nmapResult); err != nil {
		logger.Printf("nmap XML parse: %v", err)
		return nil
	}
	var hosts []Host
	for _, h := range nmapResult.Hosts {
		if h.Status.State != "up" {
			continue
		}
		var ip, mac, vendor string
		for _, addr := range h.Addresses {
			switch addr.AddrType {
			case "ipv4":
				ip = addr.Addr
			case "mac":
				mac = addr.Addr
				vendor = addr.Vendor
			}
		}
		if ip == "" {
			continue
		}
		var hostname string
		for _, hns := range h.Hostnames {
			for _, hn := range hns.Names {
				if hn.Type == "PTR" || hostname == "" {
					hostname = hn.Name
				}
			}
		}
		hosts = append(hosts, Host{IP: ip, MAC: strings.ToLower(mac), Hostname: hostname, Vendor: vendor})
	}
	return hosts
}

func scanSubnet(subnet string) {
	logger.Printf("Taranıyor: %s", subnet)
	cmd := exec.Command("nmap", "-sn", "-T4", "--oX", "-", subnet)
	out, err := cmd.Output()
	if err != nil {
		if strings.Contains(err.Error(), "executable file not found") ||
			strings.Contains(err.Error(), "no such file") {
			logger.Printf("nmap bulunamadı — Go native ping taraması başlatılıyor...")
			scanSubnetNative(subnet)
		} else {
			logger.Printf("nmap hatası (%s): %v", subnet, err)
		}
		return
	}
	hosts := enrichHosts(parseNmapXML(out))
	if len(hosts) == 0 {
		logger.Printf("Cihaz bulunamadı: %s", subnet)
		return
	}
	payload := ScanPayload{
		Token:    cfg.Token,
		ScanTime: time.Now().UTC().Format(time.RFC3339),
		Subnet:   subnet,
		Hosts:    hosts,
	}
	if err := postJSON(cfg.APIURL+"/api/agent/report", payload); err != nil {
		logger.Printf("Rapor hatası (%s): %v", subnet, err)
	} else {
		logger.Printf("Rapor gönderildi: %s (%d cihaz)", subnet, len(hosts))
	}
}

func scanNetwork() {
	for _, subnet := range cfg.Subnets {
		scanSubnet(strings.TrimSpace(subnet))
	}
}

// enrichWithSNMP applies SNMP enrichment to discovered hosts in place.
func enrichWithSNMP(hosts []Host) []Host {
	communities := cfg.SNMPCommunities
	if len(communities) == 0 {
		communities = []string{"public"}
	}
	sem := make(chan struct{}, 20)
	var wg sync.WaitGroup
	var mu sync.Mutex
	for i := range hosts {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			if r, ok := querySNMP(hosts[i].IP, communities); ok {
				mu.Lock()
				if hosts[i].SerialNumber == "" && r.Serial != "" {
					hosts[i].SerialNumber = r.Serial
				}
				if hosts[i].Model == "" && r.Model != "" {
					hosts[i].Model = r.Model
				}
				// Prefer SNMP hostname if nbtstat/nmap didn't get one
				if hosts[i].Hostname == "" && r.SysName != "" {
					hosts[i].Hostname = r.SysName
				}
				// Use sysDescr to improve OS/vendor detection
				if r.SysDescr != "" {
					if hosts[i].OSName == "" {
						hosts[i].OSName = firstLine(r.SysDescr)
					}
					if hosts[i].Vendor == "" {
						hosts[i].Vendor = extractVendorFromDescr(r.SysDescr)
					}
				}
				mu.Unlock()
			}
		}(i)
	}
	wg.Wait()
	return hosts
}

// enrichWithWMI applies WMI enrichment to Windows hosts.
func enrichWithWMI(hosts []Host) []Host {
	if cfg.WMIUser == "" {
		return hosts
	}
	// Collect IPs of likely Windows hosts
	var windowsIPs []string
	ipIndex := map[string]int{}
	for i, h := range hosts {
		dt := h.DeviceType
		if dt == "server" || dt == "vm" || dt == "desktop" || dt == "laptop" || dt == "unknown" {
			windowsIPs = append(windowsIPs, h.IP)
			ipIndex[h.IP] = i
		}
	}
	if len(windowsIPs) == 0 {
		return hosts
	}
	logger.Printf("[wmi] %d host sorgulanıyor...", len(windowsIPs))
	results := batchQueryWMI(windowsIPs, cfg.WMIUser, cfg.WMIPass)
	for ip, r := range results {
		if r.Error != "" {
			continue
		}
		i, ok := ipIndex[ip]
		if !ok {
			continue
		}
		if hosts[i].SerialNumber == "" && r.Serial != "" && r.Serial != "None" && r.Serial != "Default string" {
			hosts[i].SerialNumber = r.Serial
		}
		if hosts[i].Model == "" && r.Model != "" {
			hosts[i].Model = r.Model
		}
		if hosts[i].OSVersion == "" && r.OSVersion != "" {
			hosts[i].OSVersion = r.OSVersion
		}
		if hosts[i].LoggedUser == "" && r.LoggedUser != "" {
			hosts[i].LoggedUser = r.LoggedUser
		}
	}
	return hosts
}

func firstLine(s string) string {
	if idx := strings.IndexAny(s, "\r\n"); idx >= 0 {
		return s[:idx]
	}
	if len(s) > 80 {
		return s[:80]
	}
	return s
}

func extractVendorFromDescr(descr string) string {
	d := strings.ToLower(descr)
	vendors := []string{"cisco", "juniper", "mikrotik", "ubiquiti", "huawei", "hp", "hewlett",
		"dell", "fortinet", "palo alto", "aruba", "meraki", "ruckus", "netgear", "zyxel",
		"dlink", "tp-link", "epson", "canon", "brother", "ricoh", "xerox", "kyocera"}
	for _, v := range vendors {
		if strings.Contains(d, v) {
			if len(v) > 0 {
				return strings.ToUpper(v[:1]) + v[1:]
			}
			return v
		}
	}
	return ""
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// httpClient skips TLS verification — the agent token is the auth layer,
// and corporate SSL inspection proxies present non-trusted certs.
var httpClient = &http.Client{
	Transport: &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, //nolint:gosec
	},
	Timeout: 30 * time.Second,
}

func postJSON(url string, payload any) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	resp, err := httpClient.Post(url, "application/json", bytes.NewReader(data))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	return nil
}

func round1(v float64) float64 { return float64(int(v*10)) / 10 }
func round2(v float64) float64 { return float64(int(v*100)) / 100 }

// ── Main ─────────────────────────────────────────────────────────────────────

func runAgent(stopCh <-chan struct{}) {
	for {
		if err := loadConfig(); err != nil {
			logger.Printf("Konfig bekleniyor (%v) — 30s sonra tekrar...", err)
			if stopCh != nil {
				select {
				case <-stopCh:
					return
				case <-time.After(30 * time.Second):
				}
			} else {
				time.Sleep(30 * time.Second)
			}
			continue
		}
		break
	}
	logger.Printf("xShield Ajani baslatildi — API: %s, Aglar: %v", cfg.APIURL, cfg.Subnets)
	startLocalServer()

	var lastScan, lastMetric, lastSysInfo time.Time

	for {
		if stopCh != nil {
			select {
			case <-stopCh:
				logger.Printf("xShield Ajani durduruluyor...")
				return
			default:
			}
		}
		now := time.Now()
		if now.Sub(lastMetric) >= time.Duration(cfg.MetricEvery)*time.Second {
			sendMetrics()
			lastMetric = now
		}
		if now.Sub(lastScan) >= time.Duration(cfg.ScanEvery)*time.Second {
			scanNetwork()
			updateLastScan()
			lastScan = now
		}
		if now.Sub(lastSysInfo) >= 6*time.Hour {
			sendSysInfo()
			lastSysInfo = now
		}
		// Handle immediate trigger from tray app
		select {
		case cmd := <-triggerCh:
			switch cmd {
			case "scan":
				scanNetwork()
				updateLastScan()
				lastScan = time.Now()
			case "sysinfo":
				sendSysInfo()
				lastSysInfo = time.Now()
			}
		default:
		}

		pollCommands()
		time.Sleep(30 * time.Second)
	}
}

func main() {
	exePath, _ := os.Executable()
	logPath := filepath.Join(filepath.Dir(exePath), "xshield_agent.log")
	lf, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		lf = os.Stdout
	}
	logger = log.New(lf, "", log.LstdFlags)

	if runAsServiceIfNeeded() {
		return
	}
	runAgent(nil)
}
