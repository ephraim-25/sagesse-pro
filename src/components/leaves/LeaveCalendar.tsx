import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isHoliday, isWeekend, type Holiday } from "@/lib/workingDays";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  holidays: Holiday[];
  startDate?: string;
  endDate?: string;
  onPickDate?: (iso: string) => void;
}

/**
 * Mini calendrier mensuel : affiche jours ouvrés (lun-ven), week-ends (gris),
 * jours fériés actifs (rouge) et la sélection [start..end] (primary).
 * Cliquer sur un jour appelle onPickDate(iso).
 */
export function LeaveCalendar({ holidays, startDate, endDate, onPickDate }: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = startDate ? new Date(startDate) : new Date();
    d.setDate(1);
    return d;
  });

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    // ISO week starts Monday: 0=Sun..6=Sat → offset = (getDay()+6)%7
    const offset = (first.getDay() + 6) % 7;
    const cells: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const inRange = (d: Date) => {
    if (!start) return false;
    const s = new Date(start); s.setHours(0, 0, 0, 0);
    const e = end ? new Date(end) : s;
    e.setHours(0, 0, 0, 0);
    const x = new Date(d); x.setHours(0, 0, 0, 0);
    return x >= s && x <= e;
  };

  const holidayLabel = (d: Date) => {
    const mmdd = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const iso = d.toISOString().slice(0, 10);
    const h = holidays.find(
      (h) =>
        h.active &&
        ((h.is_recurring && h.date.slice(5) === mmdd) || (!h.is_recurring && h.date === iso))
    );
    return h?.label;
  };

  return (
    <div className="border border-border rounded-lg p-3 bg-card">
      <div className="flex items-center justify-between mb-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          aria-label="Mois précédent"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <p className="font-medium text-sm capitalize">
          {format(cursor, "MMMM yyyy", { locale: fr })}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          aria-label="Mois suivant"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[11px] text-center text-muted-foreground mb-1">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const weekend = isWeekend(d);
          const holiday = isHoliday(d, holidays);
          const selected = inRange(d);
          const label = holidayLabel(d);
          return (
            <button
              type="button"
              key={i}
              onClick={() => onPickDate?.(d.toISOString().slice(0, 10))}
              title={label ?? undefined}
              className={cn(
                "aspect-square rounded-md text-xs flex items-center justify-center transition-colors min-h-[36px]",
                "hover:ring-1 hover:ring-primary/40",
                weekend && "bg-muted/40 text-muted-foreground",
                holiday && "bg-destructive/15 text-destructive font-medium",
                !weekend && !holiday && "bg-background",
                selected && "ring-2 ring-primary bg-primary/10 text-foreground font-semibold"
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-background border border-border" /> Ouvré</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted/40" /> Week-end</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/15" /> Férié</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded ring-2 ring-primary bg-primary/10" /> Sélection</span>
      </div>
    </div>
  );
}
