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
  Power,
  AlertTriangle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HolidaysManager } from "@/components/settings/HolidaysManager";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { isSuperAdminEmail } from "@/lib/superAdmin";
import { Badge } from "@/components/ui/badge";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

const Settings = () => {
  const { settings, update, save } = useAppSettings();
  const { isAdmin, profile } = useAuth();
  const superAdmin = isSuperAdminEmail(profile?.email);
  const { maintenance_mode, updated_at, setMaintenance } = useMaintenanceMode();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggleMaintenance = async (next: boolean) => {
    try {
      setBusy(true);
      await setMaintenance(next, profile?.id ?? null);
      toast.success(next ? "Mode maintenance ACTIVÉ — plateforme verrouillée." : "Mode maintenance désactivé.");
    } catch (e: any) {
      toast.error(e?.message || "Action refusée");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

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
            {superAdmin && (
              <TabsTrigger value="maintenance" className="text-destructive data-[state=active]:text-destructive">
                <Power className="w-4 h-4 mr-1" /> Maintenance
              </TabsTrigger>
            )}
          </TabsList>

          {superAdmin && (
            <TabsContent value="maintenance">
              <div className="bg-card rounded-xl p-6 shadow-soft border border-destructive/30">
                <div className="flex items-center gap-2 mb-6">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <h3 className="font-semibold text-foreground">Maintenance opérationnelle — Kill Switch</h3>
                </div>

                <div className="space-y-6 max-w-2xl">
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-sm font-medium text-foreground">
                      Mode maintenance : {maintenance_mode ? (
                        <span className="text-destructive font-bold">ACTIVÉ</span>
                      ) : (
                        <span className="text-success font-bold">DÉSACTIVÉ</span>
                      )}
                    </p>
                    {updated_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Dernière mise à jour : {new Date(updated_at).toLocaleString("fr-FR")}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Lorsqu'il est activé, tous les utilisateurs (sauf vous, Super Administrateur) voient un écran
                      de maintenance et perdent l'accès à la plateforme en temps réel.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-border/50 gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">Bouton rouge — Verrouiller la plateforme</p>
                      <p className="text-xs text-muted-foreground">
                        Effet immédiat sur toutes les sessions connectées (temps réel).
                      </p>
                    </div>

                    {maintenance_mode ? (
                      <Button
                        variant="outline"
                        onClick={() => toggleMaintenance(false)}
                        disabled={busy}
                      >
                        {busy ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Power className="w-4 h-4 mr-2" />
                        )}
                        Désactiver et rétablir l'accès
                      </Button>
                    ) : (
                      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" disabled={busy}>
                            <Power className="w-4 h-4 mr-2" />
                            Activer le Kill Switch
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                              <AlertTriangle className="w-5 h-5" /> ATTENTION
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Vous allez verrouiller la plateforme pour tous les utilisateurs.
                              Seul vous, en tant que Super Administrateur, garderez l'accès.
                              Confirmer ?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              disabled={busy}
                              onClick={(e) => { e.preventDefault(); toggleMaintenance(true); }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {busy ? "Activation…" : "Oui, activer le Kill Switch"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

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
