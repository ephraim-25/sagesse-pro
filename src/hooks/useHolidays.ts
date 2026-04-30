import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Holiday } from "@/lib/workingDays";

export function useHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data } = await supabase.from("holidays").select("*").order("date", { ascending: true });
    setHolidays((data ?? []) as Holiday[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel("holidays-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "holidays" }, () => refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return { holidays, loading, refetch };
}
