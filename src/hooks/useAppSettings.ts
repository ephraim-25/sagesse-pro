import { useEffect, useState, useCallback } from "react";

export interface AppSettings {
  organizationName: string;
  contactEmail: string;
  timezone: string;
  language: string;
  notifyEmail: boolean;
  notifyTaskReminders: boolean;
  notifyWeeklyReports: boolean;
  notifySecurityAlerts: boolean;
  workStart: string;
  workEnd: string;
  teleworkDaysPerWeek: number;
  autoBackup: boolean;
  maintenanceMode: boolean;
  detailedLogs: boolean;
  // Sécurité
  require2FA: boolean;
  autoLock: boolean;
  loginNotifications: boolean;
  ipRestriction: boolean;
}

const KEY = "sigc_app_settings_v1";

const DEFAULTS: AppSettings = {
  organizationName: "Conseil Scientifique National",
  contactEmail: "contact@csn.gov",
  timezone: "Africa/Kinshasa (UTC+1)",
  language: "Français",
  notifyEmail: true,
  notifyTaskReminders: true,
  notifyWeeklyReports: false,
  notifySecurityAlerts: true,
  workStart: "08:30",
  workEnd: "17:30",
  teleworkDaysPerWeek: 2,
  autoBackup: true,
  maintenanceMode: false,
  detailedLogs: true,
  require2FA: true,
  autoLock: true,
  loginNotifications: false,
  ipRestriction: false,
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      // ignore
    }
  }, []);

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const save = useCallback((patch?: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = patch ? { ...prev, ...patch } : prev;
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { settings, update, save };
}
