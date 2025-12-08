import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus, 
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Circle,
  Calendar,
  User,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tasks = [
  { 
    id: 1, 
    title: "Finaliser le rapport annuel 2024",
    description: "Compléter la section financière et les annexes",
    assignee: "Marie Dupont",
    department: "Recherche",
    priority: "high",
    status: "in_progress",
    dueDate: "2024-12-10",
    createdAt: "2024-12-01"
  },
  { 
    id: 2, 
    title: "Révision des politiques de recherche",
    description: "Mettre à jour les directives internes",
    assignee: "Jean Martin",
    department: "Administration",
    priority: "medium",
    status: "pending",
    dueDate: "2024-12-12",
    createdAt: "2024-12-02"
  },
  { 
    id: 3, 
    title: "Organiser la réunion trimestrielle",
    description: "Réserver la salle et préparer l'ordre du jour",
    assignee: "Sophie Bernard",
    department: "Communication",
    priority: "high",
    status: "completed",
    dueDate: "2024-12-08",
    createdAt: "2024-11-28"
  },
  { 
    id: 4, 
    title: "Mettre à jour les données budgétaires",
    description: "Intégrer les dernières dépenses Q4",
    assignee: "Pierre Durand",
    department: "Finance",
    priority: "low",
    status: "pending",
    dueDate: "2024-12-15",
    createdAt: "2024-12-03"
  },
  { 
    id: 5, 
    title: "Audit de sécurité informatique",
    description: "Vérifier les accès et les permissions",
    assignee: "Jean Martin",
    department: "IT",
    priority: "high",
    status: "overdue",
    dueDate: "2024-12-05",
    createdAt: "2024-11-25"
  },
];

const priorityConfig = {
  high: { color: "text-destructive", bg: "bg-destructive/10", label: "Haute" },
  medium: { color: "text-warning", bg: "bg-warning/10", label: "Moyenne" },
  low: { color: "text-muted-foreground", bg: "bg-muted", label: "Basse" },
};

const statusConfig = {
  completed: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Terminée" },
  in_progress: { icon: Clock, color: "text-info", bg: "bg-info/10", label: "En cours" },
  pending: { icon: Circle, color: "text-muted-foreground", bg: "bg-muted", label: "À faire" },
  overdue: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", label: "En retard" },
};

const Tasks = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignee.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    return matchesSearch && task.status === activeTab;
  });

  const taskCounts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
    overdue: tasks.filter(t => t.status === "overdue").length,
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">Gestion des Tâches</h1>
            <p className="page-description">Créez et suivez les tâches du Conseil</p>
          </div>
          <Button className="w-fit">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle tâche
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher une tâche..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtres
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="all">Toutes ({taskCounts.all})</TabsTrigger>
            <TabsTrigger value="pending">À faire ({taskCounts.pending})</TabsTrigger>
            <TabsTrigger value="in_progress">En cours ({taskCounts.in_progress})</TabsTrigger>
            <TabsTrigger value="completed">Terminées ({taskCounts.completed})</TabsTrigger>
            <TabsTrigger value="overdue">En retard ({taskCounts.overdue})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const StatusIcon = statusConfig[task.status as keyof typeof statusConfig].icon;
                const priority = priorityConfig[task.priority as keyof typeof priorityConfig];
                const status = statusConfig[task.status as keyof typeof statusConfig];

                return (
                  <div 
                    key={task.id}
                    className="bg-card rounded-xl p-5 shadow-soft border border-border/50 hover:shadow-card transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        status.bg
                      )}>
                        <StatusIcon className={cn("w-5 h-5", status.color)} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className={cn(
                              "font-semibold text-foreground",
                              task.status === "completed" && "line-through text-muted-foreground"
                            )}>
                              {task.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {task.description}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Voir les détails</DropdownMenuItem>
                              <DropdownMenuItem>Modifier</DropdownMenuItem>
                              <DropdownMenuItem>Marquer comme terminée</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mt-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="w-4 h-4" />
                            <span>{task.assignee}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(task.dueDate).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            priority.bg, priority.color
                          )}>
                            {priority.label}
                          </span>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            status.bg, status.color
                          )}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredTasks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Aucune tâche trouvée</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Tasks;
