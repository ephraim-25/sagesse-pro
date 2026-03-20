import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TaskChat } from "./TaskChat";
import { TaskDocuments } from "./TaskDocuments";
import { MessageCircle, FileText, Info, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tache } from "@/hooks/useData";

const priorityConfig = {
  faible: { color: "text-muted-foreground", bg: "bg-muted", label: "Basse" },
  moyen: { color: "text-warning", bg: "bg-warning/10", label: "Moyenne" },
  eleve: { color: "text-orange-500", bg: "bg-orange-500/10", label: "Élevée" },
  urgente: { color: "text-destructive", bg: "bg-destructive/10", label: "Urgente" },
};

const statusConfig = {
  termine: { label: "Terminée", class: "bg-success/10 text-success" },
  en_cours: { label: "En cours", class: "bg-info/10 text-info" },
  a_faire: { label: "À faire", class: "bg-muted text-muted-foreground" },
  en_pause: { label: "En pause", class: "bg-warning/10 text-warning" },
};

interface TaskDetailDialogProps {
  task: Tache | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unreadCount?: number;
}

export function TaskDetailDialog({ task, open, onOpenChange, unreadCount = 0 }: TaskDetailDialogProps) {
  if (!task) return null;

  const priority = priorityConfig[task.priorite];
  const status = statusConfig[task.statut];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg pr-6">{task.titre}</DialogTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priority.bg, priority.color)}>
              {priority.label}
            </span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", status.class)}>
              {status.label}
            </span>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="info" className="gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Détails
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-1.5 relative">
              <MessageCircle className="w-3.5 h-3.5" />
              Discussion
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="flex-1 overflow-y-auto space-y-4 mt-4">
            {task.description && (
              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{task.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">Assigné à</p>
                  <p className="font-medium">
                    {task.assigned_profile
                      ? `${task.assigned_profile.prenom} ${task.assigned_profile.nom}`
                      : "Non assigné"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">Créé par</p>
                  <p className="font-medium">
                    {task.creator_profile
                      ? `${task.creator_profile.prenom} ${task.creator_profile.nom}`
                      : "Inconnu"}
                  </p>
                </div>
              </div>
              {task.date_limite && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Date limite</p>
                    <p className="font-medium">
                      {new Date(task.date_limite).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 min-h-0 mt-4">
            <TaskChat
              taskId={task.id}
              taskCreatorId={task.created_by}
              taskAssignedTo={task.assigned_to}
            />
          </TabsContent>

          <TabsContent value="docs" className="flex-1 overflow-y-auto mt-4">
            {task.documents_lies && task.documents_lies.length > 0 ? (
              <TaskDocuments documents={task.documents_lies} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun document attaché
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
