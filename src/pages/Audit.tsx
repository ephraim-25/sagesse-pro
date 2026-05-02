import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, History as HistoryIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AuditRow {
  id: string;
  action: string;
  table_cible: string | null;
  ancienne_valeur: unknown;
  nouvelle_valeur: unknown;
  created_at: string;
  user_id: string | null;
  device: string | null;
}

export default function Audit() {
  const [params] = useSearchParams();
  const focusId = params.get("id");
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let q = supabase
        .from("audit_logs")
        .select("id, action, table_cible, ancienne_valeur, nouvelle_valeur, created_at, user_id, device")
        .order("created_at", { ascending: false })
        .limit(200);
      if (focusId) {
        // Bring the focused entry first by fetching it as a fallback
      }
      const { data } = await q;
      setRows((data ?? []) as AuditRow[]);
      setLoading(false);
      if (focusId) {
        setTimeout(() => {
          const el = document.getElementById(`audit-${focusId}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 200);
      }
    };
    load();
  }, [focusId]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
        <div className="page-header">
          <h1 className="page-title flex items-center gap-2">
            <HistoryIcon className="w-6 h-6" />
            Historique d'audit
          </h1>
          <p className="page-description">
            Trace des actions sensibles enregistrées sur la plateforme (visible par les administrateurs).
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aucune entrée d'audit accessible.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const focused = focusId === r.id;
              return (
                <Card
                  id={`audit-${r.id}`}
                  key={r.id}
                  className={cn(
                    "transition-all",
                    focused && "ring-2 ring-primary border-primary"
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Badge>{r.action}</Badge>
                        <span className="text-muted-foreground text-xs">
                          {r.table_cible}
                        </span>
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "dd MMM yyyy 'à' HH:mm:ss", { locale: fr })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="text-xs">
                    <pre className="bg-muted/40 rounded p-2 overflow-x-auto max-h-48">
{JSON.stringify(r.nouvelle_valeur ?? r.ancienne_valeur ?? {}, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
