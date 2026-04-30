import { supabase } from "@/integrations/supabase/client";

export interface Holiday {
  id: string;
  date: string;
  label: string;
  is_recurring: boolean;
  is_occasional: boolean;
  active: boolean;
}

/**
 * Returns true if a date falls on a weekend (Saturday/Sunday).
 * Conseil opère lundi → vendredi.
 */
export function isWeekend(d: Date): boolean {
  const day = d.getDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

/**
 * Check if a date matches any active holiday (recurring on MM-DD, or specific).
 */
export function isHoliday(d: Date, holidays: Holiday[]): boolean {
  const mmdd = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const iso = d.toISOString().slice(0, 10);
  return holidays.some((h) => {
    if (!h.active) return false;
    if (h.is_recurring) return h.date.slice(5) === mmdd;
    return h.date === iso;
  });
}

export function isWorkingDay(d: Date, holidays: Holiday[]): boolean {
  return !isWeekend(d) && !isHoliday(d, holidays);
}

/**
 * Count working days (Mon-Fri, excluding holidays) between two dates inclusive.
 */
export function countWorkingDays(start: Date, end: Date, holidays: Holiday[]): number {
  if (end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    if (isWorkingDay(cur, holidays)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function fetchHolidays(): Promise<Holiday[]> {
  const { data, error } = await supabase
    .from("holidays")
    .select("*")
    .eq("active", true);
  if (error || !data) return [];
  return data as Holiday[];
}
