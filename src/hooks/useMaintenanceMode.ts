import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MaintenanceState {
  maintenance_mode: boolean;
  updated_at: string | null;
  updated_by: string | null;
  id: string | null;
}

const DEFAULT: MaintenanceState = {
  maintenance_mode: false,
  updated_at: null,
  updated_by: null,
  id: null,
};

export function useMaintenanceMode() {
  const [state, setState] = useState<MaintenanceState>(DEFAULT);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("app_settings")
      .select("id, maintenance_mode, updated_at, updated_by")
      .limit(1)
      .maybeSingle();
    if (!error && data) {
      setState({
        id: data.id,
        maintenance_mode: !!data.maintenance_mode,
        updated_at: data.updated_at,
        updated_by: data.updated_by,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const channel = (supabase as any)
      .channel("app_settings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload: any) => {
          const row = payload.new || payload.old;
          if (row) {
            setState({
              id: row.id,
              maintenance_mode: !!row.maintenance_mode,
              updated_at: row.updated_at,
              updated_by: row.updated_by,
            });
          }
        }
      )
      .subscribe();
    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [refresh]);

  const setMaintenance = useCallback(async (value: boolean, profileId: string | null) => {
    if (!state.id) {
      // No row, insert
      const { error } = await (supabase as any)
        .from("app_settings")
        .insert({ maintenance_mode: value, updated_by: profileId });
      if (error) throw error;
    } else {
      const { error } = await (supabase as any)
        .from("app_settings")
        .update({ maintenance_mode: value, updated_by: profileId, updated_at: new Date().toISOString() })
        .eq("id", state.id);
      if (error) throw error;
    }
    await refresh();
  }, [state.id, refresh]);

  return { ...state, loading, refresh, setMaintenance };
}
