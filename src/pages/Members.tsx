import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  Award,
  QrCode,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProfiles, usePresences, useTodayTeletravail, type Profile } from "@/hooks/useData";
import { MemberQRCode } from "@/components/qrcode/MemberQRCode";

const levelColors = {
  Expert: "bg-accent/10 text-accent",
  Intermédiaire: "bg-info/10 text-info",
  Junior: "bg-muted text-muted-foreground",
};

const statusConfig = {
  present: { label: "Présent", class: "status-present" },
  absent: { label: "Absent", class: "status-absent" },
  remote: { label: "Télétravail", class: "status-remote" },
};

const Members = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);

  const { data: profiles, isLoading: loadingProfiles } = useProfiles();
  const { data: presences } = usePresences(new Date().toISOString().split('T')[0]);

  // Get member status based on today's presence
  const getMemberStatus = (memberId: string): 'present' | 'absent' | 'remote' => {
    const presence = presences?.find(p => p.user_id === memberId);
    if (presence?.heure_entree && !presence?.heure_sortie) {
      return presence.type === 'teletravail' ? 'remote' : 'present';
    }
    return 'absent';
  };

  const filteredMembers = profiles?.filter(member => 
    member.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.service?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.fonction?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getInitials = (profile: Profile) => {
    return `${profile.prenom.charAt(0)}${profile.nom.charAt(0)}`.toUpperCase();
  };

  const handleShowQR = (member: Profile) => {
    setSelectedMember(member);
    setShowQRDialog(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">Gestion des Membres</h1>
            <p className="page-description">Gérez les membres du Conseil Scientifique</p>
          </div>
          <Button className="w-fit">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un membre
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par nom, département, rôle..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtres
          </Button>
        </div>

        {/* Members Grid */}
        {loadingProfiles ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMembers.map((member) => {
              const status = getMemberStatus(member.id);
              return (
                <div 
                  key={member.id}
                  className="bg-card rounded-xl p-5 shadow-soft border border-border/50 hover:shadow-card transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {member.photo_url ? (
                        <img 
                          src={member.photo_url} 
                          alt={`${member.prenom} ${member.nom}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {getInitials(member)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {member.prenom} {member.nom}
                        </h3>
                        <p className="text-sm text-muted-foreground">{member.fonction || 'Non défini'}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Voir le profil</DropdownMenuItem>
                        <DropdownMenuItem>Modifier</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShowQR(member)}>
                          <QrCode className="w-4 h-4 mr-2" />
                          Afficher QR Code
                        </DropdownMenuItem>
                        <DropdownMenuItem>Assigner une tâche</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    {member.telephone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{member.telephone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      <span>{member.service || 'Non assigné'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-muted-foreground" />
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        member.statut === 'actif' ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      )}>
                        {member.statut === 'actif' ? 'Actif' : 'Suspendu'}
                      </span>
                    </div>
                    <span className={cn(
                      "status-badge",
                      statusConfig[status].class
                    )}>
                      {statusConfig[status].label}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredMembers.length === 0 && !loadingProfiles && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <p>Aucun membre trouvé</p>
              </div>
            )}
          </div>
        )}

        {/* QR Code Dialog */}
        <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>QR Code du Membre</DialogTitle>
            </DialogHeader>
            {selectedMember && (
              <MemberQRCode 
                memberId={selectedMember.id}
                memberName={`${selectedMember.prenom} ${selectedMember.nom}`}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Members;
