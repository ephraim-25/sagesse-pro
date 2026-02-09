import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Search, 
  Loader2, 
  Mail, 
  Phone,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Building2,
  Plus,
  ListTodo,
  TrendingUp,
  Target,
  Clock,
  Sparkles,
  FileDown,
  Download
} from "lucide-react";
import logoCsn from "@/assets/logo-csn.png";
import { TaskFileUpload } from "@/components/tasks/TaskFileUpload";
import { 
  useMyTeamMembers, 
  useUnassignedAgents, 
  useAssignToTeam, 
  useRemoveFromTeam,
  type TeamMember 
} from "@/hooks/useHierarchy";
import { useAuth } from "@/hooks/useAuth";
import { useTaches, useCreateTache } from "@/hooks/useData";
import { usePdfExport } from "@/hooks/usePdfExport";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MonBureau = () => {
  const { profile, isChefService, isChefBureau, canManageTeam, grade, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("team");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<TeamMember | null>(null);
  const [actionType, setActionType] = useState<'assign' | 'remove' | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    titre: '',
    description: '',
    priorite: 'moyen' as 'faible' | 'moyen' | 'eleve' | 'urgente',
    assigned_to: '',
    date_limite: '',
    documents_lies: [] as string[]
  });

  // Handle URL query params for tabs
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'available') {
      setActiveTab('available');
    } else if (tab === 'tasks') {
      setActiveTab('team');
      setShowTaskDialog(true);
    }
  }, [searchParams]);

  const { data: teamMembers, isLoading: loadingTeam } = useMyTeamMembers();
  const { data: unassignedAgents, isLoading: loadingUnassigned } = useUnassignedAgents();
  const { data: allTasks } = useTaches();
  const assignToTeam = useAssignToTeam();
  const removeFromTeam = useRemoveFromTeam();
  const createTache = useCreateTache();
  const { exportDailyPresenceReport, exportTasksReport } = usePdfExport();

  // Filter tasks for this bureau (created by current user or assigned to team members)
  const teamMemberIds = teamMembers?.map(m => m.id) || [];
  const bureauTasks = allTasks?.filter(t => 
    t.created_by === profile?.id || teamMemberIds.includes(t.assigned_to || '')
  ) || [];
  
  const pendingTasks = bureauTasks.filter(t => t.statut === 'a_faire' || t.statut === 'en_cours');
  const completedTasks = bureauTasks.filter(t => t.statut === 'termine');
  const overdueTasks = bureauTasks.filter(t => {
    if (!t.date_limite) return false;
    return new Date(t.date_limite) < new Date() && t.statut !== 'termine';
  });

  // Calculate bureau-specific statistics
  const totalAgents = teamMembers?.length || 0;
  const taskCompletionRate = bureauTasks.length > 0 
    ? Math.round((completedTasks.length / bureauTasks.length) * 100) 
    : 0;

  const filteredTeamMembers = teamMembers?.filter(member => 
    member.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredUnassigned = unassignedAgents?.filter(agent =>
    agent.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleAssign = async (agent: TeamMember) => {
    try {
      await assignToTeam.mutateAsync(agent.id);
      toast.success(`${agent.prenom} ${agent.nom} a été affecté(e) à votre bureau`);
      setSelectedAgent(null);
      setActionType(null);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'affectation");
    }
  };

  const handleRemove = async (agent: TeamMember) => {
    try {
      await removeFromTeam.mutateAsync(agent.id);
      toast.success(`${agent.prenom} ${agent.nom} a été retiré(e) de votre bureau`);
      setSelectedAgent(null);
      setActionType(null);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du retrait");
    }
  };

  const confirmAction = () => {
    if (!selectedAgent) return;
    
    if (actionType === 'assign') {
      handleAssign(selectedAgent);
    } else if (actionType === 'remove') {
      handleRemove(selectedAgent);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.titre.trim()) {
      toast.error('Le titre est requis');
      return;
    }
    if (!newTask.assigned_to) {
      toast.error('Veuillez sélectionner un agent');
      return;
    }

    try {
      await createTache.mutateAsync({
        titre: newTask.titre,
        description: newTask.description || null,
        priorite: newTask.priorite,
        assigned_to: newTask.assigned_to,
        date_limite: newTask.date_limite || null,
        documents_lies: newTask.documents_lies.length > 0 ? newTask.documents_lies : null
      });
      toast.success('Tâche créée avec succès');
      setShowTaskDialog(false);
      setNewTask({
        titre: '',
        description: '',
        priorite: 'moyen',
        assigned_to: '',
        date_limite: '',
        documents_lies: []
      });
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création');
    }
  };

  const MemberCard = ({ member, showAssign = false }: { member: TeamMember; showAssign?: boolean }) => (
    <Card className="hover:shadow-card transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 ring-2 ring-border">
            <AvatarImage src={member.photo_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {member.prenom[0]}{member.nom[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {member.prenom} {member.nom}
              </h3>
              <Badge variant="outline" className="text-xs shrink-0">
                {(member.grade as any)?.label || 'Agent'}
              </Badge>
            </div>
            
            {member.fonction && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                <Briefcase className="w-3.5 h-3.5" />
                <span className="truncate">{member.fonction}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                <span className="truncate">{member.email}</span>
              </div>
              {member.telephone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <span>{member.telephone}</span>
                </div>
              )}
            </div>
          </div>

          {showAssign ? (
            <Button 
              size="sm"
              onClick={() => {
                setSelectedAgent(member);
                setActionType('assign');
              }}
              disabled={assignToTeam.isPending}
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Enrôler
            </Button>
          ) : (
            <Button 
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                setSelectedAgent(member);
                setActionType('remove');
              }}
              disabled={removeFromTeam.isPending}
            >
              <UserMinus className="w-4 h-4 mr-1" />
              Retirer
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Security check: Only Chef de Bureau, Chef de Division, or users with management permissions
  const hasAccess = canManageTeam || isChefService || isChefBureau;
  
  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!hasAccess) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Card className="p-8 text-center max-w-md">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-warning" />
            <h2 className="text-xl font-semibold mb-2">Accès Restreint</h2>
            <p className="text-muted-foreground mb-4">
              Cette page est réservée aux Chefs de Bureau et Chefs de Division.
            </p>
            <p className="text-sm text-muted-foreground">
              Votre grade actuel: <strong>{grade?.label || 'Non défini'}</strong>
            </p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Welcome message when no agents assigned
  const hasNoAgents = !loadingTeam && (!teamMembers || teamMembers.length === 0);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="page-title">Mon Bureau : Gestion des Affectations</h1>
              <p className="page-description">
                Bienvenue, Chef {profile?.nom} — Gérez vos agents et leurs missions
              </p>
            </div>
          </div>
        </div>

        {/* Welcome Message for new bureau chiefs */}
        {hasNoAgents && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Bienvenue Chef !</h3>
                  <p className="text-muted-foreground mb-4">
                    Commencez par affecter des agents à votre bureau pour voir leurs statistiques ici.
                    Les agents sans bureau apparaissent dans l'onglet "Agents Disponibles".
                  </p>
                  <Button 
                    onClick={() => setActiveTab('available')}
                    className="gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Enrôler un Agent
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats - Bureau specific */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAgents}</p>
                <p className="text-sm text-muted-foreground">Agents dans mon bureau</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ListTodo className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingTasks.length}</p>
                <p className="text-sm text-muted-foreground">Missions en cours</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueTasks.length}</p>
                <p className="text-sm text-muted-foreground">Missions en retard</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{taskCompletionRate}%</p>
                <p className="text-sm text-muted-foreground">Taux de réalisation</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Agents List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Search */}
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher un agent..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="team" className="gap-2">
                  <Users className="w-4 h-4" />
                  Mes Agents ({teamMembers?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="available" className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Disponibles ({unassignedAgents?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="team">
                {loadingTeam ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredTeamMembers.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-semibold mb-2">Aucun agent affecté</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Vous n'avez pas encore d'agents dans votre bureau. 
                      Allez dans l'onglet "Disponibles" pour en affecter.
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredTeamMembers.map(member => (
                      <MemberCard key={member.id} member={member} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="available">
                {loadingUnassigned ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredUnassigned.length === 0 ? (
                  <Card className="p-8 text-center">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-success/50" />
                    <h3 className="font-semibold mb-2">Tous les agents sont affectés</h3>
                    <p className="text-sm text-muted-foreground">
                      Il n'y a pas d'agent disponible pour affectation.
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredUnassigned.map(agent => (
                      <MemberCard key={agent.id} member={agent} showAssign />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Mon Bureau: Gestion des Affectations */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Mon Bureau : Gestion des Affectations
                </CardTitle>
                <CardDescription>Vue rapide de votre équipe - cliquez pour affecter</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingTeam ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : teamMembers && teamMembers.length > 0 ? (
                  <>
                    {teamMembers.slice(0, 5).map(member => (
                      <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.photo_url || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {member.prenom[0]}{member.nom[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{member.prenom} {member.nom}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.fonction || 'Agent'}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {(member.grade as any)?.label || 'Agent'}
                        </Badge>
                      </div>
                    ))}
                    {teamMembers.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        +{teamMembers.length - 5} autres agents
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Aucun agent affecté</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full justify-start gap-2"
                  variant="outline"
                  onClick={() => setActiveTab('available')}
                >
                  <UserPlus className="w-4 h-4" />
                  Enrôler un Agent
                </Button>
                <Button 
                  className="w-full justify-start gap-2"
                  variant="outline"
                  onClick={() => exportDailyPresenceReport()}
                >
                  <Download className="w-4 h-4" />
                  Exporter Rapport Journalier
                </Button>
                <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full justify-start gap-2"
                      disabled={!teamMembers?.length}
                    >
                      <Plus className="w-4 h-4" />
                      Assigner une Tâche à un Agent
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Nouvelle Mission</DialogTitle>
                      <DialogDescription>
                        Assignez une mission à un agent de votre bureau
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="titre">Titre *</Label>
                        <Input
                          id="titre"
                          placeholder="Titre de la mission"
                          value={newTask.titre}
                          onChange={(e) => setNewTask({ ...newTask, titre: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Description détaillée..."
                          value={newTask.description}
                          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Agent *</Label>
                          <Select 
                            value={newTask.assigned_to} 
                            onValueChange={(v) => setNewTask({ ...newTask, assigned_to: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              {teamMembers?.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.prenom} {member.nom}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Priorité</Label>
                          <Select 
                            value={newTask.priorite} 
                            onValueChange={(v: any) => setNewTask({ ...newTask, priorite: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="faible">Faible</SelectItem>
                              <SelectItem value="moyen">Moyen</SelectItem>
                              <SelectItem value="eleve">Élevé</SelectItem>
                              <SelectItem value="urgente">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date_limite">Date limite</Label>
                        <Input
                          id="date_limite"
                          type="date"
                          value={newTask.date_limite}
                          onChange={(e) => setNewTask({ ...newTask, date_limite: e.target.value })}
                        />
                      </div>
                      
                      {/* File Upload Section */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          Documents joints
                        </Label>
                        <TaskFileUpload
                          onFilesUploaded={(urls) => setNewTask({ ...newTask, documents_lies: urls })}
                          existingFiles={newTask.documents_lies}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
                        Annuler
                      </Button>
                      <Button 
                        onClick={handleCreateTask}
                        disabled={createTache.isPending}
                      >
                        {createTache.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Assigner la mission
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Floating Action Button for quick task assignment */}
        <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
          <DialogTrigger asChild>
            <Button 
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 gap-0"
              size="icon"
              disabled={!teamMembers?.length}
            >
              <Plus className="w-6 h-6" />
            </Button>
          </DialogTrigger>
        </Dialog>

        {/* Confirmation Dialog */}
        <AlertDialog open={!!selectedAgent && !!actionType} onOpenChange={() => {
          setSelectedAgent(null);
          setActionType(null);
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionType === 'assign' ? "Confirmer l'enrôlement" : "Confirmer le retrait"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actionType === 'assign' 
                  ? `Êtes-vous sûr de vouloir enrôler ${selectedAgent?.prenom} ${selectedAgent?.nom} dans votre bureau ?`
                  : `Êtes-vous sûr de vouloir retirer ${selectedAgent?.prenom} ${selectedAgent?.nom} de votre bureau ?`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmAction}
                className={actionType === 'remove' ? 'bg-destructive hover:bg-destructive/90' : ''}
              >
                {actionType === 'assign' ? 'Enrôler' : 'Retirer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default MonBureau;