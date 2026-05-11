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
import { Loader2, History as HistoryIcon, Search, FileDown, X, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
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

// Whitelist of audit columns by role.
// - Admin sees everything (full payloads for forensic).
// - President sees only metadata (no raw before/after payload) — read-only oversight.
const ADMIN_COLUMNS = "id, action, table_cible, nouvelle_valeur, ancienne_valeur, created_at, user_id";
const PRESIDENT_COLUMNS = "id, action, table_cible, created_at, user_id";

const PAGE_SIZE = 25;
type SortKey = "date" | "action" | "user";
type SortDir = "asc" | "desc";

export default function Audit() {
  const { isAdmin, isPresident, loading: authLoading } = useAuth();
  const [params, setParams] = useSearchParams();
  const focusId = params.get("id");

  const [rows, setRows] = useState<AuditRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);

  // Filtres + tri + page — synchronisés avec l'URL
  const search = params.get("q") ?? "";
  const actionFilter = params.get("action") ?? "all";
  const userFilter = params.get("user") ?? "all";
  const today = new Date();
  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const dateFrom = params.get("from") ?? monthAgo.toISOString().slice(0, 10);
  const dateTo = params.get("to") ?? today.toISOString().slice(0, 10);
  const sortKey = (params.get("sort") as SortKey) ?? "date";
  const sortDir = (params.get("dir") as SortDir) ?? "desc";
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === "" || (key !== "q" && value === "all")) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const canAccess = isAdmin || isPresident;
  const fullPayloadAccess = isAdmin; // Only admin can read raw payloads.

  useEffect(() => {
    if (!canAccess) return;
    const load = async () => {
      setLoading(true);
      // Sécurité : la sélection de colonnes côté client est ALIGNÉE sur le rôle.
      // Le président ne demande JAMAIS les payloads bruts (RLS valide aussi côté serveur).
      const cols = fullPayloadAccess ? ADMIN_COLUMNS : PRESIDENT_COLUMNS;
      const { data, error } = await supabase
        .from("audit_logs")
        .select(cols)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) {
        toast.error("Accès refusé ou erreur de chargement.");
        setRows([]);
      } else {
        // Normalise pour TypeScript : forcer la forme AuditRow (champs absents = undefined).
        const safe = (data ?? []).map((r) => ({
          id: (r as Record<string, unknown>).id as string,
          action: (r as Record<string, unknown>).action as string,
          table_cible: ((r as Record<string, unknown>).table_cible ?? null) as string | null,
          created_at: (r as Record<string, unknown>).created_at as string,
          user_id: ((r as Record<string, unknown>).user_id ?? null) as string | null,
          nouvelle_valeur: fullPayloadAccess ? (r as Record<string, unknown>).nouvelle_valeur : null,
          ancienne_valeur: fullPayloadAccess ? (r as Record<string, unknown>).ancienne_valeur : null,
        }));
        setRows(safe);
        const ids = Array.from(new Set(safe.map((r) => r.user_id).filter(Boolean))) as string[];
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
  }, [focusId, canAccess, fullPayloadAccess]);

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
          fullPayloadAccess
            ? JSON.stringify(r.nouvelle_valeur ?? r.ancienne_valeur ?? "")
            : "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, profiles, search, actionFilter, userFilter, dateFrom, dateTo, fullPayloadAccess]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      if (sortKey === "action") return a.action.localeCompare(b.action) * dir;
      if (sortKey === "user") {
        const an = a.user_id && profiles[a.user_id] ? `${profiles[a.user_id].nom}` : "";
        const bn = b.user_id && profiles[b.user_id] ? `${profiles[b.user_id].nom}` : "";
        return an.localeCompare(bn) * dir;
      }
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir, profiles]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const summarize = (r: AuditRow): string => {
    if (!fullPayloadAccess) return ""; // Le président ne voit pas le détail brut.
    const v = (r.nouvelle_valeur ?? r.ancienne_valeur) as Record<string, unknown> | null;
    if (!v || typeof v !== "object") return "";
    const keys = ["leave_id", "cancelled_by_name", "start_date", "end_date", "working_days", "status"];
    return keys
      .filter((k) => v[k] !== undefined && v[k] !== null)
      .map((k) => `${k}: ${String(v[k])}`)
      .join(" · ");
  };

  const handleExport = () => {
    if (!sorted.length) {
      toast.warning("Aucune entrée sur cette période.");
      return;
    }
    exportAuditPdf(
      sorted.map((r) => ({
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
              {!fullPayloadAccess && (
                <span className="block text-xs text-muted-foreground mt-1">
                  Vue oversight : les payloads bruts sont masqués pour cet accès.
                </span>
              )}
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
                onChange={(e) => setParam("q", e.target.value)}
                placeholder="Rechercher (action, table, acteur)…"
                className="pl-8"
              />
            </div>
            <Select value={actionFilter} onValueChange={(v) => setParam("action", v)}>
              <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                {allActions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={(v) => setParam("user", v)}>
              <SelectTrigger><SelectValue placeholder="Utilisateur" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les utilisateurs</SelectItem>
                {allUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.prenom} {u.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input type="date" value={dateFrom} onChange={(e) => setParam("from", e.target.value)} />
              <Input type="date" value={dateTo} onChange={(e) => setParam("to", e.target.value)} />
            </div>

            {/* Tri */}
            <div className="flex gap-2 lg:col-span-3">
              <Select value={sortKey} onValueChange={(v) => setParam("sort", v)}>
                <SelectTrigger className="w-44">
                  <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="action">Action</SelectItem>
                  <SelectItem value="user">Utilisateur</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortDir} onValueChange={(v) => setParam("dir", v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Décroissant</SelectItem>
                  <SelectItem value="asc">Croissant</SelectItem>
                </SelectContent>
              </Select>
              {(search || actionFilter !== "all" || userFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setParams(new URLSearchParams(), { replace: true })}
                >
                  <X className="w-4 h-4 mr-1" /> Réinitialiser
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sorted.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aucune entrée d'audit ne correspond à vos critères.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {sorted.length} entrée(s) · page {safePage}/{totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setParam("page", String(safePage - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setParam("page", String(safePage + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {paged.map((r) => {
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
                      <p className="text-muted-foreground italic">
                        {fullPayloadAccess ? "Aucun détail synthétique." : "Détail masqué (vue oversight)."}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            <div className="flex items-center justify-end gap-1 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setParam("page", String(safePage - 1))}
              >
                <ChevronLeft className="w-4 h-4" /> Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setParam("page", String(safePage + 1))}
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
