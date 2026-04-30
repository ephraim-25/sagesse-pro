import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHolidays } from "@/hooks/useHolidays";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function HolidaysManager() {
  const { holidays, loading } = useHolidays();
  const { profile } = useAuth();
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const addOccasional = async () => {
    if (!date || !label.trim()) {
      toast.error("Date et libellé requis.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("holidays").insert({
      date,
      label: label.trim(),
      is_recurring: false,
      is_occasional: true,
      active: true,
      created_by: profile?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Jour férié occasionnel ajouté.");
    setDate(""); setLabel("");
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("holidays").update({ active }).eq("id", id);
    if (error) toast.error(error.message);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("holidays").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Supprimé.");
  };

  const recurring = holidays.filter((h) => h.is_recurring);
  const occasional = holidays.filter((h) => !h.is_recurring);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Jours fériés (Calendrier RDC)</h3>
      </div>

      {/* Ajouter occasionnel */}
      <div className="bg-muted/40 rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium">Ajouter un jour férié occasionnel</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input placeholder="Libellé (ex: Deuil national)" value={label} onChange={(e) => setLabel(e.target.value)} className="sm:col-span-1" />
          <Button onClick={addOccasional} disabled={saving} className="w-full">
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : (
        <>
          <div>
            <h4 className="text-sm font-medium mb-2">Fériés récurrents (officiels)</h4>
            <div className="space-y-2">
              {recurring.map((h) => (
                <div key={h.id} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
                  <div>
                    <p className="font-medium text-sm">{h.label}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(h.date), "dd MMMM", { locale: fr })} (chaque année)</p>
                  </div>
                  <Switch checked={h.active} onCheckedChange={(v) => toggleActive(h.id, v)} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Fériés occasionnels</h4>
            {occasional.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun jour occasionnel.</p>
            ) : (
              <div className="space-y-2">
                {occasional.map((h) => (
                  <div key={h.id} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Occasionnel</Badge>
                      <div>
                        <p className="font-medium text-sm">{h.label}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(h.date), "dd MMMM yyyy", { locale: fr })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={h.active} onCheckedChange={(v) => toggleActive(h.id, v)} />
                      <Button size="icon" variant="ghost" onClick={() => remove(h.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
