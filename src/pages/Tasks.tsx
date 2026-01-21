import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  MoreHorizontal,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTaches, useCreateTache, useUpdateTache, useProfiles, type Tache } from "@/hooks/useData";
import { useAssignableMembers } from "@/hooks/useHierarchy";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const priorityConfig = {
  faible: { color: "text-muted-foreground", bg: "bg-muted", label: "Basse" },
  moyen: { color: "text-warning", bg: "bg-warning/10", label: "Moyenne" },
  eleve: { color: "text-orange-500", bg: "bg-orange-500/10", label: "Élevée" },
  urgente: { color: "text-destructive", bg: "bg-destructive/10", label: "Urgente" },
};

const statusConfig = {
  termine: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Terminée" },
  en_cours: { icon: Clock, color: "text-info", bg: "bg-info/10", label: "En cours" },
  a_faire: { icon: Circle, color: "text-muted-foreground", bg: "bg-muted", label: "À faire" },
  en_pause: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", label: "En pause" },
};

const Tasks = () => {
  const { isChefService } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    titre: '',
    description: '',
    priorite: 'moyen' as const,
    assigned_to: '',
    date_limite: '',
  });

  const { data: tasks, isLoading } = useTaches();
  const { data: profiles } = useProfiles();
  const { data: assignableMembers } = useAssignableMembers();
  const createTask = useCreateTache();
  const updateTask = useUpdateTache();

  // Check for overdue tasks
  const isOverdue = (task: Tache) => {
    if (!task.date_limite || task.statut === 'termine') return false;
    return new Date(task.date_limite) < new Date();
  };

  const getTaskStatus = (task: Tache) => {
    if (isOverdue(task)) return 'overdue';
    return task.statut;
  };

  const filteredTasks = tasks?.filter(task => {
    const matchesSearch = task.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assigned_profile?.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assigned_profile?.prenom.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "overdue") return matchesSearch && isOverdue(task);
    return matchesSearch && task.statut === activeTab;
  }) || [];

  const taskCounts = {
    all: tasks?.length || 0,
    a_faire: tasks?.filter(t => t.statut === "a_faire").length || 0,
    en_cours: tasks?.filter(t => t.statut === "en_cours").length || 0,
    termine: tasks?.filter(t => t.statut === "termine").length || 0,
    overdue: tasks?.filter(t => isOverdue(t)).length || 0,
  };

  const handleCreateTask = async () => {
    if (!newTask.titre.trim()) {
      toast.error('Le titre est requis');
      return;
    }

    try {
      await createTask.mutateAsync({
        titre: newTask.titre,
        description: newTask.description || null,
        priorite: newTask.priorite,
        assigned_to: newTask.assigned_to || null,
        date_limite: newTask.date_limite || null,
      });
      toast.success('Tâche créée avec succès');
      setShowCreateDialog(false);
      setNewTask({ titre: '', description: '', priorite: 'moyen', assigned_to: '', date_limite: '' });
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Tache['statut']) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        statut: newStatus,
        date_fin: newStatus === 'termine' ? new Date().toISOString().split('T')[0] : null,
      });
      toast.success('Statut mis à jour');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    }
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
          {isChefService && (
            <Button className="w-fit" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle tâche
            </Button>
          )}
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
            <TabsTrigger value="a_faire">À faire ({taskCounts.a_faire})</TabsTrigger>
            <TabsTrigger value="en_cours">En cours ({taskCounts.en_cours})</TabsTrigger>
            <TabsTrigger value="termine">Terminées ({taskCounts.termine})</TabsTrigger>
            <TabsTrigger value="overdue">En retard ({taskCounts.overdue})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => {
                  const taskStatus = getTaskStatus(task);
                  const StatusIcon = taskStatus === 'overdue' 
                    ? AlertTriangle 
                    : statusConfig[task.statut].icon;
                  const priority = priorityConfig[task.priorite];
                  const status = taskStatus === 'overdue'
                    ? { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", label: "En retard" }
                    : statusConfig[task.statut];

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
                                task.statut === "termine" && "line-through text-muted-foreground"
                              )}>
                                {task.titre}
                              </h3>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {task.description}
                                </p>
                              )}
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
                                {task.statut !== 'termine' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'termine')}>
                                    Marquer comme terminée
                                  </DropdownMenuItem>
                                )}
                                {task.statut === 'a_faire' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'en_cours')}>
                                    Démarrer
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 mt-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="w-4 h-4" />
                              <span>
                                {task.assigned_profile 
                                  ? `${task.assigned_profile.prenom} ${task.assigned_profile.nom}`
                                  : 'Non assigné'
                                }
                              </span>
                            </div>
                            {task.date_limite && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(task.date_limite).toLocaleDateString('fr-FR')}</span>
                              </div>
                            )}
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
            )}
          </TabsContent>
        </Tabs>

        {/* Create Task Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouvelle Tâche</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="titre">Titre *</Label>
                <Input
                  id="titre"
                  value={newTask.titre}
                  onChange={(e) => setNewTask(prev => ({ ...prev, titre: e.target.value }))}
                  placeholder="Titre de la tâche"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description détaillée"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Select
                    value={newTask.priorite}
                    onValueChange={(value) => setNewTask(prev => ({ ...prev, priorite: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="faible">Basse</SelectItem>
                      <SelectItem value="moyen">Moyenne</SelectItem>
                      <SelectItem value="eleve">Élevée</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_limite">Date limite</Label>
                  <Input
                    id="date_limite"
                    type="date"
                    value={newTask.date_limite}
                    onChange={(e) => setNewTask(prev => ({ ...prev, date_limite: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assigné à</Label>
                {assignableMembers && assignableMembers.length > 0 ? (
                  <Select
                    value={newTask.assigned_to}
                    onValueChange={(value) => setNewTask(prev => ({ ...prev, assigned_to: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un membre" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableMembers.map((profile: any) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.prenom} {profile.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                    Vous n'avez aucun agent dans votre bureau. Affectez des agents depuis "Mon Bureau".
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateTask} disabled={createTask.isPending}>
                {createTask.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Tasks;
