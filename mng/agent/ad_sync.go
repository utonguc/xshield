package main

import (
	"crypto/tls"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	ldap "github.com/go-ldap/ldap/v3"
)

// ADConfig mirrors the server's poll response ad_config field
type ADConfig struct {
	Enabled           bool   `json:"enabled"`
	DCHost            string `json:"dc_host"`
	DomainName        string `json:"domain_name"`
	BaseDN            string `json:"base_dn"`
	BindUsername      string `json:"bind_username"`
	BindPassword      string `json:"bind_password"`
	SyncIntervalHours int    `json:"sync_interval_hours"`
}

// ADUser is what we send to /api/agent/ad-sync
type ADUser struct {
	ADObjectGUID string   `json:"ad_object_guid"`
	Username     string   `json:"username"`
	DisplayName  string   `json:"display_name"`
	Email        string   `json:"email"`
	Department   string   `json:"department,omitempty"`
	Title        string   `json:"title,omitempty"`
	Domain       string   `json:"domain,omitempty"`
	IsEnabled    bool     `json:"is_enabled"`
	Groups       []string `json:"groups,omitempty"`
}

type ADSyncPayload struct {
	Token string   `json:"token"`
	Users []ADUser `json:"users"`
}

type ADTestResultPayload struct {
	Token   string `json:"token"`
	OK      bool   `json:"ok"`
	Message string `json:"message,omitempty"`
}

func connectLDAP(host string) (*ldap.Conn, error) {
	// Try LDAPS (636) first, fall back to plain LDAP (389)
	conn, err := ldap.DialTLS("tcp", fmt.Sprintf("%s:636", host),
		&tls.Config{InsecureSkipVerify: true}) //nolint:gosec
	if err != nil {
		conn, err = ldap.Dial("tcp", fmt.Sprintf("%s:389", host))
		if err != nil {
			return nil, fmt.Errorf("LDAP bağlantısı kurulamadı (636/389): %v", err)
		}
	}
	conn.SetTimeout(15 * time.Second)
	return conn, nil
}

func adTest(ac ADConfig) {
	result := ADTestResultPayload{Token: cfg.Token}

	conn, err := connectLDAP(ac.DCHost)
	if err != nil {
		result.OK = false
		result.Message = err.Error()
		if e := postJSON(cfg.APIURL+"/api/agent/ad-test-result", result); e != nil {
			logger.Printf("[ad-test] sonuç gönderilemedi: %v", e)
		}
		return
	}
	defer conn.Close()

	if err := conn.Bind(ac.BindUsername, ac.BindPassword); err != nil {
		result.OK = false
		result.Message = fmt.Sprintf("Kimlik doğrulama hatası: %v", err)
		postJSON(cfg.APIURL+"/api/agent/ad-test-result", result) //nolint:errcheck
		return
	}

	// Quick search to confirm read access
	sr, err := conn.Search(ldap.NewSearchRequest(
		ac.BaseDN, ldap.ScopeBaseObject, ldap.NeverDerefAliases,
		1, 5, false, "(objectClass=*)", []string{"dn"}, nil,
	))
	if err != nil {
		result.OK = false
		result.Message = fmt.Sprintf("Base DN okunamadı: %v", err)
		postJSON(cfg.APIURL+"/api/agent/ad-test-result", result) //nolint:errcheck
		return
	}

	result.OK = true
	result.Message = fmt.Sprintf("Bağlantı başarılı — %s (%d obje)", ac.DCHost, len(sr.Entries))
	if e := postJSON(cfg.APIURL+"/api/agent/ad-test-result", result); e != nil {
		logger.Printf("[ad-test] sonuç gönderilemedi: %v", e)
	}
	logger.Printf("[ad-test] %s OK", ac.DCHost)
}

func adSync(ac ADConfig) (int, error) {
	conn, err := connectLDAP(ac.DCHost)
	if err != nil {
		return 0, err
	}
	defer conn.Close()

	if err := conn.Bind(ac.BindUsername, ac.BindPassword); err != nil {
		return 0, fmt.Errorf("kimlik doğrulama hatası: %v", err)
	}

	searchReq := ldap.NewSearchRequest(
		ac.BaseDN,
		ldap.ScopeWholeSubtree,
		ldap.NeverDerefAliases,
		0, 0, false,
		"(&(objectClass=person)(objectCategory=person)(mail=*))",
		[]string{
			"objectGUID", "sAMAccountName", "displayName", "mail",
			"department", "title", "memberOf", "userAccountControl",
		},
		nil,
	)

	sr, err := conn.SearchWithPaging(searchReq, 500)
	if err != nil {
		return 0, fmt.Errorf("LDAP arama hatası: %v", err)
	}

	var users []ADUser
	for _, entry := range sr.Entries {
		guidBytes := entry.GetRawAttributeValue("objectGUID")
		if len(guidBytes) != 16 {
			continue
		}
		email := strings.ToLower(strings.TrimSpace(entry.GetAttributeValue("mail")))
		if email == "" {
			continue
		}

		// userAccountControl bit 1 (0x2) = disabled account
		isEnabled := true
		if uacStr := entry.GetAttributeValue("userAccountControl"); uacStr != "" {
			var uac int
			fmt.Sscanf(uacStr, "%d", &uac)
			isEnabled = (uac & 0x2) == 0
		}

		var groups []string
		for _, dn := range entry.GetAttributeValues("memberOf") {
			if cn := extractCN(dn); cn != "" {
				groups = append(groups, cn)
			}
		}

		users = append(users, ADUser{
			ADObjectGUID: guidToString(guidBytes),
			Username:     entry.GetAttributeValue("sAMAccountName"),
			DisplayName:  entry.GetAttributeValue("displayName"),
			Email:        email,
			Department:   entry.GetAttributeValue("department"),
			Title:        entry.GetAttributeValue("title"),
			Domain:       ac.DomainName,
			IsEnabled:    isEnabled,
			Groups:       groups,
		})
	}

	logger.Printf("[ad-sync] %d kullanıcı bulundu, gönderiliyor...", len(users))
	if err := postJSON(cfg.APIURL+"/api/agent/ad-sync", ADSyncPayload{Token: cfg.Token, Users: users}); err != nil {
		return 0, fmt.Errorf("gönderme hatası: %v", err)
	}
	return len(users), nil
}

// guidToString converts a raw 16-byte objectGUID to UUID string.
// Active Directory stores the first 3 components in little-endian order.
func guidToString(b []byte) string {
	if len(b) < 16 {
		return hex.EncodeToString(b)
	}
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%s",
		uint32(b[3])<<24|uint32(b[2])<<16|uint32(b[1])<<8|uint32(b[0]),
		uint16(b[5])<<8|uint16(b[4]),
		uint16(b[7])<<8|uint16(b[6]),
		uint16(b[8])<<8|uint16(b[9]),
		hex.EncodeToString(b[10:16]),
	)
}

// extractCN pulls the CN= value from an LDAP distinguished name
func extractCN(dn string) string {
	for _, part := range strings.Split(dn, ",") {
		part = strings.TrimSpace(part)
		if strings.HasPrefix(strings.ToUpper(part), "CN=") {
			return part[3:]
		}
	}
	return ""
}
