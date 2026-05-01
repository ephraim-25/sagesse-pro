import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Send, Check, X, Eye, FileDown, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHolidays } from "@/hooks/useHolidays";
import { countWorkingDays } from "@/lib/workingDays";
import { toast } from "sonner";
import { sendNotification, notifyAdmins } from "@/lib/notifications";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { LeaveCalendar } from "@/components/leaves/LeaveCalendar";
import { LeaveDetailsDialog, type LeaveDetail } from "@/components/leaves/LeaveDetailsDialog";
import { exportLeavesPdf } from "@/lib/leavesPdf";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type LeaveStatus = LeaveDetail["status"];
type LeaveRequest = LeaveDetail;

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
  const [details, setDetails] = useState<LeaveDetail | null>(null);

  // Période d'export (admin/président)
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const [exportStart, setExportStart] = useState(firstOfMonth);
  const [exportEnd, setExportEnd] = useState(today.toISOString().slice(0, 10));

  const workingDaysSelected = useMemo(() => {
    if (!start || !end) return 0;
    return countWorkingDays(new Date(start), new Date(end), holidays);
  }, [start, end, holidays]);

  const fetchAll = async () => {
    if (!profile) return;
    const { data: own } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    setMine((own ?? []) as unknown as LeaveRequest[]);

    if (isChefService || isAdmin || isPresident) {
      const { data: all } = await supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false });
      setToReview((all ?? []) as unknown as LeaveRequest[]);
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

  // Sélection via clic calendrier
  const handlePickDate = (iso: string) => {
    if (!start || (start && end)) {
      setStart(iso); setEnd("");
    } else if (new Date(iso) < new Date(start)) {
      setStart(iso);
    } else {
      setEnd(iso);
    }
  };

  // Détecte un chevauchement avec les demandes actives (non rejetées/annulées) de l'agent
  const overlapsWithExisting = (s: string, e: string) => {
    return mine.find(
      (r) =>
        r.status !== "rejected" &&
        r.status !== "cancelled" &&
        r.start_date <= e &&
        r.end_date >= s
    );
  };

  // Liste exhaustive des chevauchements (pour l'aperçu) + nombre de jours ouvrables en conflit
  const overlapPreview = useMemo(() => {
    if (!start || !end || new Date(end) < new Date(start)) {
      return { conflicts: [] as Array<{ req: LeaveRequest; overlapDays: number; from: string; to: string }> };
    }
    const conflicts = mine
      .filter((r) => r.status !== "rejected" && r.status !== "cancelled")
      .filter((r) => r.start_date <= end && r.end_date >= start)
      .map((r) => {
        const from = r.start_date > start ? r.start_date : start;
        const to = r.end_date < end ? r.end_date : end;
        return {
          req: r,
          from,
          to,
          overlapDays: countWorkingDays(new Date(from), new Date(to), holidays),
        };
      });
    return { conflicts };
  }, [start, end, mine, holidays]);

  const handleSubmit = async () => {
    if (!profile || !start || !end) return;
    if (new Date(end) < new Date(start)) {
      toast.error("La date de fin doit être après la date de début.");
      return;
    }
    if (workingDaysSelected <= 0) {
      toast.error("La période sélectionnée ne contient aucun jour ouvrable (week-ends et fériés RDC exclus).");
      return;
    }
    if (workingDaysSelected > 22) {
      toast.error("Le congé annuel est limité à 22 jours ouvrables (1 mois).");
      return;
    }
    const conflict = overlapsWithExisting(start, end);
    if (conflict) {
      toast.error(
        `Chevauchement détecté avec une demande existante (${format(new Date(conflict.start_date), "dd/MM/yyyy")} → ${format(new Date(conflict.end_date), "dd/MM/yyyy")}, ${statusMeta[conflict.status].label}). Veuillez choisir une autre période.`
      );
      return;
    }
    setSubmitting(true);
    const { data: inserted, error } = await supabase
      .from("leave_requests")
      .insert({
        user_id: profile.id,
        start_date: start,
        end_date: end,
        working_days: workingDaysSelected,
        reason: reason || null,
        status: "pending_chef",
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    toast.success("Demande envoyée à votre chef de bureau.");
    setStart(""); setEnd(""); setReason("");

    const periodLabel = `du ${format(new Date(start), "dd/MM/yyyy")} au ${format(new Date(end), "dd/MM/yyyy")}`;

    if (profile.manager_id) {
      await sendNotification({
        user_id: profile.manager_id,
        title: "Nouvelle demande de congé",
        body: `${profile.prenom} ${profile.nom} demande ${workingDaysSelected} jour(s) ouvrable(s) ${periodLabel}.`,
        type: "approval_request",
        meta: { link: "/conges", leave_id: inserted?.id },
      });
    }

    // Notif systématique aux admins (transparence totale, tous bureaux/services)
    await notifyAdmins({
      title: "Nouvelle demande de congé soumise",
      body: `${profile.prenom} ${profile.nom} — ${workingDaysSelected} jour(s) ouvrable(s) ${periodLabel}.`,
      type: "admin_alert",
      meta: { link: "/conges", leave_id: inserted?.id },
    });
  };

  const cancelOwn = async (req: LeaveRequest) => {
    if (!profile) return;
    const { error } = await supabase
      .from("leave_requests")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", req.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Demande annulée.");

    const periodLabel = `du ${format(new Date(req.start_date), "dd/MM/yyyy")} au ${format(new Date(req.end_date), "dd/MM/yyyy")}`;

    // Notif chef de bureau
    if (profile.manager_id) {
      await sendNotification({
        user_id: profile.manager_id,
        title: "Demande de congé annulée",
        body: `${profile.prenom} ${profile.nom} a annulé sa demande ${periodLabel}.`,
        type: "approval_decision",
        meta: { link: "/conges", leave_id: req.id },
      });
    }
    // Notif admins
    await notifyAdmins({
      title: "Demande de congé annulée",
      body: `${profile.prenom} ${profile.nom} a annulé sa demande ${periodLabel}.`,
      type: "admin_alert",
      meta: { link: "/conges", leave_id: req.id },
    });
  };

  const decideAsChef = async (req: LeaveRequest, approve: boolean, comment?: string) => {
    if (!profile) return;
    const newStatus: LeaveStatus = approve ? "pending_admin" : "rejected";
    const { error } = await supabase
      .from("leave_requests")
      .update({
        status: newStatus,
        chef_id: profile.id,
        chef_decided_at: new Date().toISOString(),
        chef_comment: comment ?? null,
      })
      .eq("id", req.id);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "Transmis à l'administration." : "Demande rejetée.");

    // Notif agent
    await sendNotification({
      user_id: req.user_id,
      title: approve ? "Congé transmis à l'Administration" : "Congé rejeté par votre chef",
      body: approve
        ? `Votre demande du ${format(new Date(req.start_date), "dd/MM")} au ${format(new Date(req.end_date), "dd/MM")} attend la validation finale.`
        : (comment || "Demande rejetée."),
      type: "approval_decision",
      meta: { link: "/conges", leave_id: req.id },
    });

    // Notif admins systématique (transparence totale)
    await notifyAdmins({
      title: approve
        ? "Congé à valider (Administration)"
        : "Congé rejeté par le Chef de Bureau",
      body: approve
        ? `Validation finale requise pour ${req.working_days} jour(s) ouvrable(s).`
        : `Le chef a rejeté la demande${comment ? ` : « ${comment} »` : "."}`,
      type: approve ? "approval_request" : "admin_alert",
      meta: { link: "/conges", leave_id: req.id },
    });
  };

  const decideAsAdmin = async (req: LeaveRequest, approve: boolean, comment?: string) => {
    if (!profile) return;
    const newStatus: LeaveStatus = approve ? "approved" : "rejected";
    const { error } = await supabase
      .from("leave_requests")
      .update({
        status: newStatus,
        admin_id: profile.id,
        admin_decided_at: new Date().toISOString(),
        admin_comment: comment ?? null,
      })
      .eq("id", req.id);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "Congé approuvé." : "Congé rejeté.");

    // Notif agent (décision finale)
    await sendNotification({
      user_id: req.user_id,
      title: approve ? "✅ Congé approuvé" : "❌ Congé rejeté",
      body: comment || (approve
        ? `Votre congé du ${format(new Date(req.start_date), "dd/MM/yyyy")} au ${format(new Date(req.end_date), "dd/MM/yyyy")} est validé.`
        : "Demande non retenue par l'administration."),
      type: "approval_decision",
      meta: { link: "/conges", leave_id: req.id },
    });

    // Notif chef pour info
    if (req.chef_id) {
      await sendNotification({
        user_id: req.chef_id,
        title: approve ? "Congé validé par l'Administration" : "Congé rejeté par l'Administration",
        body: `Décision finale appliquée à la demande que vous aviez transmise.`,
        type: "approval_decision",
        meta: { link: "/conges", leave_id: req.id },
      });
    }
  };


  const handleExport = async () => {
    if (!exportStart || !exportEnd) return;
    // Filtre par période (chevauchement [start_date, end_date] ↔ [exportStart, exportEnd])
    const filtered = toReview.filter(
      (r) => r.start_date <= exportEnd && r.end_date >= exportStart
    );
    if (!filtered.length) {
      toast.warning("Aucune demande sur cette période.");
      return;
    }
    // Récupère les noms d'agents
    const ids = Array.from(new Set(filtered.map((r) => r.user_id)));
    const { data: profs } = await supabase.from("profiles").select("id, prenom, nom").in("id", ids);
    const nameMap = new Map((profs ?? []).map((p) => [p.id, `${p.prenom} ${p.nom}`]));
    exportLeavesPdf(
      filtered.map((r) => ({ ...r, user_name: nameMap.get(r.user_id) ?? "—" })),
      exportStart,
      exportEnd
    );
    toast.success("Rapport PDF généré.");
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
            Demandez votre congé annuel (1 mois max, jours ouvrables — lundi à vendredi, hors fériés RDC).
          </p>
        </div>

        <Tabs defaultValue="request" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
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
            {(isAdmin || isPresident) && <TabsTrigger value="export">Rapport PDF</TabsTrigger>}
          </TabsList>

          <TabsContent value="request">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" /> Demander un congé
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
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
                      Jours ouvrables comptés (recalcul automatique) :{" "}
                      <strong>{workingDaysSelected}</strong> / 22
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Motif (optionnel)</label>
                      <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Précisez le motif..." />
                    </div>
                    <Button onClick={handleSubmit} disabled={submitting || !start || !end} className="w-full sm:w-auto">
                      <Send className="w-4 h-4 mr-2" />
                      {submitting ? "Envoi..." : "Envoyer la demande"}
                    </Button>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Aperçu calendrier</p>
                    <LeaveCalendar
                      holidays={holidays}
                      startDate={start}
                      endDate={end}
                      onPickDate={handlePickDate}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Cliquez sur une date pour définir le début, puis une seconde pour la fin.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mine">
            <LeaveList items={mine} onCancel={cancelOwn} canCancel onView={setDetails} />
          </TabsContent>

          {(isChefService || isAdmin || isPresident) && (
            <TabsContent value="chef">
              <LeaveList
                items={pendingChef}
                onApprove={(r, c) => decideAsChef(r, true, c)}
                onReject={(r, c) => decideAsChef(r, false, c)}
                actionLabel="Transmettre à l'admin"
                onView={setDetails}
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
                onView={setDetails}
              />
            </TabsContent>
          )}

          {(isAdmin || isPresident) && (
            <TabsContent value="export">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileDown className="w-5 h-5" /> Rapport PDF des congés
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 max-w-xl">
                  <p className="text-sm text-muted-foreground">
                    Génère un récapitulatif institutionnel A4 paysage de toutes les demandes
                    chevauchant la période choisie.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Du</label>
                      <Input type="date" value={exportStart} onChange={(e) => setExportStart(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Au</label>
                      <Input type="date" value={exportEnd} onChange={(e) => setExportEnd(e.target.value)} />
                    </div>
                  </div>
                  <Button onClick={handleExport} disabled={!exportStart || !exportEnd}>
                    <FileDown className="w-4 h-4 mr-2" /> Télécharger le PDF
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <LeaveDetailsDialog
          open={!!details}
          onOpenChange={(v) => !v && setDetails(null)}
          leave={details}
        />
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
  onView,
}: {
  items: LeaveRequest[];
  onApprove?: (r: LeaveRequest, comment?: string) => void;
  onReject?: (r: LeaveRequest, comment?: string) => void;
  onCancel?: (r: LeaveRequest) => void;
  canCancel?: boolean;
  actionLabel?: string;
  onView?: (r: LeaveRequest) => void;
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
              <div className="flex items-center gap-2">
                <Badge variant={statusMeta[r.status].variant}>{statusMeta[r.status].label}</Badge>
                {onView && (
                  <Button size="sm" variant="ghost" onClick={() => onView(r)}>
                    <Eye className="w-4 h-4 mr-1" /> Détails
                  </Button>
                )}
              </div>
            </div>

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
