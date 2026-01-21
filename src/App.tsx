import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import PresidentDashboard from "./pages/PresidentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import TeamManagement from "./pages/TeamManagement";
import MonBureau from "./pages/MonBureau";
import Members from "./pages/Members";
import Competences from "./pages/Competences";
import Tasks from "./pages/Tasks";
import CheckIn from "./pages/CheckIn";
import RemoteWork from "./pages/RemoteWork";
import History from "./pages/History";
import Performance from "./pages/Performance";
import PerformanceStats from "./pages/PerformanceStats";
import Reports from "./pages/Reports";
import Security from "./pages/Security";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/president" element={<ProtectedRoute requiredRole="president"><PresidentDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/equipes" element={<ProtectedRoute requiredRole="admin"><TeamManagement /></ProtectedRoute>} />
            <Route path="/mon-bureau" element={<ProtectedRoute requiredRole="chef_service"><MonBureau /></ProtectedRoute>} />
            <Route path="/membres" element={<ProtectedRoute><Members /></ProtectedRoute>} />
            <Route path="/competences" element={<ProtectedRoute><Competences /></ProtectedRoute>} />
            <Route path="/taches" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
            <Route path="/checkin" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
            <Route path="/teletravail" element={<ProtectedRoute><RemoteWork /></ProtectedRoute>} />
            <Route path="/historique" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/performance" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
            <Route path="/stats" element={<ProtectedRoute requiredRole="president"><PerformanceStats /></ProtectedRoute>} />
            <Route path="/rapports" element={<ProtectedRoute requiredRole="chef_service"><Reports /></ProtectedRoute>} />
            <Route path="/securite" element={<ProtectedRoute requiredRole="admin"><Security /></ProtectedRoute>} />
            <Route path="/parametres" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
