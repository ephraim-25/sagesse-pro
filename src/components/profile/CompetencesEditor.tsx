import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Award, Loader2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import {
  useSkillsDirectory,
  groupByCategory,
  NIVEAU_OPTIONS,
  niveauLabel,
} from "@/hooks/useSkillsDirectory";

interface Props {
  profileId: string;
}

interface UserCompetenceRow {
  id: string;
  skill_id: string;
  level: number;
}

export function CompetencesEditor({ profileId }: Props) {
  const { skills, loading: catalogLoading } = useSkillsDirectory({ onlyActive: true });
  const [rows, setRows] = useState<UserCompetenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("user_competences")
      .select("id, skill_id, level")
      .eq("user_id", profileId);
    setRows((data as UserCompetenceRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (profileId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const grouped = useMemo(() => groupByCategory(skills), [skills]);
  const categories = Object.keys(grouped);

  useEffect(() => {
    if (!openCategory && categories[0]) setOpenCategory(categories[0]);
  }, [categories, openCategory]);

  const bySkill = useMemo(() => {
    const m = new Map<string, UserCompetenceRow>();
    rows.forEach((r) => m.set(r.skill_id, r));
    return m;
  }, [rows]);

  const add = async (skillId: string, level: number, label: string) => {
    setBusy(skillId);
    const { data, error } = await (supabase as any)
      .from("user_competences")
      .insert({ user_id: profileId, skill_id: skillId, level })
      .select("id, skill_id, level")
      .single();
    if (error) toast.error(error.message);
    else if (data) {
      setRows((p) => [...p, data as UserCompetenceRow]);
      toast.success(`« ${label} » ajouté`);
    }
    setBusy(null);
  };

  const updateLevel = async (row: UserCompetenceRow, level: number) => {
    setBusy(row.skill_id);
    const { error } = await (supabase as any)
      .from("user_competences")
      .update({ level })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else setRows((p) => p.map((r) => (r.id === row.id ? { ...r, level } : r)));
    setBusy(null);
  };

  const remove = async (row: UserCompetenceRow, label: string) => {
    setBusy(row.skill_id);
    const { error } = await (supabase as any)
      .from("user_competences")
      .delete()
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      setRows((p) => p.filter((r) => r.id !== row.id));
      toast.success(`« ${label} » retiré`);
    }
    setBusy(null);
  };

  const toggle = async (skillId: string, label: string, checked: boolean) => {
    const existing = bySkill.get(skillId);
    if (checked && !existing) await add(skillId, 3, label);
    else if (!checked && existing) await remove(existing, label);
  };

  if (loading || catalogLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Compétences professionnelles
        </CardTitle>
        <CardDescription>
          Choisissez une catégorie, cochez vos compétences puis indiquez votre niveau
          (Junior, Intermédiaire, Expert). Aucune saisie libre — le catalogue est géré
          par le Super Administrateur.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            Aucune compétence active dans le catalogue.
          </p>
        )}
        {categories.map((cat) => {
          const items = grouped[cat];
          const open = openCategory === cat;
          const selectedInCat = items.filter((i) => bySkill.has(i.id)).length;
          return (
            <div key={cat} className="border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenCategory(open ? null : cat)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition"
              >
                <div className="flex items-center gap-2 text-left">
                  <span className="font-semibold text-sm">{cat}</span>
                  {selectedInCat > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedInCat} sélectionnée{selectedInCat > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {open && (
                <div className="p-3 space-y-2 bg-card">
                  {items.map((s) => {
                    const row = bySkill.get(s.id);
                    const checked = !!row;
                    return (
                      <div
                        key={s.id}
                        className="flex flex-wrap items-center gap-3 p-2 rounded border border-border/50"
                      >
                        <Checkbox
                          id={`cmp-${s.id}`}
                          checked={checked}
                          disabled={busy === s.id}
                          onCheckedChange={(v) => toggle(s.id, s.label, !!v)}
                        />
                        <label
                          htmlFor={`cmp-${s.id}`}
                          className="text-sm flex-1 cursor-pointer min-w-[160px]"
                        >
                          {s.label}
                        </label>
                        {checked && row && (
                          <>
                            <Select
                              value={String(row.level)}
                              onValueChange={(v) => updateLevel(row, Number(v))}
                            >
                              <SelectTrigger className="h-8 w-[150px]">
                                <SelectValue placeholder="Niveau" />
                              </SelectTrigger>
                              <SelectContent>
                                {NIVEAU_OPTIONS.map((n) => (
                                  <SelectItem key={n.value} value={String(n.value)}>
                                    {n.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Badge variant="outline" className="text-xs">
                              {niveauLabel(row.level)}
                            </Badge>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              disabled={busy === s.id}
                              onClick={() => remove(row, s.label)}
                              aria-label={`Retirer ${s.label}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
