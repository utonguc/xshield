package main

import (
	"bytes"
	"crypto/rand"
	"crypto/sha256"
	"crypto/sha512"
	"crypto/tls"
	"crypto/x509/pkix"
	"encoding/asn1"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"time"
)

// RFC 3161 Zaman Damgası istemcisi.
// MessageImprint = { hashAlgorithm, hashedMessage }. TSA, bu özet üzerinden imzalı bir
// zaman damgası token'ı (TimeStampToken) döner — verinin o anda var olduğunun kanıtı.

var (
	oidSHA256 = asn1.ObjectIdentifier{2, 16, 840, 1, 101, 3, 4, 2, 1}
	oidSHA512 = asn1.ObjectIdentifier{2, 16, 840, 1, 101, 3, 4, 2, 3}
)

type tsaMessageImprint struct {
	HashAlgorithm pkix.AlgorithmIdentifier
	HashedMessage []byte
}

type tsaTimeStampReq struct {
	Version        int
	MessageImprint tsaMessageImprint
	Nonce          *big.Int `asn1:"optional"`
	CertReq        bool     `asn1:"optional,default:false"`
}

// PKIStatusInfo'nun yalnız status alanını okumak için gevşek yapı.
type tsaStatusInfo struct {
	Status int
	Rest   asn1.RawValue `asn1:"optional"`
}
type tsaResp struct {
	Status tsaStatusInfo
	Token  asn1.RawValue `asn1:"optional"`
}

func tsaHash(alg string, data []byte) (pkix.AlgorithmIdentifier, []byte) {
	if alg == "sha512" {
		s := sha512.Sum512(data)
		return pkix.AlgorithmIdentifier{Algorithm: oidSHA512, Parameters: asn1.NullRawValue}, s[:]
	}
	s := sha256.Sum256(data)
	return pkix.AlgorithmIdentifier{Algorithm: oidSHA256, Parameters: asn1.NullRawValue}, s[:]
}

// requestTimestamp: verinin özetini TSA'ya gönderir, tüm yanıtı (TimeStampResp DER) döner.
// status: granted(0)/grantedWithMods(1) ise başarılı.
func requestTimestamp(url, user, pass, hashAlg string, data []byte) (token []byte, err error) {
	algID, digest := tsaHash(hashAlg, data)
	nonce, _ := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 64))
	req := tsaTimeStampReq{
		Version:        1,
		MessageImprint: tsaMessageImprint{HashAlgorithm: algID, HashedMessage: digest},
		Nonce:          nonce,
		CertReq:        true,
	}
	body, err := asn1.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("tsq oluşturulamadı: %w", err)
	}
	httpReq, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/timestamp-query")
	httpReq.Header.Set("Accept", "application/timestamp-reply")
	if user != "" {
		httpReq.SetBasicAuth(user, pass)
	}
	client := &http.Client{
		Timeout:   20 * time.Second,
		Transport: &http.Transport{TLSClientConfig: &tls.Config{MinVersion: tls.VersionTLS12}},
	}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TSA HTTP %d", resp.StatusCode)
	}
	var tr tsaResp
	if _, err := asn1.Unmarshal(raw, &tr); err != nil {
		return nil, fmt.Errorf("TSA yanıtı çözülemedi: %w", err)
	}
	if tr.Status.Status != 0 && tr.Status.Status != 1 {
		return nil, fmt.Errorf("TSA reddetti (status=%d)", tr.Status.Status)
	}
	if len(tr.Token.FullBytes) == 0 {
		return nil, errors.New("TSA token döndürmedi")
	}
	// Tüm TimeStampResp DER'ini saklıyoruz (token + status); harici doğrulanabilir.
	return raw, nil
}
