import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * Component that routes users to the appropriate dashboard based on their role.
 * Hierarchy:
 * - President/Admin → Strategic dashboard (/president)
 * - Chef de Division → Supervision dashboard (/division)
 * - Chef de Bureau → Management dashboard (/mon-bureau)
 * - Agent → Simplified dashboard (/agent)
 */
const DashboardRouter = () => {
  const { loading, hasRole, isAdmin, isPresident, isChefService } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  // President or Admin → Strategic dashboard
  if (isPresident || isAdmin) {
    return <Navigate to="/president" replace />;
  }

  // Chef de Service (includes Chef de Division and Chef de Bureau)
  if (isChefService) {
    // For now, both go to /mon-bureau
    // In the future, you can differentiate between chef_division and chef_bureau
    return <Navigate to="/mon-bureau" replace />;
  }

  // Default: Agent dashboard
  return <Navigate to="/agent" replace />;
};

export default DashboardRouter;
