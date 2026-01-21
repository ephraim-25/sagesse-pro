import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  UserPlus, 
  UserCheck, 
  FileText, 
  ArrowRight,
  Clock,
  Loader2,
  Activity
} from "lucide-react";
import { usePersonnelMovements } from "@/hooks/useHierarchy";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const getActionIcon = (action: string) => {
  switch (action) {
    case 'affectation':
    case 'INSERT':
      return <UserPlus className="w-4 h-4 text-success" />;
    case 'modification':
    case 'UPDATE':
      return <UserCheck className="w-4 h-4 text-info" />;
    case 'tache_assignee':
      return <FileText className="w-4 h-4 text-primary" />;
    default:
      return <Activity className="w-4 h-4 text-muted-foreground" />;
  }
};

const getActionLabel = (action: string, table: string) => {
  if (table === 'profiles') {
    if (action === 'UPDATE') return 'Modification de profil';
    if (action === 'INSERT') return 'Nouveau membre';
    return 'Mouvement personnel';
  }
  if (table === 'taches') {
    if (action === 'INSERT') return 'Nouvelle tâche assignée';
    if (action === 'UPDATE') return 'Tâche mise à jour';
    return 'Activité tâche';
  }
  return action;
};

const PersonnelMovements = () => {
  const { data: movements, isLoading } = usePersonnelMovements();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-5 h-5 text-primary" />
            Mouvement du Personnel
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="w-5 h-5 text-primary" />
          Mouvement du Personnel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {movements?.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Aucun mouvement récent
            </p>
          ) : (
            movements?.map((movement) => {
              const user = movement.user as any;
              const newValue = movement.nouvelle_valeur as any;
              const oldValue = movement.ancienne_valeur as any;
              
              return (
                <div 
                  key={movement.id} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shrink-0">
                    {getActionIcon(movement.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {getActionLabel(movement.action, movement.table_cible || '')}
                      </Badge>
                      {user && (
                        <span className="text-sm font-medium">
                          {user.prenom} {user.nom}
                        </span>
                      )}
                    </div>
                    
                    {/* Show relevant changes */}
                    {movement.table_cible === 'profiles' && newValue?.manager_id && !oldValue?.manager_id && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Agent affecté à un nouveau bureau
                      </p>
                    )}
                    
                    {movement.table_cible === 'taches' && newValue?.titre && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        "{newValue.titre}"
                      </p>
                    )}
                    
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(movement.created_at), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonnelMovements;
