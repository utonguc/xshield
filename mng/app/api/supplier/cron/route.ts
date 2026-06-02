// Internal cron trigger — protected by JWT session cookie (set in VPS crontab)
// Called by: curl -sk -X POST -H "Cookie: mng_session=..." https://mng.xshield.com.tr/api/supplier/sync
export {};
