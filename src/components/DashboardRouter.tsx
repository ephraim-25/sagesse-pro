import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * Component that routes users to the appropriate dashboard based on their role and grade.
 * Hierarchy:
 * - President/Admin → Strategic dashboard (/president)
 * - Directeur → Direction dashboard (/directeur)
 * - Chef de Division → Supervision dashboard (/division)
 * - Chef de Bureau → Management dashboard (/mon-bureau)
 * - Agent → Simplified dashboard (/agent)
 */
const DashboardRouter = () => {
  const { loading, isAdmin, isPresident, isChefService, isChefBureau, isChefDivision, grade } = useAuth();

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

  // Directeur → Direction-specific dashboard
  if (grade?.code === 'directeur') {
    return <Navigate to="/directeur" replace />;
  }

  // Chef de Division → Supervision dashboard
  if (grade?.code === 'chef_division') {
    return <Navigate to="/division" replace />;
  }

  // Chef de Bureau → Management dashboard
  if (grade?.code === 'chef_bureau' || isChefService || isChefBureau) {
    return <Navigate to="/mon-bureau" replace />;
  }

  // Default: Agent dashboard
  return <Navigate to="/agent" replace />;
};

export default DashboardRouter;
