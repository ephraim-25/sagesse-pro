import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Shield, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  UserCheck, 
  UserX,
  Activity,
  FileText,
  AlertTriangle,
  TrendingUp,
  Building2,
  Key,
  RefreshCw
} from 'lucide-react';

interface PendingApproval {
  id: string;
  target_user_id: string;
  type: string;
  status: string;
  created_at: string;
  profiles: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    grade_id: string;
    custom_grade: string | null;
    grades: {
      label: string;
      code: string;
    } | null;
  };
}

interface AdminMatricule {
  id: string;
  matricule: string;
  is_used: boolean;
  used_at: string | null;
  profiles: {
    nom: string;
    prenom: string;
    email: string;
  } | null;
}

interface AuditLog {
  id: string;
  action: string;
  table_cible: string;
  created_at: string;
  profiles: {
    nom: string;
    prenom: string;
  } | null;
}

const AdminDashboard = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [comment, setComment] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  // Fetch pending approvals
  const { data: pendingApprovals, isLoading: approvalsLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approvals')
        .select(`
          id,
          target_user_id,
          type,
          status,
          created_at,
          profiles!approvals_target_user_id_fkey (
            id,
            nom,
            prenom,
            email,
            grade_id,
            custom_grade,
            grades (
              label,
              code
            )
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as PendingApproval[];
    },
  });

  // Fetch admin matricules
  const { data: adminMatricules, isLoading: matriculesLoading } = useQuery({
    queryKey: ['admin-matricules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_matricules')
        .select(`
          id,
          matricule,
          is_used,
          used_at,
          profiles:used_by (
            nom,
            prenom,
            email
          )
        `)
        .order('matricule');

      if (error) throw error;
      return data as unknown as AdminMatricule[];
    },
  });

  // Fetch recent audit logs
  const { data: auditLogs } = useQuery({
    queryKey: ['recent-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          table_cible,
          created_at,
          profiles:user_id (
            nom,
            prenom
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as unknown as AuditLog[];
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: pendingCount },
        { count: todayPresences }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'active'),
        supabase.from('approvals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('presences').select('*', { count: 'exact', head: true }).eq('date', new Date().toISOString().split('T')[0])
      ]);

      return {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        pendingApprovals: pendingCount || 0,
        todayPresences: todayPresences || 0
      };
    },
  });

  // Handle approval action
  const approvalMutation = useMutation({
    mutationFn: async ({ approvalId, action, comment }: { approvalId: string; action: 'approve' | 'reject'; comment: string }) => {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      // Update approval
      const { error: approvalError } = await supabase
        .from('approvals')
        .update({
          status: newStatus,
          comment,
          acted_at: new Date().toISOString(),
          approver_id: profile?.id
        })
        .eq('id', approvalId);

      if (approvalError) throw approvalError;

      // If approved, activate the user account
      if (action === 'approve' && selectedApproval) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ account_status: 'active' })
          .eq('id', selectedApproval.target_user_id);

        if (profileError) throw profileError;
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      toast.success(variables.action === 'approve' ? 'Compte approuvé avec succès' : 'Demande rejetée');
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setSelectedApproval(null);
      setComment('');
      setActionType(null);
    },
    onError: (error) => {
      toast.error('Erreur: ' + (error as Error).message);
    },
  });

  const handleAction = (approval: PendingApproval, action: 'approve' | 'reject') => {
    setSelectedApproval(approval);
    setActionType(action);
  };

  const confirmAction = () => {
    if (!selectedApproval || !actionType) return;
    approvalMutation.mutate({
      approvalId: selectedApproval.id,
      action: actionType,
      comment
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              SIGC-CSN Administration
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestion des comptes, approbations et supervision de la plateforme
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              Exporter le Rapport Journalier (PDF)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
                queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Utilisateurs</p>
                  <p className="text-3xl font-bold text-foreground">{stats?.totalUsers || 0}</p>
                </div>
                <Users className="w-10 h-10 text-primary/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Comptes Actifs</p>
                  <p className="text-3xl font-bold text-foreground">{stats?.activeUsers || 0}</p>
                </div>
                <UserCheck className="w-10 h-10 text-emerald-500/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En Attente</p>
                  <p className="text-3xl font-bold text-foreground">{stats?.pendingApprovals || 0}</p>
                </div>
                <Clock className="w-10 h-10 text-amber-500/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Présents Aujourd'hui</p>
                  <p className="text-3xl font-bold text-foreground">{stats?.todayPresences || 0}</p>
                </div>
                <Activity className="w-10 h-10 text-blue-500/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="approvals" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="approvals" className="gap-2">
              <Clock className="w-4 h-4" />
              Approbations
              {(stats?.pendingApprovals || 0) > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {stats?.pendingApprovals}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="matricules" className="gap-2">
              <Key className="w-4 h-4" />
              Matricules Admin
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <FileText className="w-4 h-4" />
              Journal d'audit
            </TabsTrigger>
          </TabsList>

          {/* Approvals Tab */}
          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Demandes d'approbation en attente
                </CardTitle>
                <CardDescription>
                  Validez ou rejetez les demandes de création de compte pour les grades privilégiés
                </CardDescription>
              </CardHeader>
              <CardContent>
                {approvalsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingApprovals && pendingApprovals.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Grade demandé</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingApprovals.map((approval) => (
                        <TableRow key={approval.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {approval.profiles?.prenom?.[0]}{approval.profiles?.nom?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {approval.profiles?.prenom} {approval.profiles?.nom}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {approval.profiles?.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                              {approval.profiles?.grades?.label || approval.profiles?.custom_grade || 'Non spécifié'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(approval.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                onClick={() => handleAction(approval, 'approve')}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Approuver
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => handleAction(approval, 'reject')}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Rejeter
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-foreground">Aucune demande en attente</p>
                    <p className="text-muted-foreground">Toutes les demandes ont été traitées</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Matricules Tab */}
          <TabsContent value="matricules">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Matricules Administrateurs
                </CardTitle>
                <CardDescription>
                  Matricules prédéfinis pour l'inscription des administrateurs (format CSN-2013-XXX)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {matriculesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Matricule</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Utilisé par</TableHead>
                        <TableHead>Date d'utilisation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminMatricules?.map((matricule) => (
                        <TableRow key={matricule.id}>
                          <TableCell>
                            <code className="px-2 py-1 bg-muted rounded font-mono text-sm">
                              {matricule.matricule}
                            </code>
                          </TableCell>
                          <TableCell>
                            {matricule.is_used ? (
                              <Badge variant="secondary" className="bg-muted">
                                <UserCheck className="w-3 h-3 mr-1" />
                                Utilisé
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                                <Clock className="w-3 h-3 mr-1" />
                                Disponible
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {matricule.profiles ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7">
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {matricule.profiles.prenom?.[0]}{matricule.profiles.nom?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">
                                  {matricule.profiles.prenom} {matricule.profiles.nom}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {matricule.used_at
                              ? new Date(matricule.used_at).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Journal d'audit récent
                </CardTitle>
                <CardDescription>
                  Les 10 dernières actions enregistrées sur la plateforme
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs && auditLogs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Table</TableHead>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="outline">{log.action}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {log.table_cible || '-'}
                          </TableCell>
                          <TableCell>
                            {log.profiles ? (
                              <span className="text-sm">
                                {log.profiles.prenom} {log.profiles.nom}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Système</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(log.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Aucune entrée dans le journal</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        <Dialog open={!!selectedApproval && !!actionType} onOpenChange={() => {
          setSelectedApproval(null);
          setActionType(null);
          setComment('');
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {actionType === 'approve' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    Approuver le compte
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-destructive" />
                    Rejeter la demande
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {actionType === 'approve' 
                  ? `Vous êtes sur le point d'activer le compte de ${selectedApproval?.profiles?.prenom} ${selectedApproval?.profiles?.nom} avec le grade "${selectedApproval?.profiles?.grades?.label || selectedApproval?.profiles?.custom_grade}".`
                  : `Vous êtes sur le point de rejeter la demande de ${selectedApproval?.profiles?.prenom} ${selectedApproval?.profiles?.nom}.`
                }
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Commentaire (optionnel)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setSelectedApproval(null);
                setActionType(null);
                setComment('');
              }}>
                Annuler
              </Button>
              <Button
                variant={actionType === 'approve' ? 'default' : 'destructive'}
                onClick={confirmAction}
                disabled={approvalMutation.isPending}
              >
                {approvalMutation.isPending ? 'Traitement...' : 'Confirmer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
