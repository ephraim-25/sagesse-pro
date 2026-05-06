import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, History as HistoryIcon, Search, FileDown, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { exportAuditPdf } from "@/lib/auditPdf";
import { toast } from "sonner";

interface AuditRow {
  id: string;
  action: string;
  table_cible: string | null;
  nouvelle_valeur: unknown;
  ancienne_valeur: unknown;
  created_at: string;
  user_id: string | null;
}

interface ProfileLite {
  id: string;
  prenom: string;
  nom: string;
}

export default function Audit() {
  const { isAdmin, isPresident, loading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const focusId = params.get("id");

  const [rows, setRows] = useState<AuditRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);

  // Filtres
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const today = new Date();
  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const [dateFrom, setDateFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(today.toISOString().slice(0, 10));

  const canAccess = isAdmin || isPresident;

  useEffect(() => {
    if (!canAccess) return;
    const load = async () => {
      setLoading(true);
      // Sécurité : ne récupérer QUE les colonnes nécessaires (pas de payloads sensibles bruts).
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, table_cible, nouvelle_valeur, ancienne_valeur, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) {
        toast.error("Accès refusé ou erreur de chargement.");
        setRows([]);
      } else {
        setRows((data ?? []) as AuditRow[]);
        const ids = Array.from(new Set((data ?? []).map((r) => r.user_id).filter(Boolean))) as string[];
        if (ids.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, prenom, nom")
            .in("id", ids);
          const map: Record<string, ProfileLite> = {};
          (profs ?? []).forEach((p) => { map[p.id] = p as ProfileLite; });
          setProfiles(map);
        }
      }
      setLoading(false);
      if (focusId) {
        setTimeout(() => {
          const el = document.getElementById(`audit-${focusId}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 250);
      }
    };
    load();
  }, [focusId, canAccess]);

  const allActions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.action))).sort(),
    [rows]
  );
  const allUsers = useMemo(() => {
    const seen = new Set<string>();
    const list: ProfileLite[] = [];
    rows.forEach((r) => {
      if (r.user_id && profiles[r.user_id] && !seen.has(r.user_id)) {
        seen.add(r.user_id);
        list.push(profiles[r.user_id]);
      }
    });
    return list.sort((a, b) => a.nom.localeCompare(b.nom));
  }, [rows, profiles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      if (userFilter !== "all" && r.user_id !== userFilter) return false;
      const d = r.created_at.slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (q) {
        const actor = r.user_id ? profiles[r.user_id] : undefined;
        const haystack = [
          r.action,
          r.table_cible ?? "",
          actor ? `${actor.prenom} ${actor.nom}` : "",
          JSON.stringify(r.nouvelle_valeur ?? r.ancienne_valeur ?? ""),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, profiles, search, actionFilter, userFilter, dateFrom, dateTo]);

  const summarize = (r: AuditRow): string => {
    const v = (r.nouvelle_valeur ?? r.ancienne_valeur) as Record<string, unknown> | null;
    if (!v || typeof v !== "object") return "";
    // Champs sûrs et utiles : on évite d'afficher des PII brutes.
    const keys = ["leave_id", "cancelled_by_name", "start_date", "end_date", "working_days", "status"];
    return keys
      .filter((k) => v[k] !== undefined && v[k] !== null)
      .map((k) => `${k}: ${String(v[k])}`)
      .join(" · ");
  };

  const handleExport = () => {
    if (!filtered.length) {
      toast.warning("Aucune entrée sur cette période.");
      return;
    }
    exportAuditPdf(
      filtered.map((r) => ({
        created_at: r.created_at,
        action: r.action,
        table_cible: r.table_cible,
        actor_name: r.user_id && profiles[r.user_id]
          ? `${profiles[r.user_id].prenom} ${profiles[r.user_id].nom}`
          : "—",
        summary: summarize(r),
      })),
      dateFrom,
      dateTo
    );
    toast.success("Rapport PDF généré.");
  };

  // Sécurité côté client : seul un admin ou président peut voir cette page.
  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }
  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
        <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <HistoryIcon className="w-6 h-6" />
              Historique d'audit
            </h1>
            <p className="page-description">
              Trace des actions sensibles. Accès limité aux administrateurs et au président.
            </p>
          </div>
          <Button onClick={handleExport} className="w-full sm:w-auto">
            <FileDown className="w-4 h-4 mr-2" /> Exporter PDF
          </Button>
        </div>

        {/* Filtres */}
        <Card>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher (action, table, acteur, contenu)…"
                className="pl-8"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                {allActions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger><SelectValue placeholder="Utilisateur" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les utilisateurs</SelectItem>
                {allUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.prenom} {u.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            {(search || actionFilter !== "all" || userFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(""); setActionFilter("all"); setUserFilter("all"); }}
                className="lg:col-span-5 justify-self-end"
              >
                <X className="w-4 h-4 mr-1" /> Réinitialiser les filtres
              </Button>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aucune entrée d'audit ne correspond à vos critères.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{filtered.length} entrée(s) affichée(s).</p>
            {filtered.map((r) => {
              const focused = focusId === r.id;
              const actor = r.user_id ? profiles[r.user_id] : undefined;
              return (
                <Card
                  id={`audit-${r.id}`}
                  key={r.id}
                  className={cn("transition-all", focused && "ring-2 ring-primary border-primary")}
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        <Badge>{r.action}</Badge>
                        <span className="text-muted-foreground text-xs">{r.table_cible}</span>
                        {actor && (
                          <span className="text-xs text-muted-foreground">
                            par <strong>{actor.prenom} {actor.nom}</strong>
                          </span>
                        )}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "dd MMM yyyy 'à' HH:mm:ss", { locale: fr })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="text-xs">
                    {summarize(r) ? (
                      <p className="text-muted-foreground">{summarize(r)}</p>
                    ) : (
                      <p className="text-muted-foreground italic">Aucun détail synthétique.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
