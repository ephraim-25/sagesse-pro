import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings as SettingsIcon,
  Building2,
  Bell,
  Database,
  Save,
  CalendarDays,
  Shield as ShieldIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HolidaysManager } from "@/components/settings/HolidaysManager";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { isSuperAdminEmail } from "@/lib/superAdmin";
import { Badge } from "@/components/ui/badge";

const Settings = () => {
  const { settings, update, save } = useAppSettings();
  const { isAdmin, profile } = useAuth();
  const superAdmin = isSuperAdminEmail(profile?.email);

  const handleSave = (label: string) => {
    save();
    toast.success(`${label} enregistrés.`);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="page-title">Paramètres</h1>
            <p className="page-description">Configurez les paramètres du système (sauvegarde locale).</p>
          </div>
          {superAdmin && (
            <Badge className="bg-primary text-primary-foreground">
              <ShieldIcon className="w-3 h-3 mr-1" /> Super Administrateur
            </Badge>
          )}
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="organization">Organisation</TabsTrigger>
            <TabsTrigger value="calendar">
              <CalendarDays className="w-4 h-4 mr-1" /> Calendrier
            </TabsTrigger>
            <TabsTrigger value="system">Système</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
              <HolidaysManager />
            </div>
          </TabsContent>

          <TabsContent value="general">
            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
              <div className="flex items-center gap-2 mb-6">
                <SettingsIcon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Paramètres Généraux</h3>
              </div>

              <div className="space-y-6 max-w-2xl">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom de l'organisation</label>
                  <Input
                    value={settings.organizationName}
                    onChange={(e) => update("organizationName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email de contact</label>
                  <Input
                    type="email"
                    value={settings.contactEmail}
                    onChange={(e) => update("contactEmail", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fuseau horaire</label>
                  <Input
                    value={settings.timezone}
                    onChange={(e) => update("timezone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Langue par défaut</label>
                  <Input
                    value={settings.language}
                    onChange={(e) => update("language", e.target.value)}
                  />
                </div>
                <Button onClick={() => handleSave("Paramètres généraux")}>
                  <Save className="w-4 h-4 mr-2" /> Enregistrer
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
              <div className="flex items-center gap-2 mb-6">
                <Bell className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Notifications</h3>
              </div>
              <div className="space-y-4 max-w-2xl">
                <Row label="Notifications par email" desc="Recevoir les alertes par email"
                  checked={settings.notifyEmail}
                  onChange={(v) => update("notifyEmail", v)} />
                <Row label="Rappels de tâches" desc="Notification avant les échéances"
                  checked={settings.notifyTaskReminders}
                  onChange={(v) => update("notifyTaskReminders", v)} />
                <Row label="Rapports hebdomadaires" desc="Résumé automatique chaque lundi"
                  checked={settings.notifyWeeklyReports}
                  onChange={(v) => update("notifyWeeklyReports", v)} />
                <Row label="Alertes de sécurité" desc="Notifications en cas d'activité suspecte"
                  checked={settings.notifySecurityAlerts}
                  onChange={(v) => update("notifySecurityAlerts", v)} />
                <Button onClick={() => handleSave("Préférences de notifications")}>
                  <Save className="w-4 h-4 mr-2" /> Enregistrer
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="organization">
            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
              <div className="flex items-center gap-2 mb-6">
                <Building2 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Organisation</h3>
              </div>
              <div className="space-y-6 max-w-2xl">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Horaires de travail par défaut</label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input type="time" value={settings.workStart} onChange={(e) => update("workStart", e.target.value)} />
                    <Input type="time" value={settings.workEnd} onChange={(e) => update("workEnd", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jours de télétravail autorisés / semaine</label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={settings.teleworkDaysPerWeek}
                    onChange={(e) => update("teleworkDaysPerWeek", Number(e.target.value))}
                    className="w-24"
                  />
                </div>
                <Button onClick={() => handleSave("Paramètres d'organisation")}>
                  <Save className="w-4 h-4 mr-2" /> Enregistrer
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="system">
            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
              <div className="flex items-center gap-2 mb-6">
                <Database className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Système</h3>
              </div>
              <div className="space-y-6 max-w-2xl">
                <Row label="Sauvegarde automatique" desc="Toutes les 24 heures"
                  checked={settings.autoBackup} onChange={(v) => update("autoBackup", v)} />
                <Row label="Mode maintenance" desc="Désactiver l'accès utilisateur"
                  checked={settings.maintenanceMode} onChange={(v) => update("maintenanceMode", v)} />
                <Row label="Logs détaillés" desc="Enregistrer toutes les actions"
                  checked={settings.detailedLogs} onChange={(v) => update("detailedLogs", v)} />
                <Button onClick={() => handleSave("Paramètres système")} disabled={!isAdmin}>
                  <Save className="w-4 h-4 mr-2" /> Enregistrer
                </Button>
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground">Réservé aux administrateurs.</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

function Row({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 gap-4">
      <div className="min-w-0">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default Settings;
