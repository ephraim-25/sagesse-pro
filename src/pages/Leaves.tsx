import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Send, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHolidays } from "@/hooks/useHolidays";
import { countWorkingDays } from "@/lib/workingDays";
import { toast } from "sonner";
import { sendNotification, notifyAdmins } from "@/lib/notifications";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type LeaveStatus = "pending_chef" | "pending_admin" | "approved" | "rejected" | "cancelled";

interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  working_days: number;
  reason: string | null;
  status: LeaveStatus;
  chef_comment: string | null;
  admin_comment: string | null;
  created_at: string;
}

const statusMeta: Record<LeaveStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_chef: { label: "En attente Chef de Bureau", variant: "secondary" },
  pending_admin: { label: "En attente Administration", variant: "secondary" },
  approved: { label: "Approuvé", variant: "default" },
  rejected: { label: "Rejeté", variant: "destructive" },
  cancelled: { label: "Annulé", variant: "outline" },
};

export default function Leaves() {
  const { profile, isAdmin, isChefService, isPresident } = useAuth();
  const { holidays } = useHolidays();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mine, setMine] = useState<LeaveRequest[]>([]);
  const [toReview, setToReview] = useState<LeaveRequest[]>([]);

  const workingDaysSelected = useMemo(() => {
    if (!start || !end) return 0;
    return countWorkingDays(new Date(start), new Date(end), holidays);
  }, [start, end, holidays]);

  const fetchAll = async () => {
    if (!profile) return;
    const { data: own } = await supabase
      .from("leave_requests" as never)
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    setMine((own ?? []) as LeaveRequest[]);

    if (isChefService || isAdmin || isPresident) {
      const { data: all } = await supabase
        .from("leave_requests" as never)
        .select("*")
        .order("created_at", { ascending: false });
      setToReview((all ?? []) as LeaveRequest[]);
    }
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("leave_requests-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "leave_requests" }, () => fetchAll())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, isChefService, isAdmin, isPresident]);

  const handleSubmit = async () => {
    if (!profile || !start || !end) return;
    if (new Date(end) < new Date(start)) {
      toast.error("La date de fin doit être après la date de début.");
      return;
    }
    if (workingDaysSelected <= 0) {
      toast.error("La période sélectionnée ne contient aucun jour ouvrable.");
      return;
    }
    if (workingDaysSelected > 22) {
      toast.error("Le congé annuel est limité à 22 jours ouvrables (1 mois).");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("leave_requests" as never).insert({
      user_id: profile.id,
      start_date: start,
      end_date: end,
      working_days: workingDaysSelected,
      reason: reason || null,
      status: "pending_chef",
    } as never);
    setSubmitting(false);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    toast.success("Demande envoyée à votre chef de bureau.");
    setStart(""); setEnd(""); setReason("");

    // Notifier le chef
    if (profile.manager_id) {
      await sendNotification({
        user_id: profile.manager_id,
        title: "Nouvelle demande de congé",
        body: `${profile.prenom} ${profile.nom} demande ${workingDaysSelected} jour(s) ouvrable(s) de congé.`,
        type: "approval_request",
        meta: { link: "/conges" },
      });
    }
  };

  const decideAsChef = async (req: LeaveRequest, approve: boolean, comment?: string) => {
    if (!profile) return;
    const newStatus: LeaveStatus = approve ? "pending_admin" : "rejected";
    const { error } = await supabase
      .from("leave_requests" as never)
      .update({
        status: newStatus,
        chef_id: profile.id,
        chef_decided_at: new Date().toISOString(),
        chef_comment: comment ?? null,
      } as never)
      .eq("id", req.id);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "Transmis à l'administration." : "Demande rejetée.");
    await sendNotification({
      user_id: req.user_id,
      title: approve ? "Congé validé par votre chef" : "Congé rejeté par votre chef",
      body: approve ? "En attente de la validation finale de l'administration." : (comment || "Demande rejetée."),
      type: "approval_decision",
      meta: { link: "/conges" },
    });
    if (approve) {
      await notifyAdmins({
        title: "Congé à valider (administration)",
        body: `Validation finale requise pour ${req.working_days} jour(s) ouvrable(s).`,
        type: "approval_request",
        meta: { link: "/conges" },
      });
    }
  };

  const decideAsAdmin = async (req: LeaveRequest, approve: boolean, comment?: string) => {
    if (!profile) return;
    const newStatus: LeaveStatus = approve ? "approved" : "rejected";
    const { error } = await supabase
      .from("leave_requests" as never)
      .update({
        status: newStatus,
        admin_id: profile.id,
        admin_decided_at: new Date().toISOString(),
        admin_comment: comment ?? null,
      } as never)
      .eq("id", req.id);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "Congé approuvé." : "Congé rejeté.");
    await sendNotification({
      user_id: req.user_id,
      title: approve ? "Congé approuvé" : "Congé rejeté",
      body: comment || (approve ? "Votre congé annuel est validé." : "Demande non retenue."),
      type: "approval_decision",
      meta: { link: "/conges" },
    });
  };

  const cancelOwn = async (req: LeaveRequest) => {
    const { error } = await supabase
      .from("leave_requests" as never)
      .update({ status: "cancelled" } as never)
      .eq("id", req.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Demande annulée.");
  };

  const pendingChef = toReview.filter(
    (r) => r.status === "pending_chef" && (isChefService || isAdmin || isPresident)
  );
  const pendingAdmin = toReview.filter((r) => r.status === "pending_admin" && (isAdmin || isPresident));

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Congés annuels</h1>
          <p className="page-description">
            Demandez votre congé annuel (1 mois max, jours ouvrables — lundi à vendredi, hors fériés).
          </p>
        </div>

        <Tabs defaultValue="request" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="request">Nouvelle demande</TabsTrigger>
            <TabsTrigger value="mine">Mes demandes</TabsTrigger>
            {(isChefService || isAdmin || isPresident) && (
              <TabsTrigger value="chef">
                À valider (Chef){pendingChef.length > 0 && <Badge variant="secondary" className="ml-2">{pendingChef.length}</Badge>}
              </TabsTrigger>
            )}
            {(isAdmin || isPresident) && (
              <TabsTrigger value="admin">
                À valider (Admin){pendingAdmin.length > 0 && <Badge variant="secondary" className="ml-2">{pendingAdmin.length}</Badge>}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="request">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" /> Demander un congé
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-w-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date de début</label>
                    <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date de fin</label>
                    <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} min={start} />
                  </div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-sm">
                  Jours ouvrables comptés : <strong>{workingDaysSelected}</strong> / 22
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Motif (optionnel)</label>
                  <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Précisez le motif..." />
                </div>
                <Button onClick={handleSubmit} disabled={submitting || !start || !end} className="w-full sm:w-auto">
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? "Envoi..." : "Envoyer la demande"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mine">
            <LeaveList items={mine} onCancel={cancelOwn} canCancel />
          </TabsContent>

          {(isChefService || isAdmin || isPresident) && (
            <TabsContent value="chef">
              <LeaveList
                items={pendingChef}
                onApprove={(r, c) => decideAsChef(r, true, c)}
                onReject={(r, c) => decideAsChef(r, false, c)}
                actionLabel="Transmettre à l'admin"
              />
            </TabsContent>
          )}

          {(isAdmin || isPresident) && (
            <TabsContent value="admin">
              <LeaveList
                items={pendingAdmin}
                onApprove={(r, c) => decideAsAdmin(r, true, c)}
                onReject={(r, c) => decideAsAdmin(r, false, c)}
                actionLabel="Approuver définitivement"
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}

function LeaveList({
  items,
  onApprove,
  onReject,
  onCancel,
  canCancel,
  actionLabel,
}: {
  items: LeaveRequest[];
  onApprove?: (r: LeaveRequest, comment?: string) => void;
  onReject?: (r: LeaveRequest, comment?: string) => void;
  onCancel?: (r: LeaveRequest) => void;
  canCancel?: boolean;
  actionLabel?: string;
}) {
  const [comments, setComments] = useState<Record<string, string>>({});
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">Aucune demande.</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  Du {format(new Date(r.start_date), "dd MMM yyyy", { locale: fr })}{" "}
                  au {format(new Date(r.end_date), "dd MMM yyyy", { locale: fr })}
                </p>
                <p className="text-sm text-muted-foreground">{r.working_days} jour(s) ouvrable(s)</p>
                {r.reason && <p className="text-sm mt-1">{r.reason}</p>}
              </div>
              <Badge variant={statusMeta[r.status].variant}>{statusMeta[r.status].label}</Badge>
            </div>
            {r.chef_comment && <p className="text-xs text-muted-foreground">Chef : {r.chef_comment}</p>}
            {r.admin_comment && <p className="text-xs text-muted-foreground">Admin : {r.admin_comment}</p>}

            {(onApprove || onReject) && (
              <div className="space-y-2">
                <Textarea
                  rows={2}
                  placeholder="Commentaire (optionnel)"
                  value={comments[r.id] ?? ""}
                  onChange={(e) => setComments({ ...comments, [r.id]: e.target.value })}
                />
                <div className="flex flex-wrap gap-2">
                  {onApprove && (
                    <Button size="sm" onClick={() => onApprove(r, comments[r.id])}>
                      <Check className="w-4 h-4 mr-1" /> {actionLabel ?? "Approuver"}
                    </Button>
                  )}
                  {onReject && (
                    <Button size="sm" variant="destructive" onClick={() => onReject(r, comments[r.id])}>
                      <X className="w-4 h-4 mr-1" /> Rejeter
                    </Button>
                  )}
                </div>
              </div>
            )}

            {canCancel && (r.status === "pending_chef" || r.status === "pending_admin") && (
              <Button size="sm" variant="outline" onClick={() => onCancel?.(r)}>
                Annuler ma demande
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
