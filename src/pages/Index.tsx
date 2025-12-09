import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { PresenceOverview } from "@/components/dashboard/PresenceOverview";
import { TasksOverview } from "@/components/dashboard/TasksOverview";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { DepartmentPerformance } from "@/components/dashboard/DepartmentPerformance";
import { Users, ListTodo, Clock, TrendingUp, Loader2 } from "lucide-react";
import { useDashboardData, useTaches } from "@/hooks/useData";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const { profile } = useAuth();
  const { data: dashboardData, isLoading: loadingDashboard } = useDashboardData();
  const { data: tasks, isLoading: loadingTasks } = useTaches();

  const tasksInProgress = tasks?.filter(t => t.statut === 'en_cours').length || 0;
  const productivity = dashboardData?.overview.totalMembers 
    ? Math.round(((dashboardData.overview.presents + dashboardData.overview.teletravail) / dashboardData.overview.totalMembers) * 100)
    : 0;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Tableau de Bord</h1>
          <p className="page-description">
            Bienvenue{profile ? `, ${profile.prenom}` : ''} dans le Système de Gestion du Conseil Scientifique National
          </p>
        </div>

        {/* Stats Grid */}
        {loadingDashboard ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Effectifs Total"
              value={dashboardData?.overview.totalMembers || 0}
              icon={<Users className="w-6 h-6" />}
              variant="primary"
            />
            <StatCard
              title="Présents Aujourd'hui"
              value={dashboardData?.overview.presents || 0}
              icon={<Clock className="w-6 h-6" />}
              variant="success"
              trend={dashboardData?.overview.teletravail 
                ? { value: dashboardData.overview.teletravail, label: "en télétravail" }
                : undefined
              }
            />
            <StatCard
              title="Tâches en Cours"
              value={tasksInProgress}
              icon={<ListTodo className="w-6 h-6" />}
              variant="warning"
              trend={dashboardData?.tasks.en_retard 
                ? { value: -dashboardData.tasks.en_retard, label: "en retard" }
                : undefined
              }
            />
            <StatCard
              title="Taux de Présence"
              value={`${productivity}%`}
              icon={<TrendingUp className="w-6 h-6" />}
              variant="accent"
            />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <TasksOverview />
            <DepartmentPerformance />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <PresenceOverview />
            <RecentActivity />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
