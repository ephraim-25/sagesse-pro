import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import PresidentDashboard from "./pages/PresidentDashboard";
import Members from "./pages/Members";
import Competences from "./pages/Competences";
import Tasks from "./pages/Tasks";
import CheckIn from "./pages/CheckIn";
import RemoteWork from "./pages/RemoteWork";
import History from "./pages/History";
import Performance from "./pages/Performance";
import Reports from "./pages/Reports";
import Security from "./pages/Security";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/president" element={<PresidentDashboard />} />
          <Route path="/membres" element={<Members />} />
          <Route path="/competences" element={<Competences />} />
          <Route path="/taches" element={<Tasks />} />
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/teletravail" element={<RemoteWork />} />
          <Route path="/historique" element={<History />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/rapports" element={<Reports />} />
          <Route path="/securite" element={<Security />} />
          <Route path="/parametres" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
