// goX API — Faz 2: DB + kimlik doğrulama (auth).
package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Build sırasında -ldflags ile gömülür (deploy izlenebilirliği için).
var version = "dev"

type app struct {
	db        *pgxpool.Pool
	jwtSecret []byte
}

func main() {
	port := env("PORT", "8080")
	dbURL := os.Getenv("DATABASE_URL")
	jwtSecret := os.Getenv("GOX_JWT_SECRET")
	if dbURL == "" || jwtSecret == "" {
		log.Fatal("DATABASE_URL ve GOX_JWT_SECRET zorunlu")
	}

	ctx := context.Background()
	pool, err := connectDB(ctx, dbURL)
	if err != nil {
		log.Fatalf("db bağlantısı başarısız: %v", err)
	}
	defer pool.Close()

	a := &app{db: pool, jwtSecret: []byte(jwtSecret)}

	// Owner hesabını .env'den idempotent kur (yoksa oluştur).
	if err := a.bootstrapOwner(ctx, os.Getenv("GOX_OWNER_EMAIL"), os.Getenv("GOX_OWNER_PASSWORD")); err != nil {
		log.Printf("owner bootstrap uyarısı: %v", err)
	}
	// Demo müşteri + varsayılan profilleri kur (yoksa).
	if err := a.bootstrapDemoCustomer(ctx); err != nil {
		log.Printf("demo müşteri bootstrap uyarısı: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		err := pool.Ping(r.Context())
		status := "ok"
		code := http.StatusOK
		if err != nil {
			status, code = "db_down", http.StatusServiceUnavailable
		}
		writeJSON(w, code, map[string]any{"status": status, "service": "gox_api", "time": time.Now().UTC().Format(time.RFC3339)})
	})
	mux.HandleFunc("/version", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"service": "gox_api", "version": version})
	})
	mux.HandleFunc("/auth/login", a.handleLogin)
	mux.HandleFunc("/auth/me", a.handleMe)

	// Erişim profilleri (JWT korumalı)
	mux.HandleFunc("GET /profiles", a.handleProfilesList)
	mux.HandleFunc("POST /profiles", a.handleProfileCreate)
	mux.HandleFunc("PUT /profiles/{id}", a.handleProfileUpdate)
	mux.HandleFunc("DELETE /profiles/{id}", a.handleProfileDelete)

	// Lokasyonlar (JWT korumalı)
	mux.HandleFunc("GET /sites", a.handleSitesList)
	mux.HandleFunc("POST /sites", a.handleSiteCreate)
	mux.HandleFunc("DELETE /sites/{id}", a.handleSiteDelete)
	mux.HandleFunc("GET /sites/{id}/portal", a.handlePortalGet)
	mux.HandleFunc("PUT /sites/{id}/portal", a.handlePortalUpdate)

	// Captive portal (PUBLIC — auth yok)
	// ZTP enrollment (public, token-gated)
	mux.HandleFunc("GET /enroll/{token}", a.handleEnrollScript)
	mux.HandleFunc("POST /enroll/{token}/pubkey", a.handleEnrollPubkey)
	mux.HandleFunc("GET /enroll/{token}/pubkey", a.handleEnrollPubkeyGet)

	mux.HandleFunc("GET /portal/{id}", a.handlePortalPublic)
	mux.HandleFunc("POST /portal/verify", a.handlePortalVerify)
	mux.HandleFunc("POST /portal/grant", a.handlePortalGrant)
	mux.HandleFunc("POST /portal/email-otp", a.handleEmailOtpSend)
	mux.HandleFunc("POST /portal/wa-start", a.handleWaStart)
	mux.HandleFunc("GET /portal/wa-status", a.handleWaStatus)
	mux.HandleFunc("GET /wa/webhook", a.handleWaWebhookVerify)
	mux.HandleFunc("POST /wa/webhook", a.handleWaWebhookInbound)

	// Landing fiyatlandırma (public)
	mux.HandleFunc("GET /public/plans", a.handlePublicPlans)

	// Bağlam (kullanıcı + müşteri sektörü)
	mux.HandleFunc("GET /context", a.handleContext)
	mux.HandleFunc("POST /set-location", a.handleSetLocation)

	// Kullanıcı yönetimi (tenant yöneticisi; lokasyon yöneticisi atama)
	mux.HandleFunc("GET /users", a.handleUsersList)
	mux.HandleFunc("POST /users", a.handleUserCreate)
	mux.HandleFunc("DELETE /users/{id}", a.handleUserDelete)

	// Genel Bakış (canlı metrikler + sayımlar)
	mux.HandleFunc("GET /overview", a.handleOverview)

	// İzleme (filo + zaman-serisi)
	mux.HandleFunc("GET /monitoring", a.handleMonitoring)
	mux.HandleFunc("GET /reports/locations", a.handleConsolidatedReport)
	mux.HandleFunc("GET /reports", a.handleReports)
	mux.HandleFunc("GET /devices/{id}/metrics/history", a.handleMetricsHistory)

	// PMS (otel, JWT korumalı)
	mux.HandleFunc("GET /pms/config", a.handlePmsConfigGet)
	mux.HandleFunc("PUT /pms/config", a.handlePmsConfigUpdate)
	mux.HandleFunc("GET /pms/guests", a.handlePmsGuestsList)
	mux.HandleFunc("POST /pms/guests", a.handlePmsGuestCreate)
	mux.HandleFunc("PUT /pms/guests/{id}", a.handlePmsGuestUpdate)
	mux.HandleFunc("POST /pms/guests/bulk", a.handlePmsGuestsBulk)
	mux.HandleFunc("DELETE /pms/guests/{id}", a.handlePmsGuestDelete)
	mux.HandleFunc("POST /pms/sync", a.handlePmsSync)
	mux.HandleFunc("GET /pms/connector", a.handlePmsConnector)
	mux.HandleFunc("POST /pms/push", a.handlePmsPush)

	// QR Menü (cafe)
	mux.HandleFunc("GET /menu", a.handleMenuList)
	mux.HandleFunc("POST /menu/categories", a.handleMenuCategoryCreate)
	mux.HandleFunc("DELETE /menu/categories/{id}", a.handleMenuCategoryDelete)
	mux.HandleFunc("POST /menu/items", a.handleMenuItemCreate)
	mux.HandleFunc("PUT /menu/items/{id}", a.handleMenuItemUpdate)
	mux.HandleFunc("DELETE /menu/items/{id}", a.handleMenuItemDelete)
	mux.HandleFunc("GET /menu/public", a.handleMenuPublic)

	// Destek — müşteri tarafı (JWT korumalı, kendi customer'ı)
	mux.HandleFunc("GET /tickets", a.handleCustTicketsList)
	mux.HandleFunc("POST /tickets", a.handleCustTicketCreate)
	mux.HandleFunc("GET /tickets/{id}", a.handleCustTicketGet)
	mux.HandleFunc("POST /tickets/{id}/messages", a.handleCustTicketReply)

	// Anketler (JWT korumalı)
	mux.HandleFunc("GET /surveys", a.handleSurveysList)
	mux.HandleFunc("POST /surveys", a.handleSurveyCreate)
	mux.HandleFunc("GET /surveys/{id}", a.handleSurveyGet)
	mux.HandleFunc("PUT /surveys/{id}", a.handleSurveyUpdate)
	mux.HandleFunc("DELETE /surveys/{id}", a.handleSurveyDelete)

	mux.HandleFunc("GET /surveys/{id}/results", a.handleSurveyResults)

	// Anket (PUBLIC — auth yok)
	mux.HandleFunc("GET /survey/active", a.handleSurveyActivePublic)
	mux.HandleFunc("POST /survey/{id}/respond", a.handleSurveyRespondPublic)

	// MGB (Misafir Geri Bildirim)
	mux.HandleFunc("POST /feedback", a.handleFeedbackPublic) // public
	mux.HandleFunc("GET /feedback", a.handleFeedbackList)    // authed

	// Bağlantı/doğrulama kayıtları (5651)
	mux.HandleFunc("GET /verifications", a.handleVerificationsList)
	mux.HandleFunc("GET /connections", a.handleConnections)
	mux.HandleFunc("POST /connections/action", a.handleConnectionAction)

	// Hesap
	mux.HandleFunc("GET /my/payments", a.handleMyPayments)
	mux.HandleFunc("GET /my/plan", a.handleMyPlan)
	mux.HandleFunc("POST /auth/password", a.handlePasswordChange)

	// Platform yönetimi (yalnız owner)
	mux.HandleFunc("GET /admin/stats", a.handleAdminStats)
	mux.HandleFunc("GET /admin/tenants", a.handleAdminTenantsList)
	mux.HandleFunc("GET /admin/tenants/{id}", a.handleAdminTenantGet)
	mux.HandleFunc("POST /admin/tenants", a.handleAdminTenantCreate)
	mux.HandleFunc("PUT /admin/tenants/{id}", a.handleAdminTenantUpdate)
	mux.HandleFunc("DELETE /admin/tenants/{id}", a.handleAdminTenantDelete)
	mux.HandleFunc("GET /admin/tenants/{id}/payments", a.handleAdminPaymentsList)
	mux.HandleFunc("POST /admin/impersonate", a.handleImpersonate)
	mux.HandleFunc("POST /admin/payments", a.handleAdminPaymentCreate)
	mux.HandleFunc("DELETE /admin/payments/{id}", a.handleAdminPaymentDelete)
	mux.HandleFunc("GET /admin/plans", a.handleAdminPlansList)
	mux.HandleFunc("POST /admin/plans", a.handleAdminPlanCreate)
	mux.HandleFunc("PUT /admin/plans/{id}", a.handleAdminPlanUpdate)
	mux.HandleFunc("DELETE /admin/plans/{id}", a.handleAdminPlanDelete)
	mux.HandleFunc("GET /admin/plan-preview", a.handleAdminPlanPreview)
	mux.HandleFunc("GET /admin/tickets", a.handleAdminTicketsList)
	mux.HandleFunc("POST /admin/tickets", a.handleAdminTicketCreate)
	mux.HandleFunc("GET /admin/tickets/{id}", a.handleAdminTicketGet)
	mux.HandleFunc("PUT /admin/tickets/{id}", a.handleAdminTicketUpdate)
	mux.HandleFunc("POST /admin/tickets/{id}/messages", a.handleAdminTicketReply)

	// MAC erişim listesi (JWT korumalı)
	mux.HandleFunc("GET /macs", a.handleMacsList)
	mux.HandleFunc("POST /macs", a.handleMacCreate)
	mux.HandleFunc("PUT /macs/{id}", a.handleMacUpdate)
	mux.HandleFunc("DELETE /macs/{id}", a.handleMacDelete)
	mux.HandleFunc("GET /sites/{id}/leases", a.handleSiteLeases)

	mux.HandleFunc("GET /staff", a.handleStaffList)
	mux.HandleFunc("POST /staff", a.handleStaffCreate)
	mux.HandleFunc("PUT /staff/{id}", a.handleStaffUpdate)
	mux.HandleFunc("DELETE /staff/{id}", a.handleStaffDelete)

	mux.HandleFunc("GET /vouchers", a.handleVouchersList)
	mux.HandleFunc("POST /vouchers", a.handleVoucherCreate)
	mux.HandleFunc("POST /vouchers/bulk", a.handleVoucherBulkCreate)
	mux.HandleFunc("GET /vouchers/{id}/qr", a.handleVoucherQR)
	mux.HandleFunc("PUT /vouchers/{id}", a.handleVoucherUpdate)
	mux.HandleFunc("DELETE /vouchers/{id}", a.handleVoucherDelete)

	// Cihazlar (JWT korumalı)
	mux.HandleFunc("GET /devices", a.handleDevicesList)
	mux.HandleFunc("POST /devices", a.handleDeviceCreate)
	mux.HandleFunc("DELETE /devices/{id}", a.handleDeviceDelete)
	mux.HandleFunc("GET /devices/{id}/config", a.handleDeviceConfig)
	mux.HandleFunc("PATCH /devices/{id}", a.handleDeviceUpdate)
	mux.HandleFunc("POST /devices/{id}/command", a.handleDeviceCommand)
	mux.HandleFunc("GET /devices/{id}/commands", a.handleDeviceCommands)
	mux.HandleFunc("GET /devices/{id}/backup", a.handleDeviceBackupDownload)
	mux.HandleFunc("GET /devices/{id}/reservations", a.handleReservationsList)
	mux.HandleFunc("POST /devices/{id}/reservations", a.handleReservationsCreate)
	mux.HandleFunc("DELETE /devices/{id}/reservations/{rid}", a.handleReservationDelete)
	mux.HandleFunc("GET /devices/{id}/policy", a.handleDevicePolicy)
	mux.HandleFunc("POST /devices/{id}/walled-garden", a.handleWalledGardenCreate)
	mux.HandleFunc("DELETE /devices/{id}/walled-garden/{wid}", a.handleWalledGardenDelete)
	mux.HandleFunc("POST /devices/{id}/blocks", a.handleBlockCreate)
	mux.HandleFunc("DELETE /devices/{id}/blocks/{bid}", a.handleBlockDelete)
	mux.HandleFunc("POST /devices/{id}/block-mac", a.handleDeviceBlockMac)
	mux.HandleFunc("POST /devices/{id}/limit-mac", a.handleDeviceLimitMac)

	// Uyarı/alarm
	mux.HandleFunc("GET /alerts", a.handleAlertsList)
	mux.HandleFunc("POST /alerts/{id}/ack", a.handleAlertAck)
	mux.HandleFunc("GET /alerts/settings", a.handleAlertSettingsGet)
	mux.HandleFunc("PUT /alerts/settings", a.handleAlertSettingsUpdate)

	// 5651 erişim kayıtları + zaman damgası (TSA)
	mux.HandleFunc("GET /legal/tsa", a.handleTSAConfigGet)
	mux.HandleFunc("PUT /legal/tsa", a.handleTSAConfigUpdate)
	mux.HandleFunc("GET /legal/logs", a.handleAccessLogsList)
	mux.HandleFunc("GET /legal/logs/export", a.handleAccessLogsExport)
	mux.HandleFunc("GET /legal/verify", a.handleVerifyLogs)
	mux.HandleFunc("GET /legal/timestamps", a.handleLogTimestampsList)
	mux.HandleFunc("POST /legal/stamp", a.handleStampNow)

	go a.alertLoop()    // metrikleri eşiklere göre değerlendir, alarm aç/kapat + bildir
	go a.stampingLoop() // TSA etkinse logları periyodik zaman damgasıyla mühürle (yoksa uykuda)

	srv := &http.Server{Addr: ":" + port, Handler: logging(mux), ReadHeaderTimeout: 10 * time.Second}

	go func() {
		log.Printf("gox_api %s listening on :%s", version, port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctxSh, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctxSh)
	log.Println("gox_api stopped")
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}
