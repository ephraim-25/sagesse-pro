import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings } from "@/hooks/useAppSettings";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface AuditLite {
  id: string;
  action: string;
  table_cible: string | null;
  created_at: string;
  user_id: string | null;
}

const Security = () => {
  const { settings, update } = useAppSettings();
  const [logs, setLogs] = useState<AuditLite[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState({ users: 0, admins: 0, presidents: 0, chefs: 0, agents: 0 });

  useEffect(() => {
    const load = async () => {
      const { data: l } = await supabase
        .from("audit_logs")
        .select("id, action, table_cible, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(20);
      setLogs((l ?? []) as AuditLite[]);

      const ids = Array.from(new Set((l ?? []).map((x) => x.user_id).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, prenom, nom").in("id", ids);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((p) => { map[p.id] = `${p.prenom} ${p.nom}`; });
        setUsers(map);
      }

      const { data: roles } = await supabase.from("user_roles").select("role");
      const c = { users: 0, admins: 0, presidents: 0, chefs: 0, agents: 0 };
      (roles ?? []).forEach((r) => {
        c.users++;
        if (r.role === "admin") c.admins++;
        else if (r.role === "president") c.presidents++;
        else if (r.role === "chef_service") c.chefs++;
        else c.agents++;
      });
      setCounts(c);
    };
    load();
  }, []);

  const score = useMemo(() => {
    let s = 60;
    if (settings.require2FA) s += 15;
    if (settings.autoLock) s += 10;
    if (settings.loginNotifications) s += 5;
    if (settings.detailedLogs) s += 5;
    if (settings.notifySecurityAlerts) s += 5;
    return Math.min(100, s);
  }, [settings]);

  const securitySettings = [
    { id: "require2FA" as const, name: "Authentification à deux facteurs", description: "Exiger 2FA pour tous les utilisateurs" },
    { id: "autoLock" as const, name: "Verrouillage automatique", description: "Verrouiller après 15 min d'inactivité" },
    { id: "loginNotifications" as const, name: "Notifications de connexion", description: "Envoyer un email à chaque connexion" },
    { id: "ipRestriction" as const, name: "Restriction IP", description: "Limiter l'accès aux IPs autorisées" },
  ];

  const rolePermissions = [
    { role: "Président", users: counts.presidents, permissions: ["Tout accès", "Audit", "Configuration"] },
    { role: "Administrateur", users: counts.admins, permissions: ["Gestion utilisateurs", "Rapports", "Configuration"] },
    { role: "Chef de Service", users: counts.chefs, permissions: ["Gestion équipe", "Rapports", "Tâches"] },
    { role: "Agent", users: counts.agents, permissions: ["Pointage", "Tâches personnelles", "Profil"] },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">Sécurité & Gouvernance</h1>
            <p className="page-description">Gérez la sécurité et les accès du système</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/parametres"><SettingsIcon className="w-4 h-4 mr-2" /> Configuration avancée</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={Shield} tone="success" value={`${score}%`} label="Score sécurité" />
          <Stat icon={Key} tone="info" value={settings.require2FA ? "Activé" : "Désactivé"} label="2FA" />
          <Stat icon={AlertTriangle} tone="warning" value={String(logs.length)} label="Évènements récents" />
          <Stat icon={FileText} tone="primary" value={String(counts.users)} label="Comptes actifs" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Paramètres de Sécurité</h3>
            </div>
            <div className="space-y-4">
              {securitySettings.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                  <Switch
                    checked={settings[s.id]}
                    onCheckedChange={(v) => {
                      update(s.id, v);
                      toast.success(`${s.name} : ${v ? "activée" : "désactivée"}`);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

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
                    <span className="text-xs text-muted-foreground">{role.users} utilisateur(s)</span>
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

          <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Journal d'Audit</h3>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/audit">Voir tout</Link>
              </Button>
            </div>
            <div className="space-y-3">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune entrée récente.</p>
              ) : logs.map((log) => (
                <Link
                  key={log.id}
                  to={`/audit?id=${log.id}`}
                  className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0 hover:bg-accent/40 -mx-2 px-2 rounded transition-colors"
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-success/10"
                  )}>
                    <CheckCircle2 className="w-3 h-3 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.action}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {log.user_id ? users[log.user_id] ?? "—" : "—"} · {log.table_cible ?? ""}
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      {format(new Date(log.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

function Stat({ icon: Icon, tone, value, label }: {
  icon: typeof Shield; tone: "success" | "info" | "warning" | "primary"; value: string; label: string;
}) {
  const toneClass: Record<string, string> = {
    success: "bg-success/10 text-success",
    info: "bg-info/10 text-info",
    warning: "bg-warning/10 text-warning",
    primary: "bg-primary/10 text-primary",
  };
  return (
    <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", toneClass[tone])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default Security;
