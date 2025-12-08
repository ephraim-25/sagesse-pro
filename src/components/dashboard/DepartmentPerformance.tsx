import { Building2, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const departments = [
  { name: "Recherche", score: 94, trend: 5, members: 15 },
  { name: "Administration", score: 88, trend: -2, members: 12 },
  { name: "Communication", score: 91, trend: 8, members: 8 },
  { name: "Finance", score: 85, trend: 3, members: 10 },
  { name: "IT", score: 96, trend: 12, members: 6 },
];

export function DepartmentPerformance() {
  return (
    <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-foreground">Performance par Département</h3>
          <p className="text-sm text-muted-foreground">Score de productivité</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-accent" />
        </div>
      </div>

      <div className="space-y-4">
        {departments.map((dept) => (
          <div key={dept.name} className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{dept.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{dept.score}%</span>
                  <div className={cn(
                    "flex items-center text-xs",
                    dept.trend >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {dept.trend >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-0.5" />
                    )}
                    {Math.abs(dept.trend)}%
                  </div>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    dept.score >= 90 ? "bg-success" : 
                    dept.score >= 80 ? "bg-info" : 
                    dept.score >= 70 ? "bg-warning" : "bg-destructive"
                  )}
                  style={{ width: `${dept.score}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{dept.members} membres</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
