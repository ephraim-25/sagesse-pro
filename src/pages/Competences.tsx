import { useState } from "react";
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
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const competenceCategories = [
  { id: 1, name: "Technique", icon: Code, color: "text-info bg-info/10" },
  { id: 2, name: "Analytique", icon: FileSpreadsheet, color: "text-accent bg-accent/10" },
  { id: 3, name: "Communication", icon: Presentation, color: "text-warning bg-warning/10" },
  { id: 4, name: "Langues", icon: Languages, color: "text-success bg-success/10" },
  { id: 5, name: "Management", icon: Users, color: "text-primary bg-primary/10" },
];

const memberCompetences = [
  {
    id: 1,
    name: "Marie Dupont",
    avatar: "MD",
    department: "Recherche",
    level: "Expert",
    competences: [
      { name: "Analyse de données", level: 95, category: "Analytique" },
      { name: "Rédaction scientifique", level: 90, category: "Communication" },
      { name: "Python", level: 85, category: "Technique" },
      { name: "Anglais", level: 80, category: "Langues" },
    ],
    recommendedRole: "Directrice de Recherche"
  },
  {
    id: 2,
    name: "Jean Martin",
    avatar: "JM",
    department: "IT",
    level: "Expert",
    competences: [
      { name: "Développement Web", level: 98, category: "Technique" },
      { name: "Cybersécurité", level: 92, category: "Technique" },
      { name: "Gestion de projet", level: 75, category: "Management" },
      { name: "Documentation technique", level: 88, category: "Communication" },
    ],
    recommendedRole: "Architecte Système"
  },
  {
    id: 3,
    name: "Sophie Bernard",
    avatar: "SB",
    department: "Communication",
    level: "Intermédiaire",
    competences: [
      { name: "Communication digitale", level: 90, category: "Communication" },
      { name: "Réseaux sociaux", level: 85, category: "Communication" },
      { name: "Design graphique", level: 70, category: "Technique" },
      { name: "Anglais", level: 92, category: "Langues" },
    ],
    recommendedRole: "Responsable Communication"
  },
];

const levelColors = {
  Expert: "bg-accent/10 text-accent border-accent/20",
  Intermédiaire: "bg-info/10 text-info border-info/20",
  Junior: "bg-muted text-muted-foreground border-border",
};

const Competences = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
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

        {/* Category Filters */}
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

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un membre ou une compétence..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">24</p>
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
                <p className="text-2xl font-bold">156</p>
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
                <p className="text-2xl font-bold">87%</p>
                <p className="text-sm text-muted-foreground">Couverture</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Formations en cours</p>
              </div>
            </div>
          </div>
        </div>

        {/* Members Competences */}
        <div className="space-y-4">
          {memberCompetences.map((member) => (
            <div 
              key={member.id}
              className="bg-card rounded-xl p-6 shadow-soft border border-border/50"
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* Member Info */}
                <div className="flex items-center gap-4 lg:w-64 flex-shrink-0">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {member.avatar}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.department}</p>
                    <span className={cn(
                      "inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium border",
                      levelColors[member.level as keyof typeof levelColors]
                    )}>
                      {member.level}
                    </span>
                  </div>
                </div>

                {/* Competences */}
                <div className="flex-1 space-y-3">
                  {member.competences
                    .filter(c => !selectedCategory || c.category === selectedCategory)
                    .map((comp, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{comp.name}</span>
                        <span className="text-muted-foreground">{comp.level}%</span>
                      </div>
                      <Progress value={comp.level} className="h-2" />
                    </div>
                  ))}
                </div>

                {/* Recommended Role */}
                <div className="lg:w-48 flex-shrink-0">
                  <div className="p-3 bg-accent/5 rounded-lg border border-accent/20">
                    <p className="text-xs text-muted-foreground mb-1">Rôle recommandé</p>
                    <p className="text-sm font-medium text-accent">{member.recommendedRole}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Competences;
