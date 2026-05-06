import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { isHoliday, isWeekend, type Holiday } from "@/lib/workingDays";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface BlockedRange {
  start: string; // ISO yyyy-mm-dd
  end: string;
  label?: string;
}

interface Props {
  holidays: Holiday[];
  startDate?: string;
  endDate?: string;
  onPickDate?: (iso: string) => void;
  /** Plages déjà demandées (en attente / approuvées) pour visualiser les chevauchements. */
  blockedRanges?: BlockedRange[];
}

/**
 * Mini calendrier mensuel : affiche jours ouvrés (lun-ven), week-ends (gris),
 * jours fériés actifs (rouge), plages déjà demandées (orange) et la sélection [start..end] (primary).
 */
export function LeaveCalendar({ holidays, startDate, endDate, onPickDate, blockedRanges = [] }: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = startDate ? new Date(startDate) : new Date();
    d.setDate(1);
    return d;
  });

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
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

  const matchingBlocked = (d: Date): BlockedRange | undefined => {
    const iso = d.toISOString().slice(0, 10);
    return blockedRanges.find((r) => r.start <= iso && r.end >= iso);
  };

  const getReasons = (d: Date): string[] => {
    const reasons: string[] = [];
    if (isWeekend(d)) reasons.push("Week-end");
    const hl = holidayLabel(d);
    if (hl) reasons.push(`Férié — ${hl}`);
    const blk = matchingBlocked(d);
    if (blk) reasons.push(blk.label ?? "Demande existante");
    return reasons;
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
          const blocked = matchingBlocked(d);
          const selected = inRange(d);
          const reasons = getReasons(d);
          const tooltip = reasons.length > 0 ? reasons.join(" · ") : undefined;
          const blockedSelectedConflict = selected && (weekend || holiday || blocked);

          const isBlocked = weekend || holiday || !!blocked;
          const dayCell = (
            <button
              type="button"
              onClick={() => onPickDate?.(d.toISOString().slice(0, 10))}
              title={tooltip}
              aria-label={`${d.toISOString().slice(0, 10)}${tooltip ? ` (bloqué : ${tooltip})` : ""}`}
              className={cn(
                "w-full aspect-square rounded-md text-xs flex items-center justify-center transition-colors min-h-[36px] relative",
                "hover:ring-1 hover:ring-primary/40",
                weekend && "bg-muted/40 text-muted-foreground",
                holiday && "bg-destructive/15 text-destructive font-medium",
                blocked && !holiday && "bg-warning/20 text-warning-foreground line-through",
                !weekend && !holiday && !blocked && "bg-background",
                selected && "ring-2 ring-primary",
                selected && !blockedSelectedConflict && "bg-primary/10 text-foreground font-semibold",
                blockedSelectedConflict && "ring-destructive"
              )}
            >
              {d.getDate()}
              {(weekend || holiday || blocked) && (
                <span className="absolute bottom-0.5 right-1 text-[8px] leading-none">
                  {holiday ? "F" : blocked ? "C" : "W"}
                </span>
              )}
            </button>
          );

          if (!isBlocked) {
            return <div key={i}>{dayCell}</div>;
          }

          // Pour chaque jour bloqué : un bouton "Voir cause" via popover (mobile-friendly).
          return (
            <div key={i} className="relative">
              {dayCell}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Voir cause du ${d.toISOString().slice(0, 10)}`}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-card border border-border shadow flex items-center justify-center hover:bg-accent"
                  >
                    <Info className="w-2.5 h-2.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 text-xs">
                  <p className="font-semibold mb-1">
                    {format(d, "EEEE dd MMMM yyyy", { locale: fr })}
                  </p>
                  {weekend && <p>• Week-end (samedi/dimanche)</p>}
                  {holiday && <p>• Jour férié — {holidayLabel(d)}</p>}
                  {blocked && (
                    <p>
                      • Demande existante {blocked.label ? `— ${blocked.label}` : ""}
                      <br />
                      <span className="text-muted-foreground">
                        ({format(new Date(blocked.start), "dd/MM/yyyy")} → {format(new Date(blocked.end), "dd/MM/yyyy")})
                      </span>
                    </p>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-background border border-border" /> Ouvré</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted/40" /> Week-end (W)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/15" /> Férié (F)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning/20" /> Congé existant (C)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded ring-2 ring-primary bg-primary/10" /> Sélection</span>
      </div>
    </div>
  );
}
