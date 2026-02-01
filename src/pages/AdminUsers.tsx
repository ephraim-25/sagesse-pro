import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Users, 
  Search,
  RefreshCw,
  UserCog,
  CheckCircle2,
  Shield
} from 'lucide-react';
import logoCsn from '@/assets/logo-csn.png';

interface UserProfile {
  id: string;
  nom: string;
  prenom: string;
  postnom: string | null;
  email: string;
  grade_id: string | null;
  custom_grade: string | null;
  account_status: string;
  created_at: string;
  grades: {
    id: string;
    code: string;
    label: string;
  } | null;
}

interface Grade {
  id: string;
  code: string;
  label: string;
  rank_order: number;
}

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Fetch all users with their grades
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          nom,
          prenom,
          postnom,
          email,
          grade_id,
          custom_grade,
          account_status,
          created_at,
          grades (
            id,
            code,
            label
          )
        `)
        .order('nom', { ascending: true });

      if (error) throw error;
      return data as unknown as UserProfile[];
    },
  });

  // Fetch all available grades
  const { data: grades } = useQuery({
    queryKey: ['all-grades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grades')
        .select('id, code, label, rank_order')
        .order('rank_order', { ascending: true });

      if (error) throw error;
      return data as Grade[];
    },
  });

  // Mutation to update user grade
  const updateGradeMutation = useMutation({
    mutationFn: async ({ userId, gradeId }: { userId: string; gradeId: string }) => {
      setUpdatingUserId(userId);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          grade_id: gradeId,
          custom_grade: null // Clear custom grade when setting a standard grade
        })
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Grade mis à jour avec succès', {
        description: 'Les modifications ont été enregistrées dans la base de données.',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      setUpdatingUserId(null);
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour', {
        description: (error as Error).message,
      });
      setUpdatingUserId(null);
    },
  });

  // Filter users based on search term
  const filteredUsers = users?.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.nom?.toLowerCase().includes(searchLower) ||
      user.prenom?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.grades?.label?.toLowerCase().includes(searchLower)
    );
  });

  const handleGradeChange = (userId: string, gradeId: string) => {
    updateGradeMutation.mutate({ userId, gradeId });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Actif</Badge>;
      case 'pending_approval':
        return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30">En attente</Badge>;
      case 'suspended':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Suspendu</Badge>;
      case 'rejected':
        return <Badge className="bg-muted text-muted-foreground">Rejeté</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <img 
              src={logoCsn} 
              alt="Logo CSN" 
              className="w-12 h-12 object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gestion des Membres</h1>
              <p className="text-muted-foreground">
                Gérez les grades et statuts des utilisateurs de la plateforme
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-all-users'] })}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Membres</p>
                  <p className="text-3xl font-bold text-foreground">{users?.length || 0}</p>
                </div>
                <Users className="w-10 h-10 text-primary/60" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Comptes Actifs</p>
                  <p className="text-3xl font-bold text-foreground">
                    {users?.filter(u => u.account_status === 'active').length || 0}
                  </p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-emerald-500/60" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Grades Disponibles</p>
                  <p className="text-3xl font-bold text-foreground">{grades?.length || 0}</p>
                </div>
                <Shield className="w-10 h-10 text-primary/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="w-5 h-5" />
                  Liste des Utilisateurs
                </CardTitle>
                <CardDescription>
                  Cliquez sur le menu déroulant pour modifier le grade d'un utilisateur
                </CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers && filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Grade Actuel</TableHead>
                      <TableHead>Modifier le Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {user.prenom?.[0]}{user.nom?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {user.prenom} {user.postnom || ''} {user.nom}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Inscrit le {new Date(user.created_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(user.account_status)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            {user.grades?.label || user.custom_grade || 'Non défini'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.grade_id || ''}
                            onValueChange={(value) => handleGradeChange(user.id, value)}
                            disabled={updatingUserId === user.id}
                          >
                            <SelectTrigger className="w-48">
                              {updatingUserId === user.id ? (
                                <div className="flex items-center gap-2">
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>Mise à jour...</span>
                                </div>
                              ) : (
                                <SelectValue placeholder="Changer le grade" />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              {grades?.map((grade) => (
                                <SelectItem key={grade.id} value={grade.id}>
                                  {grade.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">Aucun utilisateur trouvé</p>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Essayez avec d\'autres termes de recherche' : 'Aucun membre inscrit pour le moment'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminUsers;
