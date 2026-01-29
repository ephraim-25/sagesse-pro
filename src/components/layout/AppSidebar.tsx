import { 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  ListTodo, 
  BarChart3, 
  Settings, 
  Shield,
  Calendar,
  Laptop,
  FileText,
  Building2,
  Crown,
  UserCog,
  Clock,
  Target,
  UserPlus,
  ClipboardList
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

export function AppSidebar() {
  const { isAdmin, isPresident, isChefService, hasRole, profile } = useAuth();
  
  // Determine user's primary role for display
  const getUserRoleLabel = () => {
    if (isAdmin) return { label: "Administrateur", variant: "destructive" as const };
    if (hasRole('president')) return { label: "Président", variant: "default" as const };
    if (hasRole('chef_service')) return { label: "Chef de Bureau", variant: "secondary" as const };
    return { label: "Agent", variant: "outline" as const };
  };

  const roleInfo = getUserRoleLabel();

  // Check if user can access settings (only admin - strictest access)
  const canAccessSettings = isAdmin;

  // Navigation items for agents (simple space)
  const agentNavItems = [
    { title: "Mon Tableau de bord", url: "/agent", icon: LayoutDashboard },
    { title: "Mes Tâches", url: "/taches", icon: ListTodo },
  ];

  // Navigation items for Chef de Bureau - specific "Mon Bureau" section
  const bureauChefItems = [
    { title: "Pilotage du Bureau", url: "/mon-bureau", icon: Building2 },
    { title: "Affectation des Agents", url: "/mon-bureau?tab=available", icon: UserPlus },
    { title: "Assigner une Tâche", url: "/mon-bureau?tab=tasks", icon: ClipboardList },
  ];

  // Presence items for agents
  const agentPresenceItems = [
    { title: "Mon Pointage", url: "/checkin", icon: ClipboardCheck },
    { title: "Télétravail", url: "/teletravail", icon: Laptop },
    { title: "Mon Historique", url: "/historique", icon: Calendar },
  ];

  // Items for chef de division (supervision)
  const chefDivisionItems = [
    { title: "Supervision Division", url: "/division", icon: UserCog },
    { title: "Compétences", url: "/competences", icon: Target },
  ];

  // President-specific items (strategic view)
  const presidentItems = [
    { title: "Dashboard Stratégique", url: "/president", icon: Crown },
    { title: "Statistiques Globales", url: "/stats", icon: BarChart3 },
    { title: "Rapports & Audit", url: "/rapports", icon: FileText },
  ];

  // Admin-specific items
  const adminItems = [
    { title: "Administration", url: "/admin", icon: Shield },
    { title: "Gestion Équipes", url: "/equipes", icon: UserCog },
    { title: "Tous les Membres", url: "/membres", icon: Users },
  ];

  // Admin-only security items
  const adminSettingsItems = [
    { title: "Sécurité", url: "/securite", icon: Shield },
  ];

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center">
            <Building2 className="w-5 h-5 text-accent-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-sidebar-foreground text-sm">SIGC-CSN</h1>
            <p className="text-xs text-sidebar-foreground/60">Conseil Scientifique</p>
          </div>
        </div>
        {profile && (
          <div className="mt-3 pt-3 border-t border-sidebar-border/50">
            <p className="text-xs text-sidebar-foreground/80 truncate">{profile.prenom} {profile.nom}</p>
            <Badge variant={roleInfo.variant} className="mt-1 text-[10px]">
              {roleInfo.label}
            </Badge>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {/* Chef de Bureau specific section - replaces "Mon Espace" */}
        {isChefService && !isAdmin && !isPresident && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider px-3 mb-2">
              <Building2 className="w-3 h-3 inline mr-1" />
              Mon Bureau
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {bureauChefItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Agent Section - Visible to agents only (not chef de bureau) */}
        {!isChefService && !isAdmin && !isPresident && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider px-3 mb-2">
              Mon Espace
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {agentNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end={item.url === "/"} 
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Presence Section - Visible to all */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider px-3 mb-2 mt-4">
            <Clock className="w-3 h-3 inline mr-1" />
            Présence
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {agentPresenceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="text-sm">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Chef de Division Section - additional supervision items */}
        {isChefService && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider px-3 mb-2 mt-4">
              <UserCog className="w-3 h-3 inline mr-1" />
              Supervision
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {chefDivisionItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* President Section */}
        {isPresident && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider px-3 mb-2 mt-4">
              <Crown className="w-3 h-3 inline mr-1" />
              Vision Stratégique
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {presidentItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin Section */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider px-3 mb-2 mt-4">
              <Shield className="w-3 h-3 inline mr-1" />
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer with settings - Only for Admin and President */}
      {canAccessSettings && (
        <SidebarFooter className="p-2 border-t border-sidebar-border">
          <SidebarMenu>
            {/* Admin-only security */}
            {isAdmin && adminSettingsItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to={item.url}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm">{item.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            
            {/* Settings for Admin and President only */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink 
                  to="/parametres"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Paramètres</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}