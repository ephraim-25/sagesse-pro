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
import { useSkillsDirectory, NIVEAU_OPTIONS, niveauLabel } from "@/hooks/useSkillsDirectory";

interface UserCompRow {
  id: string;
  user_id: string;
  skill_id: string;
  level: number;
  skill: { id: string; category: string; label: string } | null;
  profile: { id: string; nom: string; prenom: string; fonction: string | null } | null;
}

interface ResolvedStructure {
  bureau: string | null;
  division: string | null;
  direction: string | null;
}

const Competences = () => {
  const { profile, grade, isSuperAdmin, hasRole, loading: authLoading } = useAuth();

  const isPresident = hasRole("president");
  const isSP = grade?.code === "secretaire_permanent";
  const allowed = isSuperAdmin || isPresident || isSP;

  const { skills } = useSkillsDirectory();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [rows, setRows] = useState<UserCompRow[]>([]);
  const [structures, setStructures] = useState<Record<string, ResolvedStructure>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allowed || !profile) return;
    const load = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("user_competences")
        .select(
          `id, user_id, skill_id, level,
           skill:skills_directory!user_competences_skill_id_fkey(id, category, label),
           profile:profiles!user_competences_user_id_fkey(id, nom, prenom, fonction)`,
        )
        .order("created_at", { ascending: false });
      setRows((data as UserCompRow[]) || []);
      setLoading(false);
    };
    load();
  }, [profile, allowed]);

  // Batch resolve structures in 1 RPC call
  useEffect(() => {
    if (!allowed) return;
    const ids = Array.from(new Set(rows.map((r) => r.user_id))).filter(
      (id) => !structures[id],
    );
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).rpc("resolve_profiles_structure_batch", {
        p_ids: ids,
      });
      if (cancelled || !Array.isArray(data)) return;
      const next: Record<string, ResolvedStructure> = {};
      for (const row of data) {
        next[row.profile_id] = {
          bureau: row.bureau ?? null,
          division: row.division ?? null,
          direction: row.direction ?? null,
        };
      }
      setStructures((p) => ({ ...p, ...next }));
    })();
    return () => {
      cancelled = true;
    };
  }, [rows, allowed, structures]);

  const categories = useMemo(
    () => Array.from(new Set(skills.map((s) => s.category))).sort(),
    [skills],
  );
  const skillsInCategory = useMemo(() => {
    if (category === "all") return skills;
    return skills.filter((s) => s.category === category);
  }, [skills, category]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      if (category !== "all" && r.skill?.category !== category) return false;
      if (skillFilter !== "all" && r.skill_id !== skillFilter) return false;
      if (levelFilter !== "all" && String(r.level) !== levelFilter) return false;
      if (q) {
        const name = r.profile ? `${r.profile.prenom} ${r.profile.nom}`.toLowerCase() : "";
        const lbl = r.skill?.label.toLowerCase() ?? "";
        if (
          !name.includes(q) &&
          !lbl.includes(q) &&
          !(r.profile?.fonction ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [rows, search, category, skillFilter, levelFilter]);

  const totalExperts = rows.filter((r) => r.level >= 5).length;
  const uniqueMembers = new Set(rows.map((r) => r.user_id)).size;

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
              setSkillFilter("all");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={skillFilter} onValueChange={setSkillFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Compétence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes compétences</SelectItem>
              {skillsInCategory.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
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

        <div className="flex flex-wrap gap-2">
          <Button
            variant={category === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setCategory("all");
              setSkillFilter("all");
            }}
          >
            Toutes
          </Button>
          {categories.map((c) => (
            <Button
              key={c}
              variant={category === c ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setCategory(c);
                setSkillFilter("all");
              }}
            >
              {c}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile icon={<Award className="w-5 h-5 text-primary" />} value={totalExperts} label="Experts" />
          <StatTile
            icon={<BookOpen className="w-5 h-5 text-info" />}
            value={rows.length}
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
            {filtered.map((r) => {
              const struct = structures[r.user_id];
              return (
                <div
                  key={r.id}
                  className="bg-card rounded-xl p-4 shadow-soft border border-border/50 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {r.profile ? `${r.profile.prenom[0]}${r.profile.nom[0]}` : "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {r.profile ? `${r.profile.prenom} ${r.profile.nom}` : "Inconnu"}
                      </p>
                      {r.profile?.fonction && (
                        <p className="text-xs text-muted-foreground truncate">
                          {r.profile.fonction}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {niveauLabel(r.level)}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm font-medium">{r.skill?.label}</p>
                    {r.skill?.category && (
                      <p className="text-xs text-muted-foreground">{r.skill.category}</p>
                    )}
                    <Progress value={(r.level / 5) * 100} className="h-2 mt-2" />
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
