import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHolidays } from "@/hooks/useHolidays";
import { isWeekend, isHoliday } from "@/lib/workingDays";

interface Eligibility {
  eligible: boolean;
  reason: string | null;
  loading: boolean;
}

/**
 * Tells whether the current agent is allowed to check-in/out today,
 * based on weekday, active RDC holidays and approved leaves.
 */
export function usePresenceEligibility(): Eligibility {
  const { profile } = useAuth();
  const { holidays, loading: holLoading } = useHolidays();
  const [leaveCovering, setLeaveCovering] = useState<{ start_date: string; end_date: string } | null>(null);
  const [leaveLoading, setLeaveLoading] = useState(true);

  // Kinshasa local "today"
  const today = useMemo(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!profile?.id) return;
      setLeaveLoading(true);
      const { data } = await supabase
        .from("leave_requests")
        .select("start_date, end_date")
        .eq("user_id", profile.id)
        .eq("status", "approved")
        .lte("start_date", today)
        .gte("end_date", today)
        .maybeSingle();
      if (!cancelled) {
        setLeaveCovering(data ?? null);
        setLeaveLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [profile?.id, today]);

  return useMemo<Eligibility>(() => {
    const loading = holLoading || leaveLoading;
    const d = new Date(today + "T12:00:00Z");
    if (isWeekend(d)) {
      return {
        eligible: false,
        loading,
        reason: "Le pointage n'est pas autorisé les week-ends. Le Conseil opère du lundi au vendredi.",
      };
    }
    if (isHoliday(d, holidays)) {
      const mmdd = today.slice(5);
      const h = holidays.find((x) =>
        x.active && (x.is_recurring ? x.date.slice(5) === mmdd : x.date === today)
      );
      return {
        eligible: false,
        loading,
        reason: `Jour férié RDC actif${h ? ` : « ${h.label} »` : ""}. Pointage désactivé.`,
      };
    }
    if (leaveCovering) {
      return {
        eligible: false,
        loading,
        reason: `Vous êtes en congé approuvé du ${leaveCovering.start_date} au ${leaveCovering.end_date}.`,
      };
    }
    return { eligible: true, loading, reason: null };
  }, [holidays, holLoading, leaveLoading, leaveCovering, today]);
}
