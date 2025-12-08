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
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const members = [
  { 
    id: 1, 
    name: "Marie Dupont", 
    email: "marie.dupont@csn.gov", 
    phone: "+33 1 23 45 67 89",
    department: "Recherche", 
    role: "Directrice de Recherche",
    level: "Expert",
    status: "present",
    avatar: "MD"
  },
  { 
    id: 2, 
    name: "Jean Martin", 
    email: "jean.martin@csn.gov", 
    phone: "+33 1 23 45 67 90",
    department: "IT", 
    role: "Ingénieur Senior",
    level: "Expert",
    status: "remote",
    avatar: "JM"
  },
  { 
    id: 3, 
    name: "Sophie Bernard", 
    email: "sophie.bernard@csn.gov", 
    phone: "+33 1 23 45 67 91",
    department: "Communication", 
    role: "Chargée de Communication",
    level: "Intermédiaire",
    status: "present",
    avatar: "SB"
  },
  { 
    id: 4, 
    name: "Pierre Durand", 
    email: "pierre.durand@csn.gov", 
    phone: "+33 1 23 45 67 92",
    department: "Finance", 
    role: "Comptable",
    level: "Intermédiaire",
    status: "absent",
    avatar: "PD"
  },
  { 
    id: 5, 
    name: "Claire Moreau", 
    email: "claire.moreau@csn.gov", 
    phone: "+33 1 23 45 67 93",
    department: "Administration", 
    role: "Assistante Administrative",
    level: "Junior",
    status: "present",
    avatar: "CM"
  },
];

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

  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <div 
              key={member.id}
              className="bg-card rounded-xl p-5 shadow-soft border border-border/50 hover:shadow-card transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {member.avatar}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
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
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{member.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <span>{member.department}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-muted-foreground" />
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    levelColors[member.level as keyof typeof levelColors]
                  )}>
                    {member.level}
                  </span>
                </div>
                <span className={cn(
                  "status-badge",
                  statusConfig[member.status as keyof typeof statusConfig].class
                )}>
                  {statusConfig[member.status as keyof typeof statusConfig].label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Members;
