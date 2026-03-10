import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckCheck, CalendarIcon, Search, BellOff, Filter, X } from "lucide-react";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const typeLabels: Record<string, string> = {
  approval_request: "Demande d'approbation",
  force_checkout: "Déconnexion forcée",
  task_assigned: "Tâche assignée",
  info: "Information",
  warning: "Avertissement",
  success: "Succès",
};

const typeIcons: Record<string, string> = {
  approval_request: "📋",
  force_checkout: "⏹️",
  task_assigned: "📝",
  info: "ℹ️",
  warning: "⚠️",
  success: "✅",
};

export default function Notifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const availableTypes = useMemo(() => {
    const types = new Set(notifications.map(n => n.type || "info"));
    return Array.from(types);
  }, [notifications]);

  const filtered = useMemo(() => {
    return notifications.filter(n => {
      if (search) {
        const q = search.toLowerCase();
        if (!n.title.toLowerCase().includes(q) && !(n.body || "").toLowerCase().includes(q)) return false;
      }
      if (typeFilter !== "all" && (n.type || "info") !== typeFilter) return false;
      if (readFilter === "unread" && n.read) return false;
      if (readFilter === "read" && !n.read) return false;
      if (dateFrom && n.created_at && isBefore(new Date(n.created_at), startOfDay(dateFrom))) return false;
      if (dateTo && n.created_at && isAfter(new Date(n.created_at), endOfDay(dateTo))) return false;
      return true;
    });
  }, [notifications, search, typeFilter, readFilter, dateFrom, dateTo]);

  const hasFilters = search || typeFilter !== "all" || readFilter !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setReadFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est lu"} · {notifications.length} au total
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="w-4 h-4" />
            Filtres
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {availableTypes.map(t => (
                <SelectItem key={t} value={t}>
                  {typeIcons[t] || "🔔"} {typeLabels[t] || t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={readFilter} onValueChange={setReadFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="unread">Non lues</SelectItem>
              <SelectItem value="read">Lues</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="w-4 h-4 mr-2" />
                {dateFrom ? format(dateFrom, "dd/MM/yy") : "Du"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" locale={fr} />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="w-4 h-4 mr-2" />
                {dateTo ? format(dateTo, "dd/MM/yy") : "Au"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" locale={fr} />
            </PopoverContent>
          </Popover>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" /> Réinitialiser
            </Button>
          )}
        </div>

        {/* Results */}
        <div className="text-xs text-muted-foreground">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</div>

        {/* List */}
        <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <BellOff className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">Aucune notification trouvée</p>
              {hasFilters && <p className="text-xs mt-1">Essayez de modifier vos filtres</p>}
            </div>
          ) : (
            filtered.map(notif => (
              <button
                key={notif.id}
                className={cn(
                  "w-full text-left px-5 py-4 hover:bg-muted/50 transition-colors flex gap-4 items-start",
                  !notif.read && "bg-primary/5"
                )}
                onClick={() => { if (!notif.read) markAsRead(notif.id); }}
              >
                <span className="text-xl mt-0.5 shrink-0">
                  {typeIcons[notif.type || "info"] || "🔔"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className={cn("text-sm", !notif.read && "font-semibold")}>{notif.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {typeLabels[notif.type || "info"] || notif.type || "info"}
                      </Badge>
                      {!notif.read && <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />}
                    </div>
                  </div>
                  {notif.body && (
                    <p className="text-xs text-muted-foreground mt-1">{notif.body}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground/60 mt-2">
                    {notif.created_at ? format(new Date(notif.created_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr }) : ""}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
