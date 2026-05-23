import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  PUBLIC_ADMIN_COMPETENCES,
  NIVEAU_OPTIONS,
  niveauLabel,
} from "@/lib/publicAdminCompetences";

interface Props {
  profileId: string;
}

interface CompetenceRow {
  id: string;
  competence: string;
  niveau: number;
}

export function CompetencesEditor({ profileId }: Props) {
  const [rows, setRows] = useState<CompetenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCategory, setOpenCategory] = useState<string | null>(
    PUBLIC_ADMIN_COMPETENCES[0]?.category ?? null,
  );
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("competences")
      .select("id, competence, niveau")
      .eq("user_id", profileId);
    setRows((data ?? []) as CompetenceRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (profileId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const byLabel = useMemo(() => {
    const m = new Map<string, CompetenceRow>();
    rows.forEach((r) => m.set(r.competence, r));
    return m;
  }, [rows]);

  const add = async (label: string, niveau: number) => {
    setBusy(label);
    const { data, error } = await supabase
      .from("competences")
      .insert({ user_id: profileId, competence: label, niveau })
      .select("id, competence, niveau")
      .single();
    if (error) toast.error(error.message);
    else if (data) {
      setRows((p) => [...p, data as CompetenceRow]);
      toast.success(`« ${label} » ajouté`);
    }
    setBusy(null);
  };

  const updateLevel = async (row: CompetenceRow, niveau: number) => {
    setBusy(row.competence);
    const { error } = await supabase
      .from("competences")
      .update({ niveau })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      setRows((p) => p.map((r) => (r.id === row.id ? { ...r, niveau } : r)));
    }
    setBusy(null);
  };

  const remove = async (row: CompetenceRow) => {
    setBusy(row.competence);
    const { error } = await supabase.from("competences").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      setRows((p) => p.filter((r) => r.id !== row.id));
      toast.success(`« ${row.competence} » retiré`);
    }
    setBusy(null);
  };

  const toggle = async (label: string, checked: boolean) => {
    const existing = byLabel.get(label);
    if (checked && !existing) {
      await add(label, 3); // default Intermédiaire
    } else if (!checked && existing) {
      await remove(existing);
    }
  };

  if (loading) {
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
          (Junior, Intermédiaire, Expert). Aucune saisie libre — la cartographie reste cohérente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {PUBLIC_ADMIN_COMPETENCES.map((cat) => {
          const open = openCategory === cat.category;
          const selectedInCat = cat.items.filter((i) => byLabel.has(i)).length;
          return (
            <div key={cat.category} className="border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenCategory(open ? null : cat.category)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition"
              >
                <div className="flex items-center gap-2 text-left">
                  <span className="font-semibold text-sm">{cat.category}</span>
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
                  {cat.items.map((label) => {
                    const row = byLabel.get(label);
                    const checked = !!row;
                    return (
                      <div
                        key={label}
                        className="flex flex-wrap items-center gap-3 p-2 rounded border border-border/50"
                      >
                        <Checkbox
                          id={`cmp-${label}`}
                          checked={checked}
                          disabled={busy === label}
                          onCheckedChange={(v) => toggle(label, !!v)}
                        />
                        <label
                          htmlFor={`cmp-${label}`}
                          className="text-sm flex-1 cursor-pointer min-w-[160px]"
                        >
                          {label}
                        </label>
                        {checked && row && (
                          <>
                            <Select
                              value={String(row.niveau)}
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
                              {niveauLabel(row.niveau)}
                            </Badge>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              disabled={busy === label}
                              onClick={() => remove(row)}
                              aria-label={`Retirer ${label}`}
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
