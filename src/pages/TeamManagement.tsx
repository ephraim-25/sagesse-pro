import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Users, Building2, Plus, Pencil, Trash2, UserPlus, Network, ChevronRight, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Team {
  id: string;
  name: string;
  description: string | null;
  division: string | null;
  parent_team_id: string | null;
  created_at: string;
  parent_team?: { id: string; name: string } | null;
  members_count?: number;
}

interface Manager {
  id: string;
  nom: string;
  prenom: string;
}

interface Profile {
  id: string;
  nom: string;
  prenom: string;
  postnom: string | null;
  email: string;
  fonction: string | null;
  service: string | null;
  team_id: string | null;
  manager_id: string | null;
  photo_url: string | null;
  grade_id: string | null;
  manager?: Manager | null;
  team?: { id: string; name: string } | null;
  grade?: {
    id: string;
    label: string;
    code: string;
  } | null;
}

const TeamManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  
  const [teamForm, setTeamForm] = useState({
    name: '',
    description: '',
    division: '',
    parent_team_id: ''
  });
  
  const [assignForm, setAssignForm] = useState({
    team_id: '',
    manager_id: ''
  });

  // Fetch teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          parent_team:teams!teams_parent_team_id_fkey(id, name)
        `)
        .order('name');
      
      if (error) throw error;
      
      // Transform the data to match our interface
      return (data || []).map(team => ({
        ...team,
        parent_team: Array.isArray(team.parent_team) 
          ? team.parent_team[0] || null 
          : team.parent_team
      })) as Team[];
    }
  });

  // Fetch profiles with team and manager info
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['profiles-with-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          team:teams(id, name),
          grade:grades(id, label, code)
        `)
        .order('nom');
      
      if (error) throw error;
      
      // Fetch managers separately to avoid complex joins
      const profilesWithManagers = await Promise.all(
        (data || []).map(async (profile) => {
          let manager: Manager | null = null;
          if (profile.manager_id) {
            const { data: managerData } = await supabase
              .from('profiles')
              .select('id, nom, prenom')
              .eq('id', profile.manager_id)
              .single();
            manager = managerData;
          }
          return { 
            ...profile, 
            manager,
            team: Array.isArray(profile.team) ? profile.team[0] || null : profile.team,
            grade: Array.isArray(profile.grade) ? profile.grade[0] || null : profile.grade
          } as Profile;
        })
      );
      
      return profilesWithManagers;
    }
  });

  // Create team mutation
  const createTeam = useMutation({
    mutationFn: async (team: typeof teamForm) => {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: team.name,
          description: team.description || null,
          division: team.division || null,
          parent_team_id: team.parent_team_id || null
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Équipe créée avec succès' });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setIsTeamDialogOpen(false);
      resetTeamForm();
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  // Update team mutation
  const updateTeam = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & typeof teamForm) => {
      const { data, error } = await supabase
        .from('teams')
        .update({
          name: updates.name,
          description: updates.description || null,
          division: updates.division || null,
          parent_team_id: updates.parent_team_id || null
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Équipe mise à jour avec succès' });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setIsTeamDialogOpen(false);
      setEditingTeam(null);
      resetTeamForm();
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  // Delete team mutation
  const deleteTeam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Équipe supprimée avec succès' });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  // Assign team and manager mutation
  const assignTeamAndManager = useMutation({
    mutationFn: async ({ profileId, teamId, managerId }: { profileId: string; teamId: string | null; managerId: string | null }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          team_id: teamId,
          manager_id: managerId
        })
        .eq('id', profileId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Affectation mise à jour avec succès' });
      queryClient.invalidateQueries({ queryKey: ['profiles-with-teams'] });
      setIsAssignDialogOpen(false);
      setSelectedMember(null);
      setAssignForm({ team_id: '', manager_id: '' });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  const resetTeamForm = () => {
    setTeamForm({ name: '', description: '', division: '', parent_team_id: '' });
  };

  const openEditTeam = (team: Team) => {
    setEditingTeam(team);
    setTeamForm({
      name: team.name,
      description: team.description || '',
      division: team.division || '',
      parent_team_id: team.parent_team_id || ''
    });
    setIsTeamDialogOpen(true);
  };

  const openAssignDialog = (member: Profile) => {
    setSelectedMember(member);
    setAssignForm({
      team_id: member.team_id || '',
      manager_id: member.manager_id || ''
    });
    setIsAssignDialogOpen(true);
  };

  const handleTeamSubmit = () => {
    if (editingTeam) {
      updateTeam.mutate({ id: editingTeam.id, ...teamForm });
    } else {
      createTeam.mutate(teamForm);
    }
  };

  const handleAssignSubmit = () => {
    if (selectedMember) {
      assignTeamAndManager.mutate({
        profileId: selectedMember.id,
        teamId: assignForm.team_id || null,
        managerId: assignForm.manager_id || null
      });
    }
  };

  // Get team members count
  const getTeamMembersCount = (teamId: string) => {
    return profiles.filter(p => p.team_id === teamId).length;
  };

  // Build hierarchy tree for display
  const buildHierarchyTree = () => {
    const rootTeams = teams.filter(t => !t.parent_team_id);
    const getChildren = (teamId: string): Team[] => {
      return teams.filter(t => t.parent_team_id === teamId);
    };
    
    return { rootTeams, getChildren };
  };

  const { rootTeams, getChildren } = buildHierarchyTree();

  const TeamNode = ({ team, depth = 0 }: { team: Team; depth?: number }) => {
    const children = getChildren(team.id);
    const membersCount = getTeamMembersCount(team.id);
    
    return (
      <div className={`${depth > 0 ? 'ml-6 border-l-2 border-muted pl-4' : ''}`}>
        <div className="flex items-center justify-between p-3 bg-card rounded-lg border mb-2 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">{team.name}</p>
              <p className="text-sm text-muted-foreground">
                {team.division && `${team.division} • `}
                {membersCount} membre{membersCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => openEditTeam(team)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => deleteTeam.mutate(team.id)}
              disabled={children.length > 0 || membersCount > 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {children.map(child => (
          <TeamNode key={child.id} team={child} depth={depth + 1} />
        ))}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestion des équipes</h1>
            <p className="text-muted-foreground">
              Organisez la structure hiérarchique et les affectations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total équipes</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teams.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Membres affectés</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profiles.filter(p => p.team_id).length}
              </div>
              <p className="text-xs text-muted-foreground">
                sur {profiles.length} membres
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sans manager</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profiles.filter(p => !p.manager_id).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="teams" className="space-y-4">
          <TabsList>
            <TabsTrigger value="teams">Équipes</TabsTrigger>
            <TabsTrigger value="hierarchy">Organigramme</TabsTrigger>
            <TabsTrigger value="members">Membres</TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isTeamDialogOpen} onOpenChange={(open) => {
                setIsTeamDialogOpen(open);
                if (!open) {
                  setEditingTeam(null);
                  resetTeamForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle équipe
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingTeam ? 'Modifier l\'équipe' : 'Créer une équipe'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingTeam ? 'Modifiez les informations de l\'équipe' : 'Ajoutez une nouvelle équipe à votre organisation'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom de l'équipe *</Label>
                      <Input
                        id="name"
                        value={teamForm.name}
                        onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Équipe Développement"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="division">Division</Label>
                      <Input
                        id="division"
                        value={teamForm.division}
                        onChange={(e) => setTeamForm(prev => ({ ...prev, division: e.target.value }))}
                        placeholder="Ex: Direction Technique"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parent_team">Équipe parente</Label>
                      <Select 
                        value={teamForm.parent_team_id} 
                        onValueChange={(value) => setTeamForm(prev => ({ ...prev, parent_team_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Aucune (équipe racine)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Aucune (équipe racine)</SelectItem>
                          {teams
                            .filter(t => t.id !== editingTeam?.id)
                            .map(team => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={teamForm.description}
                        onChange={(e) => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description de l'équipe..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsTeamDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleTeamSubmit} disabled={!teamForm.name}>
                      {editingTeam ? 'Mettre à jour' : 'Créer'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Liste des équipes</CardTitle>
                <CardDescription>
                  Toutes les équipes de votre organisation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teamsLoading ? (
                  <p className="text-muted-foreground">Chargement...</p>
                ) : teams.length === 0 ? (
                  <p className="text-muted-foreground">Aucune équipe créée</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Division</TableHead>
                        <TableHead>Équipe parente</TableHead>
                        <TableHead>Membres</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teams.map((team) => (
                        <TableRow key={team.id}>
                          <TableCell className="font-medium">{team.name}</TableCell>
                          <TableCell>{team.division || '-'}</TableCell>
                          <TableCell>
                            {team.parent_team ? (
                              <Badge variant="outline">{team.parent_team.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">Racine</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {getTeamMembersCount(team.id)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openEditTeam(team)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => deleteTeam.mutate(team.id)}
                              disabled={getChildren(team.id).length > 0 || getTeamMembersCount(team.id) > 0}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hierarchy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Organigramme
                </CardTitle>
                <CardDescription>
                  Vue hiérarchique de votre organisation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teamsLoading ? (
                  <p className="text-muted-foreground">Chargement...</p>
                ) : rootTeams.length === 0 ? (
                  <p className="text-muted-foreground">Aucune équipe créée</p>
                ) : (
                  <div className="space-y-2">
                    {rootTeams.map(team => (
                      <TeamNode key={team.id} team={team} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Affectation des membres</CardTitle>
                <CardDescription>
                  Gérez les affectations aux équipes et les relations hiérarchiques
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profilesLoading ? (
                  <p className="text-muted-foreground">Chargement...</p>
                ) : profiles.length === 0 ? (
                  <p className="text-muted-foreground">Aucun membre trouvé</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Membre</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Équipe</TableHead>
                        <TableHead>Manager</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={profile.photo_url || undefined} />
                                <AvatarFallback>
                                  {profile.prenom?.[0]}{profile.nom?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {profile.prenom} {profile.nom}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {profile.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {profile.grade ? (
                              <Badge variant="outline">{profile.grade.label}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {profile.team ? (
                              <Badge>{profile.team.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">Non affecté</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {profile.manager ? (
                              <div className="flex items-center gap-2">
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                <span>{profile.manager.prenom} {profile.manager.nom}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Aucun</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openAssignDialog(profile)}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Affecter
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Assign Dialog */}
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Affecter le membre</DialogTitle>
                  <DialogDescription>
                    {selectedMember && (
                      <>Modifier l'affectation de {selectedMember.prenom} {selectedMember.nom}</>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="assign_team">Équipe</Label>
                    <Select 
                      value={assignForm.team_id} 
                      onValueChange={(value) => setAssignForm(prev => ({ ...prev, team_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une équipe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Aucune équipe</SelectItem>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assign_manager">Manager</Label>
                    <Select 
                      value={assignForm.manager_id} 
                      onValueChange={(value) => setAssignForm(prev => ({ ...prev, manager_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Aucun manager</SelectItem>
                        {profiles
                          .filter(p => p.id !== selectedMember?.id)
                          .map(profile => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.prenom} {profile.nom}
                              {profile.grade && ` (${profile.grade.label})`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAssignSubmit}>
                    Enregistrer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default TeamManagement;
