export type SoftwareItem  = { name: string; version?: string; publisher?: string; install_date?: string };
export type PatchItem     = { hotfix_id: string; description?: string; installed_on?: string };
export type USBDevice     = { friendly_name: string; device_id?: string };
export type ProcessItem   = { pid: number; name: string; cpu_percent: number; mem_mb: number; status: string };
export type ServiceItem   = { name: string; display?: string; status: string; start_type?: string };
export type SecurityEvent = { event_id: number; time: string; user?: string; message?: string };
export type NetIOItem     = { interface: string; sent_mb: number; recv_mb: number; sent_pkts?: number; recv_pkts?: number };

export type ActivityEvent = {
  type: "metric" | "sysinfo";
  agent_id: number;
  time: string;
  detail: string;
};

export type SysInfoRecord = {
  agent_id: number;
  company_name: string;
  hostname: string | null;
  software: SoftwareItem[] | null;
  patches: PatchItem[] | null;
  active_users: string[] | null;
  usb_devices: USBDevice[] | null;
  top_processes: ProcessItem[] | null;
  services: ServiceItem[] | null;
  security_events: SecurityEvent[] | null;
  net_io: NetIOItem[] | null;
  collected_at: string;
};
