import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Award, BookOpen, TrendingUp, Users, Loader2, Building2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  PUBLIC_ADMIN_COMPETENCES,
  NIVEAU_OPTIONS,
  findCategoryFor,
  niveauLabel,
} from "@/lib/publicAdminCompetences";

interface Competence {
  id: string;
  competence: string;
  niveau: number;
  user_id: string;
  profile?: { nom: string; prenom: string; fonction: string | null };
}

interface ResolvedStructure {
  bureau: string | null;
  division: string | null;
  direction: string | null;
}

const Competences = () => {
  const { profile, grade, isSuperAdmin, hasRole, loading: authLoading } = useAuth();

  // Strict access: only Président, Secrétaire Permanent or Super Admin
  const isPresident = hasRole("president");
  const isSP = grade?.code === "secretaire_permanent";
  const allowed = isSuperAdmin || isPresident || isSP;

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [competenceFilter, setCompetenceFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [structures, setStructures] = useState<Record<string, ResolvedStructure>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allowed || !profile) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("competences")
        .select(
          `*, profile:profiles!competences_user_id_fkey(nom, prenom, fonction)`,
        )
        .order("created_at", { ascending: false });
      setCompetences((data as Competence[]) || []);
      setLoading(false);
    };
    load();
  }, [profile, allowed]);

  // Resolve hierarchical structure for each unique user shown
  useEffect(() => {
    if (!allowed) return;
    const ids = Array.from(new Set(competences.map((c) => c.user_id))).filter(
      (id) => !structures[id],
    );
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, ResolvedStructure> = {};
      for (const id of ids) {
        const { data } = await supabase.rpc("resolve_profile_structure", {
          p_profile_id: id,
        });
        const row = Array.isArray(data) ? data[0] : data;
        next[id] = {
          bureau: row?.bureau ?? null,
          division: row?.division ?? null,
          direction: row?.direction ?? null,
        };
      }
      if (!cancelled) setStructures((p) => ({ ...p, ...next }));
    })();
    return () => {
      cancelled = true;
    };
  }, [competences, allowed, structures]);

  const competencesInCategory = useMemo(() => {
    if (category === "all") return PUBLIC_ADMIN_COMPETENCES.flatMap((c) => c.items);
    return PUBLIC_ADMIN_COMPETENCES.find((c) => c.category === category)?.items ?? [];
  }, [category]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return competences.filter((c) => {
      if (category !== "all" && findCategoryFor(c.competence) !== category) return false;
      if (competenceFilter !== "all" && c.competence !== competenceFilter) return false;
      if (levelFilter !== "all" && String(c.niveau) !== levelFilter) return false;
      if (q) {
        const name = c.profile ? `${c.profile.prenom} ${c.profile.nom}`.toLowerCase() : "";
        if (
          !name.includes(q) &&
          !c.competence.toLowerCase().includes(q) &&
          !(c.profile?.fonction ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [competences, search, category, competenceFilter, levelFilter]);

  const totalExperts = competences.filter((c) => (c.niveau ?? 0) >= 5).length;
  const uniqueMembers = new Set(competences.map((c) => c.user_id)).size;

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!allowed) return <Navigate to="/" replace />;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="page-header mb-0">
          <h1 className="page-title">Cartographie des Compétences</h1>
          <p className="page-description">
            Recherche stratégique des compétences (accès Président, Secrétaire Permanent et Super
            Admin uniquement).
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Nom, fonction, mot-clé..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v);
              setCompetenceFilter("all");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {PUBLIC_ADMIN_COMPETENCES.map((c) => (
                <SelectItem key={c.category} value={c.category}>
                  {c.category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={competenceFilter} onValueChange={setCompetenceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Compétence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes compétences</SelectItem>
              {competencesInCategory.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Niveau" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous niveaux</SelectItem>
              {NIVEAU_OPTIONS.map((n) => (
                <SelectItem key={n.value} value={String(n.value)}>
                  {n.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick filter chips */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={category === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setCategory("all");
              setCompetenceFilter("all");
            }}
          >
            Toutes
          </Button>
          {PUBLIC_ADMIN_COMPETENCES.map((c) => (
            <Button
              key={c.category}
              variant={category === c.category ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setCategory(c.category);
                setCompetenceFilter("all");
              }}
            >
              {c.category}
            </Button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile icon={<Award className="w-5 h-5 text-primary" />} value={totalExperts} label="Experts" />
          <StatTile
            icon={<BookOpen className="w-5 h-5 text-info" />}
            value={competences.length}
            label="Compétences"
          />
          <StatTile
            icon={<TrendingUp className="w-5 h-5 text-success" />}
            value={uniqueMembers}
            label="Agents évalués"
          />
          <StatTile
            icon={<Users className="w-5 h-5 text-warning" />}
            value={filtered.length}
            label="Résultats filtrés"
          />
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-xl p-12 shadow-soft border border-border/50 text-center">
            <Award className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Aucun agent ne correspond à ces critères
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((c) => {
              const struct = structures[c.user_id];
              const cat = findCategoryFor(c.competence);
              return (
                <div
                  key={c.id}
                  className="bg-card rounded-xl p-4 shadow-soft border border-border/50 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {c.profile ? `${c.profile.prenom[0]}${c.profile.nom[0]}` : "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {c.profile ? `${c.profile.prenom} ${c.profile.nom}` : "Inconnu"}
                      </p>
                      {c.profile?.fonction && (
                        <p className="text-xs text-muted-foreground truncate">{c.profile.fonction}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {niveauLabel(c.niveau)}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm font-medium">{c.competence}</p>
                    {cat && <p className="text-xs text-muted-foreground">{cat}</p>}
                    <Progress value={(c.niveau / 5) * 100} className="h-2 mt-2" />
                  </div>

                  <div className="flex items-start gap-2 text-xs text-muted-foreground border-t border-border/50 pt-2">
                    <Building2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      {struct ? (
                        <>
                          <p>
                            <span className="font-medium text-foreground">Bureau:</span>{" "}
                            {struct.bureau ?? "—"}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">Division:</span>{" "}
                            {struct.division ?? "—"}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">Direction:</span>{" "}
                            {struct.direction ?? "—"}
                          </p>
                        </>
                      ) : (
                        <p className="italic">Résolution affectation…</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default Competences;
