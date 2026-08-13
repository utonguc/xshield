package main

import (
	"crypto/tls"
	"errors"
	"fmt"
	"net/smtp"
	"strings"
)

// smtpConfig: ortam değişkenlerinden SMTP ayarları (xShield paylaşımlı noreply hesabı).
type smtpConfig struct {
	Host, Port, User, Pass, From, FromName string
	SSL                                    bool
}

func (a *app) smtpCfg() smtpConfig {
	return smtpConfig{
		Host:     env("SMTP_HOST", ""),
		Port:     env("SMTP_PORT", "465"),
		User:     env("SMTP_USER", ""),
		Pass:     env("SMTP_PASS", ""),
		From:     env("SMTP_FROM", env("SMTP_USER", "")),
		FromName: env("GOX_MAIL_FROM_NAME", "goX Misafir Wi-Fi"),
		SSL:      env("SMTP_SSL", "true") != "false",
	}
}

// sendMail: tek alıcıya HTML e-posta gönderir. Port 465 → implicit TLS; aksi halde STARTTLS.
func (a *app) sendMail(to, subject, htmlBody string) error {
	c := a.smtpCfg()
	if c.Host == "" || c.From == "" {
		return errors.New("SMTP yapılandırılmamış")
	}
	addr := c.Host + ":" + c.Port
	msg := buildMessage(c, to, subject, htmlBody)

	if c.Port == "465" || c.SSL {
		// implicit TLS (SMTPS)
		conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: c.Host})
		if err != nil {
			return err
		}
		cl, err := smtp.NewClient(conn, c.Host)
		if err != nil {
			return err
		}
		defer cl.Close()
		return sendWith(cl, c, to, msg)
	}
	// STARTTLS (port 587)
	cl, err := smtp.Dial(addr)
	if err != nil {
		return err
	}
	defer cl.Close()
	if ok, _ := cl.Extension("STARTTLS"); ok {
		if err := cl.StartTLS(&tls.Config{ServerName: c.Host}); err != nil {
			return err
		}
	}
	return sendWith(cl, c, to, msg)
}

func sendWith(cl *smtp.Client, c smtpConfig, to string, msg []byte) error {
	if c.User != "" {
		if err := cl.Auth(smtp.PlainAuth("", c.User, c.Pass, c.Host)); err != nil {
			return err
		}
	}
	if err := cl.Mail(c.From); err != nil {
		return err
	}
	if err := cl.Rcpt(to); err != nil {
		return err
	}
	wc, err := cl.Data()
	if err != nil {
		return err
	}
	if _, err := wc.Write(msg); err != nil {
		return err
	}
	if err := wc.Close(); err != nil {
		return err
	}
	return cl.Quit()
}

func buildMessage(c smtpConfig, to, subject, htmlBody string) []byte {
	var b strings.Builder
	fmt.Fprintf(&b, "From: %s <%s>\r\n", c.FromName, c.From)
	fmt.Fprintf(&b, "To: %s\r\n", to)
	fmt.Fprintf(&b, "Subject: %s\r\n", subject)
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	b.WriteString("\r\n")
	b.WriteString(htmlBody)
	return []byte(b.String())
}
