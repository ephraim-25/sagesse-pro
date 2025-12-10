import { Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardData } from "@/hooks/useData";

export function DepartmentPerformance() {
  const { data: dashboardData, isLoading } = useDashboardData();

  const departments = dashboardData?.departments || [];
  const totalMembers = dashboardData?.overview.totalMembers || 0;

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-foreground">Répartition par Service</h3>
          <p className="text-sm text-muted-foreground">Distribution des membres</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-accent" />
        </div>
      </div>

      <div className="space-y-4">
        {departments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun service défini
          </p>
        ) : (
          departments.map((dept) => {
            const percentage = totalMembers > 0 
              ? Math.round((dept.membres / totalMembers) * 100) 
              : 0;
            
            return (
              <div key={dept.service} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{dept.service || 'Non assigné'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{dept.membres}</span>
                      <span className="text-xs text-muted-foreground">({percentage}%)</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500 bg-primary"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total des membres</span>
          <span className="text-lg font-bold text-foreground">{totalMembers}</span>
        </div>
      </div>
    </div>
  );
}
