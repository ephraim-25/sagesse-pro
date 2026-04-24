import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Calendar,
  Download,
  Clock,
  LogIn,
  LogOut,
  Laptop,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const typeConfig = {
  presentiel: { label: "Présent", icon: LogIn, color: "text-success bg-success/10" },
  teletravail: { label: "Télétravail", icon: Laptop, color: "text-info bg-info/10" },
  absent: { label: "Absent", icon: LogOut, color: "text-destructive bg-destructive/10" },
};

interface PresenceRow {
  id: string;
  date: string;
  heure_entree: string | null;
  heure_sortie: string | null;
  type: "presentiel" | "teletravail" | null;
  user_id: string;
  profile?: { nom: string; prenom: string };
}

const formatTime = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

const computeDuration = (inIso: string | null, outIso: string | null) => {
  if (!inIso) return "—";
  if (!outIso) return "En cours";
  const ms = new Date(outIso).getTime() - new Date(inIso).getTime();
  if (ms <= 0) return "—";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m.toString().padStart(2, "0")}min`;
};

const History = () => {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [rows, setRows] = useState<PresenceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      setLoading(true);
      const { data } = await supabase
        .from("presences")
        .select(`*, profile:profiles!presences_user_id_fkey(nom, prenom)`)
        .order("date", { ascending: false })
        .limit(200);
      setRows((data as PresenceRow[]) || []);
      setLoading(false);
    };
    load();
  }, [profile]);

  const filtered = rows.filter((r) => {
    const name = r.profile ? `${r.profile.prenom} ${r.profile.nom}` : "";
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || r.type === filterType;
    return matchesSearch && matchesType;
  });

  const presentCount = rows.filter((r) => r.type === "presentiel").length;
  const teleworkCount = rows.filter((r) => r.type === "teletravail").length;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">Historique des Présences</h1>
            <p className="page-description">Consultez l'historique complet des pointages</p>
          </div>
          <Button variant="outline" className="w-fit">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un membre..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="presentiel">Présent</SelectItem>
              <SelectItem value="teletravail">Télétravail</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Période
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50">
            <p className="text-2xl font-bold text-success">{presentCount}</p>
            <p className="text-sm text-muted-foreground">Pointages présentiels</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50">
            <p className="text-2xl font-bold text-info">{teleworkCount}</p>
            <p className="text-sm text-muted-foreground">Pointages télétravail</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50">
            <p className="text-2xl font-bold text-foreground">{rows.length}</p>
            <p className="text-sm text-muted-foreground">Total enregistrements</p>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-soft border border-border/50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Aucun historique disponible</p>
              <p className="text-xs text-muted-foreground/80 mt-1">
                Les pointages des membres apparaîtront ici dès qu'ils seront enregistrés.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Membre</th>
                    <th>Date</th>
                    <th>Arrivée</th>
                    <th>Départ</th>
                    <th>Durée</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const typeKey = (item.type || "presentiel") as keyof typeof typeConfig;
                    const typeInfo = typeConfig[typeKey];
                    const TypeIcon = typeInfo.icon;
                    const name = item.profile ? `${item.profile.prenom} ${item.profile.nom}` : "Inconnu";

                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                              {name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                            <span className="font-medium">{name}</span>
                          </div>
                        </td>
                        <td className="text-muted-foreground">
                          {new Date(item.date).toLocaleDateString("fr-FR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <LogIn className="w-4 h-4 text-success" />
                            <span>{formatTime(item.heure_entree)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <LogOut className="w-4 h-4 text-destructive" />
                            <span>{formatTime(item.heure_sortie)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>{computeDuration(item.heure_entree, item.heure_sortie)}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                              typeInfo.color
                            )}
                          >
                            <TypeIcon className="w-3 h-3" />
                            {typeInfo.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default History;
