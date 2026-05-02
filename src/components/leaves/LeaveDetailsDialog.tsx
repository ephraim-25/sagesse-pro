import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Clock, XCircle, Send, Ban, User, Shield, BellRing, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface LeaveDetail {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  working_days: number;
  reason: string | null;
  status: "pending_chef" | "pending_admin" | "approved" | "rejected" | "cancelled";
  chef_id: string | null;
  chef_decided_at: string | null;
  chef_comment: string | null;
  admin_id: string | null;
  admin_decided_at: string | null;
  admin_comment: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leave: LeaveDetail | null;
}

interface ProfileLite { id: string; prenom: string; nom: string; }

const statusLabel: Record<LeaveDetail["status"], string> = {
  pending_chef: "En attente Chef de Bureau",
  pending_admin: "En attente Administration",
  approved: "Approuvé",
  rejected: "Rejeté",
  cancelled: "Annulé",
};

export function LeaveDetailsDialog({ open, onOpenChange, leave }: Props) {
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [auditId, setAuditId] = useState<string | null>(null);

  useEffect(() => {
    if (!leave) return;
    const ids = [leave.user_id, leave.chef_id, leave.admin_id].filter(Boolean) as string[];
    if (ids.length) {
      supabase
        .from("profiles")
        .select("id, prenom, nom")
        .in("id", ids)
        .then(({ data }) => {
          const map: Record<string, ProfileLite> = {};
          (data ?? []).forEach((p) => { map[p.id] = p as ProfileLite; });
          setProfiles(map);
        });
    }
    // Look up the audit_log entry for the cancellation (visible to admins).
    if (leave.status === "cancelled") {
      supabase
        .from("audit_logs")
        .select("id")
        .eq("action", "LEAVE_CANCELLED")
        .contains("nouvelle_valeur", { leave_id: leave.id } as never)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => setAuditId((data as { id: string } | null)?.id ?? null));
    } else {
      setAuditId(null);
    }
  }, [leave]);

  if (!leave) return null;

  const userName = (id?: string | null) => {
    if (!id) return "—";
    const p = profiles[id];
    return p ? `${p.prenom} ${p.nom}` : "…";
  };

  const events: Array<{
    icon: typeof Send;
    title: string;
    at: string | null;
    actor?: string;
    comment?: string | null;
    tone: "default" | "success" | "danger" | "muted";
  }> = [
    {
      icon: Send,
      title: "Demande soumise",
      at: leave.created_at,
      actor: userName(leave.user_id),
      tone: "default",
    },
  ];

  if (leave.chef_decided_at) {
    const approvedByChef = leave.status !== "rejected" || !!leave.admin_decided_at;
    // Chef rejected if status is rejected and there is no admin decision
    const chefRejected = leave.status === "rejected" && !leave.admin_decided_at;
    events.push({
      icon: chefRejected ? XCircle : CheckCircle2,
      title: chefRejected ? "Rejeté par le Chef de Bureau" : "Validé par le Chef de Bureau",
      at: leave.chef_decided_at,
      actor: userName(leave.chef_id),
      comment: leave.chef_comment,
      tone: chefRejected ? "danger" : "success",
    });
  }

  if (leave.admin_decided_at) {
    const adminRejected = leave.status === "rejected";
    events.push({
      icon: adminRejected ? XCircle : Shield,
      title: adminRejected ? "Rejeté par l'Administration" : "Approuvé par l'Administration",
      at: leave.admin_decided_at,
      actor: userName(leave.admin_id),
      comment: leave.admin_comment,
      tone: adminRejected ? "danger" : "success",
    });
  }

  if (leave.status === "cancelled") {
    events.push({
      icon: Ban,
      title: "Demande annulée par l'agent",
      at: leave.updated_at,
      actor: userName(leave.user_id),
      tone: "muted",
    });
  }

  if (leave.status === "pending_chef" || leave.status === "pending_admin") {
    events.push({
      icon: Clock,
      title: leave.status === "pending_chef" ? "En attente du Chef de Bureau" : "En attente de l'Administration",
      at: null,
      tone: "muted",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails de la demande de congé</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Résumé */}
          <div className="bg-muted/40 rounded-lg p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4" /> <strong>{userName(leave.user_id)}</strong>
              </div>
              <Badge>{statusLabel[leave.status]}</Badge>
            </div>
            <p className="text-sm">
              Du <strong>{format(new Date(leave.start_date), "dd MMM yyyy", { locale: fr })}</strong>{" "}
              au <strong>{format(new Date(leave.end_date), "dd MMM yyyy", { locale: fr })}</strong>{" "}
              — <strong>{leave.working_days}</strong> jour(s) ouvrable(s)
            </p>
            {leave.reason && (
              <p className="text-sm text-muted-foreground">Motif : {leave.reason}</p>
            )}
          </div>

          {/* Timeline */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Historique</h4>
            <ol className="relative border-l border-border ml-3 space-y-4">
              {events.map((e, i) => (
                <li key={i} className="ml-6">
                  <span
                    className={cn(
                      "absolute -left-[11px] flex w-5 h-5 items-center justify-center rounded-full ring-4 ring-background",
                      e.tone === "success" && "bg-primary text-primary-foreground",
                      e.tone === "danger" && "bg-destructive text-destructive-foreground",
                      e.tone === "muted" && "bg-muted text-muted-foreground",
                      e.tone === "default" && "bg-secondary text-secondary-foreground"
                    )}
                  >
                    <e.icon className="w-3 h-3" />
                  </span>
                  <p className="text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.at ? format(new Date(e.at), "dd MMM yyyy 'à' HH:mm", { locale: fr }) : "à venir"}
                    {e.actor && <> · {e.actor}</>}
                  </p>
                  {e.comment && (
                    <p className="mt-1 text-xs bg-muted/50 rounded p-2">« {e.comment} »</p>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* Section Annulation (uniquement si annulée) */}
          {leave.status === "cancelled" && (
            <Alert variant="destructive">
              <Ban className="w-4 h-4" />
              <AlertTitle>Demande annulée</AlertTitle>
              <AlertDescription className="space-y-1 mt-1">
                <p>
                  <strong>Annulée par :</strong> {userName(leave.user_id)} (agent demandeur)
                </p>
                <p>
                  <strong>Date / heure :</strong>{" "}
                  {format(new Date(leave.updated_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                </p>
                <p className="flex items-center gap-1 text-xs">
                  <BellRing className="w-3 h-3" />
                  Notification temps réel envoyée au Chef de Bureau et à tous les administrateurs.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
