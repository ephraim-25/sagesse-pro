import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Pencil, Trash2, BookOpen, Save, X, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSkillsDirectory, groupByCategory, type SkillRow } from "@/hooks/useSkillsDirectory";

export default function SkillsCatalog() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const { skills, loading, reload } = useSkillsDirectory();
  const [search, setSearch] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editing, setEditing] = useState<SkillRow | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return skills;
    return skills.filter(
      (s) => s.category.toLowerCase().includes(q) || s.label.toLowerCase().includes(q),
    );
  }, [skills, search]);

  const grouped = useMemo(() => groupByCategory(filtered), [filtered]);

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!isSuperAdmin) return <Navigate to="/" replace />;

  const create = async () => {
    if (!newCategory.trim() || !newLabel.trim()) {
      toast.error("Catégorie et libellé sont obligatoires");
      return;
    }
    setBusy(true);
    const { error } = await (supabase as any).from("skills_directory").insert({
      category: newCategory.trim(),
      label: newLabel.trim(),
      active: true,
      sort_order: 0,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewLabel("");
    toast.success("Compétence ajoutée au catalogue");
    reload();
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    const { error } = await (supabase as any)
      .from("skills_directory")
      .update({
        category: editing.category.trim(),
        label: editing.label.trim(),
        sort_order: editing.sort_order,
      })
      .eq("id", editing.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Compétence mise à jour");
    setEditing(null);
    reload();
  };

  const toggleActive = async (s: SkillRow) => {
    const { error } = await (supabase as any)
      .from("skills_directory")
      .update({ active: !s.active })
      .eq("id", s.id);
    if (error) toast.error(error.message);
    else {
      toast.success(!s.active ? "Activée" : "Désactivée");
      reload();
    }
  };

  const remove = async (s: SkillRow) => {
    if (!confirm(`Supprimer définitivement « ${s.label} » ?`)) return;
    const { error } = await (supabase as any).from("skills_directory").delete().eq("id", s.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Supprimée");
      reload();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="page-header flex items-center justify-between gap-2">
          <div>
            <h1 className="page-title">Catalogue des compétences</h1>
            <p className="page-description">
              Gestion du catalogue (catégories et libellés). Réservé au Super Administrateur.
            </p>
          </div>
          <Badge className="bg-primary text-primary-foreground">
            <Shield className="w-3 h-3 mr-1" /> Super Administrateur
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="w-4 h-4" /> Ajouter une compétence
            </CardTitle>
            <CardDescription>
              Aucune modification de code n'est nécessaire — les agents verront la nouvelle
              compétence dans leur profil.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
            <Input
              placeholder="Catégorie (ex: Santé & Médical)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <Input
              placeholder="Libellé de la compétence"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <Button onClick={create} disabled={busy}>
              <Plus className="w-4 h-4 mr-1" /> Ajouter
            </Button>
          </CardContent>
        </Card>

        <div className="relative">
          <Input
            placeholder="Rechercher une catégorie ou un libellé..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="bg-card rounded-xl p-10 text-center border border-border/50">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Aucune compétence dans le catalogue.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([cat, items]) => (
              <Card key={cat}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{cat}</CardTitle>
                  <CardDescription>
                    {items.length} compétence{items.length > 1 ? "s" : ""} ·{" "}
                    {items.filter((i) => i.active).length} active
                    {items.filter((i) => i.active).length > 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((s) => {
                    const isEdit = editing?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        className="flex flex-wrap items-center gap-2 p-2 rounded border border-border/50"
                      >
                        {isEdit ? (
                          <>
                            <Input
                              className="flex-1 min-w-[160px] h-8"
                              value={editing!.category}
                              onChange={(e) =>
                                setEditing({ ...editing!, category: e.target.value })
                              }
                            />
                            <Input
                              className="flex-1 min-w-[160px] h-8"
                              value={editing!.label}
                              onChange={(e) =>
                                setEditing({ ...editing!, label: e.target.value })
                              }
                            />
                            <Input
                              type="number"
                              className="w-20 h-8"
                              value={editing!.sort_order}
                              onChange={(e) =>
                                setEditing({
                                  ...editing!,
                                  sort_order: Number(e.target.value) || 0,
                                })
                              }
                            />
                            <Button size="sm" onClick={saveEdit} disabled={busy}>
                              <Save className="w-3 h-3 mr-1" /> Enregistrer
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditing(null)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="text-sm flex-1 min-w-[180px]">{s.label}</span>
                            <Badge variant="outline" className="text-[10px]">
                              ordre {s.sort_order}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>{s.active ? "Actif" : "Inactif"}</span>
                              <Switch
                                checked={s.active}
                                onCheckedChange={() => toggleActive(s)}
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => setEditing(s)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-destructive"
                              onClick={() => remove(s)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
