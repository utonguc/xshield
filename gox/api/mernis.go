package main

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
)

// MERNIS / KPS Public — TC Kimlik No doğrulama (5651). Gerçek devlet servisi.

func turkishUpper(s string) string {
	r := strings.NewReplacer("i", "İ", "ı", "I", "ş", "Ş", "ğ", "Ğ", "ü", "Ü", "ö", "Ö", "ç", "Ç")
	return strings.ToUpper(r.Replace(strings.TrimSpace(s)))
}

func xmlEscape(s string) string {
	r := strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", "\"", "&quot;")
	return r.Replace(s)
}

// verifyMernis: TC + ad + soyad + doğum yılı → KPS'e sorar, doğru/yanlış döner.
func verifyMernis(ctx context.Context, tc, ad, soyad string, dogumYili int) (bool, error) {
	tc = strings.TrimSpace(tc)
	if len(tc) != 11 {
		return false, fmt.Errorf("TC kimlik no 11 haneli olmalı")
	}
	for _, c := range tc {
		if c < '0' || c > '9' {
			return false, fmt.Errorf("TC kimlik no sadece rakam içermeli")
		}
	}
	envelope := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <TCKimlikNoDogrula xmlns="http://tckimlik.nvi.gov.tr/WS">
      <TCKimlikNo>%s</TCKimlikNo>
      <Ad>%s</Ad>
      <Soyad>%s</Soyad>
      <DogumYili>%d</DogumYili>
    </TCKimlikNoDogrula>
  </soap:Body>
</soap:Envelope>`, tc, xmlEscape(turkishUpper(ad)), xmlEscape(turkishUpper(soyad)), dogumYili)

	req, err := http.NewRequestWithContext(ctx, "POST",
		"https://tckimlik.nvi.gov.tr/Service/KPSPublic.asmx", strings.NewReader(envelope))
	if err != nil {
		return false, err
	}
	req.Header.Set("Content-Type", "text/xml; charset=utf-8")
	req.Header.Set("SOAPAction", "http://tckimlik.nvi.gov.tr/WS/TCKimlikNoDogrula")

	client := &http.Client{Timeout: 12 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	buf := new(bytes.Buffer)
	_, _ = buf.ReadFrom(resp.Body)
	out := strings.ToLower(buf.String())
	if strings.Contains(out, "<tckimliknodogrularesult>true</tckimliknodogrularesult>") {
		return true, nil
	}
	if strings.Contains(out, "<tckimliknodogrularesult>false</tckimliknodogrularesult>") {
		return false, nil
	}
	// Beklenen SOAP yanıtı yok (servis hata sayfası / deprecated). false değil, HATA dön.
	log.Printf("MERNIS: beklenmeyen yanıt (http=%d) — resmi KPS erişimi gerekli", resp.StatusCode)
	return false, fmt.Errorf("kps yanıtı yok")
}
