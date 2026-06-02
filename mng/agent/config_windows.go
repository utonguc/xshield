//go:build windows

package main

import (
	"strings"

	"golang.org/x/sys/windows/registry"
)

func loadConfigFromPlatform() bool {
	k, err := registry.OpenKey(registry.LOCAL_MACHINE, `SOFTWARE\xShield\Agent`, registry.QUERY_VALUE)
	if err != nil {
		return false
	}
	defer k.Close()

	token, _, err := k.GetStringValue("Token")
	if err != nil || token == "" {
		return false
	}
	cfg.Token = token

	if apiUrl, _, err := k.GetStringValue("ApiUrl"); err == nil && apiUrl != "" {
		cfg.APIURL = apiUrl
	}
	if subnets, _, err := k.GetStringValue("Subnets"); err == nil && subnets != "" {
		for _, s := range strings.Split(subnets, ",") {
			s = strings.TrimSpace(s)
			if s != "" {
				cfg.Subnets = append(cfg.Subnets, s)
			}
		}
	}

	return true
}
