import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Calendar,
  Download,
  Filter,
  Clock,
  LogIn,
  LogOut,
  Laptop
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const historyData = [
  { id: 1, name: "Marie Dupont", date: "2024-12-08", checkIn: "08:45", checkOut: "17:30", type: "present", duration: "8h 45min" },
  { id: 2, name: "Jean Martin", date: "2024-12-08", checkIn: "09:00", checkOut: "—", type: "remote", duration: "En cours" },
  { id: 3, name: "Sophie Bernard", date: "2024-12-08", checkIn: "08:30", checkOut: "16:45", type: "present", duration: "8h 15min" },
  { id: 4, name: "Pierre Durand", date: "2024-12-08", checkIn: "—", checkOut: "—", type: "absent", duration: "—" },
  { id: 5, name: "Claire Moreau", date: "2024-12-08", checkIn: "09:15", checkOut: "18:00", type: "present", duration: "8h 45min" },
  { id: 6, name: "Marie Dupont", date: "2024-12-07", checkIn: "08:30", checkOut: "17:15", type: "present", duration: "8h 45min" },
  { id: 7, name: "Jean Martin", date: "2024-12-07", checkIn: "08:45", checkOut: "17:30", type: "present", duration: "8h 45min" },
  { id: 8, name: "Sophie Bernard", date: "2024-12-07", checkIn: "09:00", checkOut: "17:00", type: "remote", duration: "8h 00min" },
];

const typeConfig = {
  present: { label: "Présent", icon: LogIn, color: "text-success bg-success/10" },
  remote: { label: "Télétravail", icon: Laptop, color: "text-info bg-info/10" },
  absent: { label: "Absent", icon: LogOut, color: "text-destructive bg-destructive/10" },
};

const History = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const filteredData = historyData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || item.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">Historique des Présences</h1>
            <p className="page-description">Consultez l'historique complet des pointages</p>
          </div>
          <Button variant="outline" className="w-fit">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un membre..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="present">Présent</SelectItem>
              <SelectItem value="remote">Télétravail</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Période
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50">
            <p className="text-2xl font-bold text-success">186</p>
            <p className="text-sm text-muted-foreground">Jours présentiels</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50">
            <p className="text-2xl font-bold text-info">42</p>
            <p className="text-sm text-muted-foreground">Jours télétravail</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50">
            <p className="text-2xl font-bold text-destructive">12</p>
            <p className="text-sm text-muted-foreground">Jours d'absence</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50">
            <p className="text-2xl font-bold text-foreground">8h 22min</p>
            <p className="text-sm text-muted-foreground">Durée moyenne</p>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-card rounded-xl shadow-soft border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Date</th>
                  <th>Arrivée</th>
                  <th>Départ</th>
                  <th>Durée</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => {
                  const typeInfo = typeConfig[item.type as keyof typeof typeConfig];
                  const TypeIcon = typeInfo.icon;

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                            {item.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </td>
                      <td className="text-muted-foreground">
                        {new Date(item.date).toLocaleDateString('fr-FR', { 
                          weekday: 'short', 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <LogIn className="w-4 h-4 text-success" />
                          <span>{item.checkIn}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <LogOut className="w-4 h-4 text-destructive" />
                          <span>{item.checkOut}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{item.duration}</span>
                        </div>
                      </td>
                      <td>
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                          typeInfo.color
                        )}>
                          <TypeIcon className="w-3 h-3" />
                          {typeInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default History;
