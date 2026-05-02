import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Award, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PUBLIC_ADMIN_COMPETENCES, NIVEAU_LABELS } from "@/lib/publicAdminCompetences";

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
  const [saving, setSaving] = useState<string | null>(null);

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

  const getRow = (label: string) => rows.find((r) => r.competence === label);

  const upsert = async (label: string, niveau: number) => {
    setSaving(label);
    const existing = getRow(label);
    if (existing) {
      const { error } = await supabase
        .from("competences")
        .update({ niveau })
        .eq("id", existing.id);
      if (error) toast.error(error.message);
      else {
        setRows((prev) => prev.map((r) => (r.id === existing.id ? { ...r, niveau } : r)));
        toast.success(`« ${label} » mis à jour`);
      }
    } else {
      const { data, error } = await supabase
        .from("competences")
        .insert({ user_id: profileId, competence: label, niveau })
        .select("id, competence, niveau")
        .single();
      if (error) toast.error(error.message);
      else if (data) {
        setRows((prev) => [...prev, data as CompetenceRow]);
        toast.success(`« ${label} » ajouté`);
      }
    }
    setSaving(null);
  };

  const remove = async (label: string) => {
    const existing = getRow(label);
    if (!existing) return;
    const { error } = await supabase.from("competences").delete().eq("id", existing.id);
    if (error) toast.error(error.message);
    else {
      setRows((prev) => prev.filter((r) => r.id !== existing.id));
      toast.success(`« ${label} » retiré`);
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
          Compétences clés (Administration Publique)
        </CardTitle>
        <CardDescription>
          Auto-évaluez vos compétences (1 = notion, 5 = expert). Visibles par votre hiérarchie,
          le Président et l'Administration dans la cartographie des compétences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {PUBLIC_ADMIN_COMPETENCES.map((cat) => (
          <div key={cat.category} className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {cat.category}
            </h4>
            <div className="space-y-3">
              {cat.items.map((label) => {
                const row = getRow(label);
                const value = row?.niveau ?? 0;
                return (
                  <div
                    key={label}
                    className="border border-border rounded-lg p-3 bg-card/50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-medium">{label}</p>
                      <div className="flex items-center gap-2">
                        {value > 0 ? (
                          <Badge variant="secondary" className="text-xs">
                            {NIVEAU_LABELS[value]} ({value}/5)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Non évalué
                          </Badge>
                        )}
                        {row && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => remove(label)}
                            aria-label={`Retirer ${label}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Slider
                        min={0}
                        max={5}
                        step={1}
                        value={[value]}
                        onValueChange={(v) => {
                          // optimistic UI
                          if (row) {
                            setRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, niveau: v[0] } : r))
                            );
                          }
                        }}
                        onValueCommit={(v) => {
                          if (v[0] > 0) upsert(label, v[0]);
                          else if (row) remove(label);
                        }}
                        aria-label={`Niveau pour ${label}`}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant={value > 0 ? "secondary" : "default"}
                        disabled={saving === label}
                        onClick={() => upsert(label, Math.max(1, value))}
                      >
                        {saving === label ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
