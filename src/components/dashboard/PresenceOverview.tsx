import { Users, UserCheck, UserX, Laptop } from "lucide-react";

const presenceData = [
  { status: "Présent", count: 42, color: "bg-success", icon: UserCheck },
  { status: "Absent", count: 8, color: "bg-destructive", icon: UserX },
  { status: "Télétravail", count: 15, color: "bg-info", icon: Laptop },
];

export function PresenceOverview() {
  const total = presenceData.reduce((acc, item) => acc + item.count, 0);

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
          const percentage = Math.round((item.count / total) * 100);
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
