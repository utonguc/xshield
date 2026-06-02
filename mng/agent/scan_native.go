package main

import (
	"fmt"
	"net"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"
)

// scanSubnetNative is a fallback scanner used when nmap is not installed.
// It does concurrent ICMP pings, then reads the OS ARP table for MAC addresses.
func scanSubnetNative(subnet string) {
	ips, err := enumerateIPv4(subnet)
	if err != nil {
		logger.Printf("Subnet parse hatası (%s): %v", subnet, err)
		return
	}
	logger.Printf("Native ping taraması başlıyor: %s (%d IP)", subnet, len(ips))

	type pingResult struct {
		ip    string
		alive bool
	}

	sem := make(chan struct{}, 64)
	ch := make(chan pingResult, len(ips))

	var wg sync.WaitGroup
	for _, ip := range ips {
		wg.Add(1)
		go func(ipStr string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			ch <- pingResult{ip: ipStr, alive: pingHost(ipStr)}
		}(ip)
	}
	wg.Wait()
	close(ch)

	var alive []string
	for r := range ch {
		if r.alive {
			alive = append(alive, r.ip)
		}
	}

	if len(alive) == 0 {
		logger.Printf("Cihaz bulunamadı (native ping): %s", subnet)
		return
	}

	arp := readARPTable()

	var hosts []Host
	for _, ip := range alive {
		mac := strings.ToLower(arp[ip])
		var hostname string
		if names, err := net.LookupAddr(ip); err == nil && len(names) > 0 {
			hostname = strings.TrimSuffix(names[0], ".")
		}
		hosts = append(hosts, Host{IP: ip, MAC: mac, Hostname: hostname})
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
		logger.Printf("Rapor gönderildi (native): %s (%d cihaz)", subnet, len(hosts))
	}
}

func pingHost(ip string) bool {
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("ping", "-n", "1", "-w", "500", ip)
	} else {
		cmd = exec.Command("ping", "-c", "1", "-W", "1", ip)
	}
	return cmd.Run() == nil
}

func readARPTable() map[string]string {
	out, err := exec.Command("arp", "-a").Output()
	if err != nil {
		return map[string]string{}
	}
	table := map[string]string{}
	for _, line := range strings.Split(string(out), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		var ip, mac string
		if runtime.GOOS == "windows" {
			// "  192.168.1.1     aa-bb-cc-dd-ee-ff     dynamic"
			if strings.HasPrefix(line, "Interface") || strings.HasPrefix(line, "Internet") {
				continue
			}
			fields := strings.Fields(line)
			if len(fields) < 2 {
				continue
			}
			ip = fields[0]
			mac = strings.ReplaceAll(fields[1], "-", ":")
		} else if strings.Contains(line, "(") {
			// BSD/macOS: "? (192.168.1.1) at aa:bb:cc:dd:ee:ff [ether] on eth0"
			s := strings.Index(line, "(")
			e := strings.Index(line, ")")
			if s < 0 || e <= s {
				continue
			}
			ip = line[s+1 : e]
			if a := strings.Index(line, " at "); a >= 0 {
				if f := strings.Fields(line[a+4:]); len(f) > 0 {
					mac = f[0]
				}
			}
		} else {
			// Linux: "192.168.1.1 ether aa:bb:cc:dd:ee:ff C eth0"
			fields := strings.Fields(line)
			if len(fields) < 3 {
				continue
			}
			ip = fields[0]
			mac = fields[2]
		}
		if ip != "" && net.ParseIP(ip) != nil && mac != "" &&
			!strings.Contains(mac, "incomplete") && mac != "ff:ff:ff:ff:ff:ff" {
			table[ip] = mac
		}
	}
	return table
}

func enumerateIPv4(cidr string) ([]string, error) {
	_, ipNet, err := net.ParseCIDR(cidr)
	if err != nil {
		return nil, fmt.Errorf("geçersiz CIDR: %s", cidr)
	}
	ip4 := ipNet.IP.To4()
	if ip4 == nil {
		return nil, fmt.Errorf("IPv6 desteklenmiyor: %s", cidr)
	}
	ones, bits := ipNet.Mask.Size()
	count := 1 << uint(bits-ones)
	if count > 65536 {
		count = 65536
	}
	cur := make(net.IP, 4)
	copy(cur, ip4)
	var ips []string
	for i := 0; i < count; i++ {
		ips = append(ips, cur.String())
		incrIP4(cur)
	}
	if len(ips) > 2 {
		ips = ips[1 : len(ips)-1] // ağ adresi ve broadcast'i çıkar
	}
	return ips, nil
}

func incrIP4(ip net.IP) {
	for j := 3; j >= 0; j-- {
		ip[j]++
		if ip[j] != 0 {
			break
		}
	}
}
