//go:build !windows

package main

var triggerCh = make(chan string, 4)

func updateLastScan() {}
func startLocalServer() {}
