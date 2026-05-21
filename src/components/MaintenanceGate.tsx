import { ReactNode } from "react";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

export default function MaintenanceGate({ children }: Props) {
  const { maintenance_mode, loading } = useMaintenanceMode();
  const { isSuperAdmin, user, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Super admin keeps full access
  if (maintenance_mode && !isSuperAdmin) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background p-6">
        <div className="max-w-lg w-full text-center space-y-6 bg-card border border-border/50 rounded-2xl p-8 shadow-soft">
          <div className="mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-warning" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">SIGC-CSN</h1>
            <p className="text-base text-foreground font-medium">
              Opération de maintenance ou mise à jour de sécurité en cours.
            </p>
            <p className="text-sm text-muted-foreground">
              Veuillez contacter l'administrateur. Vos données sont en sécurité.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Reconnexion automatique dès la fin de la maintenance…</span>
          </div>
          {user && (
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              Se déconnecter
            </Button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
