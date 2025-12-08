import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { PresenceOverview } from "@/components/dashboard/PresenceOverview";
import { TasksOverview } from "@/components/dashboard/TasksOverview";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { DepartmentPerformance } from "@/components/dashboard/DepartmentPerformance";
import { Users, ListTodo, Clock, TrendingUp } from "lucide-react";

const Dashboard = () => {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Tableau de Bord</h1>
          <p className="page-description">
            Bienvenue dans le Système de Gestion du Conseil Scientifique National
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Effectifs Total"
            value={65}
            icon={<Users className="w-6 h-6" />}
            variant="primary"
            trend={{ value: 5, label: "ce mois" }}
          />
          <StatCard
            title="Présents Aujourd'hui"
            value={57}
            icon={<Clock className="w-6 h-6" />}
            variant="success"
            trend={{ value: 12, label: "vs hier" }}
          />
          <StatCard
            title="Tâches en Cours"
            value={24}
            icon={<ListTodo className="w-6 h-6" />}
            variant="warning"
            trend={{ value: -8, label: "cette semaine" }}
          />
          <StatCard
            title="Productivité"
            value="92%"
            icon={<TrendingUp className="w-6 h-6" />}
            variant="accent"
            trend={{ value: 3, label: "ce mois" }}
          />
        </div>

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
