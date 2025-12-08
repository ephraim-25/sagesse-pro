import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { 
  Shield,
  Key,
  Lock,
  Eye,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Users,
  Settings,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const auditLogs = [
  { id: 1, action: "Connexion", user: "Marie Dupont", ip: "192.168.1.45", time: "Il y a 5 min", status: "success" },
  { id: 2, action: "Modification profil", user: "Jean Martin", ip: "192.168.1.23", time: "Il y a 15 min", status: "success" },
  { id: 3, action: "Tentative connexion", user: "Inconnu", ip: "185.234.12.89", time: "Il y a 30 min", status: "failed" },
  { id: 4, action: "Export données", user: "Admin", ip: "192.168.1.1", time: "Il y a 1h", status: "success" },
  { id: 5, action: "Modification RLS", user: "Admin", ip: "192.168.1.1", time: "Il y a 2h", status: "success" },
];

const securitySettings = [
  { id: 1, name: "Authentification à deux facteurs", description: "Exiger 2FA pour tous les utilisateurs", enabled: true },
  { id: 2, name: "Verrouillage automatique", description: "Verrouiller après 15 min d'inactivité", enabled: true },
  { id: 3, name: "Notifications de connexion", description: "Envoyer un email à chaque connexion", enabled: false },
  { id: 4, name: "Restriction IP", description: "Limiter l'accès aux IPs autorisées", enabled: false },
];

const rolePermissions = [
  { role: "Président", users: 1, permissions: ["Tout accès", "Audit", "Configuration"] },
  { role: "Administrateur", users: 3, permissions: ["Gestion utilisateurs", "Rapports", "Configuration"] },
  { role: "Chef de Service", users: 5, permissions: ["Gestion équipe", "Rapports", "Tâches"] },
  { role: "Agent", users: 56, permissions: ["Pointage", "Tâches personnelles", "Profil"] },
];

const Security = () => {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">Sécurité & Gouvernance</h1>
            <p className="page-description">Gérez la sécurité et les accès du système</p>
          </div>
          <Button>
            <Settings className="w-4 h-4 mr-2" />
            Configuration avancée
          </Button>
        </div>

        {/* Security Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">98%</p>
                <p className="text-sm text-muted-foreground">Score sécurité</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">87%</p>
                <p className="text-sm text-muted-foreground">2FA activé</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-muted-foreground">Alertes actives</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">1,248</p>
                <p className="text-sm text-muted-foreground">Logs ce mois</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Security Settings */}
          <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Paramètres de Sécurité</h3>
            </div>
            <div className="space-y-4">
              {securitySettings.map((setting) => (
                <div key={setting.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{setting.name}</p>
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  </div>
                  <Switch checked={setting.enabled} />
                </div>
              ))}
            </div>
          </div>

          {/* Role Permissions */}
          <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Rôles & Permissions</h3>
            </div>
            <div className="space-y-4">
              {rolePermissions.map((role) => (
                <div key={role.role} className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{role.role}</span>
                    <span className="text-xs text-muted-foreground">{role.users} utilisateurs</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map((perm) => (
                      <span key={perm} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Logs */}
          <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Journal d'Audit</h3>
              </div>
              <Button variant="ghost" size="sm">Voir tout</Button>
            </div>
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    log.status === "success" ? "bg-success/10" : "bg-destructive/10"
                  )}>
                    {log.status === "success" ? (
                      <CheckCircle2 className="w-3 h-3 text-success" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">{log.user} • {log.ip}</p>
                    <p className="text-xs text-muted-foreground/60">{log.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Security;
