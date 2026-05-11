import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'president' | 'chef_service' | 'agent';
  requiredGrade?: string;
  requireSuperAdmin?: boolean;
}

const ProtectedRoute = ({ children, requiredRole, requiredGrade, requireSuperAdmin }: ProtectedRouteProps) => {
  const { user, loading, hasRole, hasGrade, isAdmin, isSuperAdmin, isChefService, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check account status - block suspended or pending accounts
  if (profile?.account_status === 'suspended' || profile?.account_status === 'rejected') {
    return <Navigate to="/auth" replace />;
  }

  // Super admin gate (strictest)
  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  // Admin bypasses all role/grade checks (but NOT super-admin gate above)
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check required role
  if (requiredRole && !hasRole(requiredRole)) {
    // Special case: chef_service role includes chef_bureau and chef_division grades
    if (requiredRole === 'chef_service' && isChefService) {
      return <>{children}</>;
    }
    return <Navigate to="/" replace />;
  }

  // Check required grade if specified
  if (requiredGrade && !hasGrade(requiredGrade)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
