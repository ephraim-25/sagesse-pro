import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface DepartmentStats {
  name: string;
  totalMembers: number;
  present: number;
  remote: number;
  absent: number;
  tasksCompleted: number;
  tasksTotal: number;
  performanceScore: number;
}

export function DepartmentRadar() {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const { data: departments, isLoading } = useQuery({
    queryKey: ['department-radar'],
    queryFn: async () => {
      // Get profiles grouped by service
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, service, last_status, account_status')
        .eq('account_status', 'active');

      if (profilesError) throw profilesError;

      // Get tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('taches')
        .select('id, statut, profiles:assigned_to(service)');

      if (tasksError) throw tasksError;

      // Aggregate by service/department
      const deptMap = new Map<string, DepartmentStats>();

      profiles?.forEach((profile) => {
        const dept = profile.service || 'Non assigné';
        
        if (!deptMap.has(dept)) {
          deptMap.set(dept, {
            name: dept,
            totalMembers: 0,
            present: 0,
            remote: 0,
            absent: 0,
            tasksCompleted: 0,
            tasksTotal: 0,
            performanceScore: 0,
          });
        }

        const stats = deptMap.get(dept)!;
        stats.totalMembers++;
        
        if (profile.last_status === 'connecte') {
          stats.present++;
        } else if (profile.last_status === 'pause' || profile.last_status === 'reunion') {
          stats.remote++;
        } else {
          stats.absent++;
        }
      });

      // Add task stats
      tasks?.forEach((task) => {
        const profile = task.profiles as { service?: string } | null;
        const dept = profile?.service || 'Non assigné';
        
        if (deptMap.has(dept)) {
          const stats = deptMap.get(dept)!;
          stats.tasksTotal++;
          if (task.statut === 'termine') {
            stats.tasksCompleted++;
          }
        }
      });

      // Calculate performance scores
      deptMap.forEach((stats) => {
        const presenceRate = stats.totalMembers > 0 
          ? ((stats.present + stats.remote) / stats.totalMembers) * 100 
          : 0;
        const taskCompletionRate = stats.tasksTotal > 0 
          ? (stats.tasksCompleted / stats.tasksTotal) * 100 
          : 100;
        stats.performanceScore = Math.round((presenceRate + taskCompletionRate) / 2);
      });

      return Array.from(deptMap.values())
        .filter(d => d.name !== 'Non assigné' || d.totalMembers > 0)
        .sort((a, b) => b.performanceScore - a.performanceScore);
    },
    refetchInterval: 60000,
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-warning';
    return 'bg-destructive';
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const selectedDepartment = selectedDept 
    ? departments?.find(d => d.name === selectedDept) 
    : null;

  return (
    <div className="bg-card rounded-xl shadow-soft border border-border/50 overflow-hidden">
      <div className="p-6 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Aperçu des Directions</h3>
              <p className="text-sm text-muted-foreground">Performance par département</p>
            </div>
          </div>
          {selectedDept && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedDept(null)}>
              Voir tout
            </Button>
          )}
        </div>
      </div>

      <div className="p-6">
        {selectedDepartment ? (
          // Detailed view for selected department
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">{selectedDepartment.name}</h4>
              <span className={cn(
                'text-2xl font-bold',
                getScoreColor(selectedDepartment.performanceScore)
              )}>
                {selectedDepartment.performanceScore}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Effectif</span>
                </div>
                <p className="text-2xl font-bold">{selectedDepartment.totalMembers}</p>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-success">{selectedDepartment.present} présents</span>
                  <span className="text-info">{selectedDepartment.remote} télétravail</span>
                  <span className="text-destructive">{selectedDepartment.absent} absents</span>
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Tâches</span>
                </div>
                <p className="text-2xl font-bold">
                  {selectedDepartment.tasksCompleted}/{selectedDepartment.tasksTotal}
                </p>
                <div className="mt-2">
                  <Progress 
                    value={selectedDepartment.tasksTotal > 0 
                      ? (selectedDepartment.tasksCompleted / selectedDepartment.tasksTotal) * 100 
                      : 0
                    } 
                    className="h-2"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Taux de présence</span>
                <span className="font-medium">
                  {selectedDepartment.totalMembers > 0 
                    ? Math.round(((selectedDepartment.present + selectedDepartment.remote) / selectedDepartment.totalMembers) * 100)
                    : 0
                  }%
                </span>
              </div>
              <Progress 
                value={selectedDepartment.totalMembers > 0 
                  ? ((selectedDepartment.present + selectedDepartment.remote) / selectedDepartment.totalMembers) * 100
                  : 0
                } 
                className="h-3"
              />
            </div>
          </div>
        ) : (
          // Grid view of all departments
          <div className="space-y-3">
            {departments?.map((dept) => (
              <button
                key={dept.name}
                className="w-full p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                onClick={() => setSelectedDept(dept.name)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{dept.name}</span>
                    {dept.performanceScore < 60 && (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {dept.totalMembers} membres
                    </span>
                    <span className={cn(
                      'text-sm font-bold',
                      getScoreColor(dept.performanceScore)
                    )}>
                      {dept.performanceScore}%
                    </span>
                  </div>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                      getProgressColor(dept.performanceScore)
                    )}
                    style={{ width: `${dept.performanceScore}%` }}
                  />
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    {dept.present}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-info" />
                    {dept.remote}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                    {dept.absent}
                  </span>
                  <span className="ml-auto flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {dept.tasksCompleted}/{dept.tasksTotal} tâches
                  </span>
                </div>
              </button>
            ))}
            
            {(!departments || departments.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun département configuré</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
