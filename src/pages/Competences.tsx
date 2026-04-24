import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Award,
  BookOpen,
  Code,
  FileSpreadsheet,
  Languages,
  Presentation,
  Users,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const competenceCategories = [
  { id: 1, name: "Technique", icon: Code, color: "text-info bg-info/10" },
  { id: 2, name: "Analytique", icon: FileSpreadsheet, color: "text-accent bg-accent/10" },
  { id: 3, name: "Communication", icon: Presentation, color: "text-warning bg-warning/10" },
  { id: 4, name: "Langues", icon: Languages, color: "text-success bg-success/10" },
  { id: 5, name: "Management", icon: Users, color: "text-primary bg-primary/10" },
];

interface Competence {
  id: string;
  competence: string;
  niveau: number;
  user_id: string;
  profile?: { nom: string; prenom: string };
}

const Competences = () => {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      setLoading(true);
      const { data } = await supabase
        .from("competences")
        .select(`*, profile:profiles!competences_user_id_fkey(nom, prenom)`)
        .order("created_at", { ascending: false });
      setCompetences((data as Competence[]) || []);
      setLoading(false);
    };
    load();
  }, [profile]);

  const filtered = competences.filter((c) => {
    const name = c.profile ? `${c.profile.prenom} ${c.profile.nom}` : "";
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.competence.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalExperts = competences.filter((c) => (c.niveau ?? 0) >= 4).length;
  const totalCompetences = competences.length;
  const uniqueMembers = new Set(competences.map((c) => c.user_id)).size;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">Cartographie des Compétences</h1>
            <p className="page-description">Analysez et gérez les compétences des membres</p>
          </div>
          <Button className="w-fit">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter compétence
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Toutes
          </Button>
          {competenceCategories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.name ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.name)}
              className="gap-2"
            >
              <cat.icon className="w-4 h-4" />
              {cat.name}
            </Button>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un membre ou une compétence..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalExperts}</p>
                <p className="text-sm text-muted-foreground">Experts</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCompetences}</p>
                <p className="text-sm text-muted-foreground">Compétences</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniqueMembers}</p>
                <p className="text-sm text-muted-foreground">Membres évalués</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Formations en cours</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-xl p-12 shadow-soft border border-border/50 text-center">
            <Award className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Aucune compétence enregistrée</p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              Commencez par ajouter une compétence pour cartographier votre expertise.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="bg-card rounded-xl p-5 shadow-soft border border-border/50 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {c.profile ? `${c.profile.prenom[0]}${c.profile.nom[0]}` : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {c.profile ? `${c.profile.prenom} ${c.profile.nom}` : "Inconnu"}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.competence}</p>
                </div>
                <div className="w-32">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Niveau</span>
                    <span className="font-medium">{c.niveau}/5</span>
                  </div>
                  <Progress value={(c.niveau / 5) * 100} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Competences;
