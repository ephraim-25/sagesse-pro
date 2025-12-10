import { Users, UserCheck, UserX, Laptop, Loader2 } from "lucide-react";
import { useDashboardData } from "@/hooks/useData";

export function PresenceOverview() {
  const { data: dashboardData, isLoading } = useDashboardData();

  const presenceData = [
    { 
      status: "Présent", 
      count: dashboardData?.overview.presents || 0, 
      color: "bg-success", 
      icon: UserCheck 
    },
    { 
      status: "Absent", 
      count: dashboardData?.overview.absents || 0, 
      color: "bg-destructive", 
      icon: UserX 
    },
    { 
      status: "Télétravail", 
      count: dashboardData?.overview.teletravail || 0, 
      color: "bg-info", 
      icon: Laptop 
    },
  ];

  const total = dashboardData?.overview.totalMembers || 0;

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
          <h3 className="font-semibold text-foreground">Aperçu des Présences</h3>
          <p className="text-sm text-muted-foreground">Aujourd'hui</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
      </div>

      <div className="space-y-4">
        {presenceData.map((item) => {
          const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <div key={item.status} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{item.status}</span>
                </div>
                <span className="text-muted-foreground">{item.count} ({percentage}%)</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${item.color} rounded-full transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total des effectifs</span>
          <span className="text-lg font-bold text-foreground">{total}</span>
        </div>
      </div>
    </div>
  );
}
