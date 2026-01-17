import { useState } from 'react';
import { ChevronDown, ChevronRight, Users, User, Briefcase, Mail, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

export interface OrgMember {
  id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  photo_url?: string;
  fonction?: string;
  grade_label?: string;
  status?: 'active' | 'remote' | 'absent';
  team_members?: OrgMember[];
}

interface OrgChartNodeProps {
  member: OrgMember;
  level?: number;
  isExpanded?: boolean;
  onToggle?: (id: string) => void;
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'active':
      return 'bg-success';
    case 'remote':
      return 'bg-info';
    case 'absent':
      return 'bg-destructive';
    default:
      return 'bg-muted-foreground';
  }
};

const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'active':
      return 'Présent';
    case 'remote':
      return 'Télétravail';
    case 'absent':
      return 'Absent';
    default:
      return 'Inconnu';
  }
};

export function OrgChartNode({ member, level = 0, isExpanded = true, onToggle }: OrgChartNodeProps) {
  const hasChildren = member.team_members && member.team_members.length > 0;
  const [expanded, setExpanded] = useState(isExpanded);
  
  const initials = `${member.prenom?.charAt(0) || ''}${member.nom?.charAt(0) || ''}`.toUpperCase();
  
  const handleToggle = () => {
    setExpanded(!expanded);
    onToggle?.(member.id);
  };

  // Card color based on level
  const getCardStyle = () => {
    if (level === 0) return 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 shadow-lg';
    if (level === 1) return 'bg-gradient-to-br from-accent/10 to-accent/5 border-accent/30';
    return 'bg-card border-border/50';
  };

  return (
    <div className="flex flex-col items-center">
      <HoverCard openDelay={300}>
        <HoverCardTrigger asChild>
          <div
            className={cn(
              'relative p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl',
              getCardStyle(),
              level === 0 ? 'min-w-[280px]' : 'min-w-[220px]'
            )}
            onClick={hasChildren ? handleToggle : undefined}
          >
            {/* Status indicator */}
            <div className={cn(
              'absolute top-3 right-3 w-3 h-3 rounded-full ring-2 ring-card',
              getStatusColor(member.status)
            )} />
            
            <div className="flex items-center gap-3">
              <Avatar className={cn('border-2 border-background shadow-sm', level === 0 ? 'h-14 w-14' : 'h-12 w-12')}>
                <AvatarImage src={member.photo_url || ''} alt={`${member.prenom} ${member.nom}`} />
                <AvatarFallback className={cn(
                  level === 0 ? 'bg-primary text-primary-foreground text-lg font-bold' :
                  level === 1 ? 'bg-accent text-accent-foreground' : 'bg-muted'
                )}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  'font-semibold truncate text-foreground',
                  level === 0 ? 'text-base' : 'text-sm'
                )}>
                  {member.prenom} {member.nom}
                </h4>
                {member.fonction && (
                  <p className="text-xs text-muted-foreground truncate">{member.fonction}</p>
                )}
                {member.grade_label && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {member.grade_label}
                  </Badge>
                )}
              </div>
              
              {hasChildren && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-medium">{member.team_members?.length}</span>
                  {expanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
              )}
            </div>
          </div>
        </HoverCardTrigger>
        
        <HoverCardContent className="w-80 p-4" side="right">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-border">
              <AvatarImage src={member.photo_url || ''} />
              <AvatarFallback className="text-lg bg-primary/10">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div>
                <h4 className="font-semibold text-foreground">{member.prenom} {member.nom}</h4>
                {member.fonction && <p className="text-sm text-muted-foreground">{member.fonction}</p>}
              </div>
              
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', getStatusColor(member.status))} />
                <span className="text-xs text-muted-foreground">{getStatusLabel(member.status)}</span>
              </div>
              
              <div className="space-y-1 pt-2 border-t">
                {member.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{member.email}</span>
                  </div>
                )}
                {member.telephone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    <span>{member.telephone}</span>
                  </div>
                )}
                {member.grade_label && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Briefcase className="w-3 h-3" />
                    <span>{member.grade_label}</span>
                  </div>
                )}
              </div>
              
              {hasChildren && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {member.team_members?.length} membres dans l'équipe
                  </p>
                </div>
              )}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
      
      {/* Children connector and nodes */}
      {hasChildren && expanded && (
        <div className="flex flex-col items-center mt-4">
          {/* Vertical line */}
          <div className="w-0.5 h-6 bg-border" />
          
          {/* Horizontal connector line */}
          {member.team_members && member.team_members.length > 1 && (
            <div className="relative w-full flex justify-center">
              <div 
                className="h-0.5 bg-border" 
                style={{ 
                  width: `${Math.min(member.team_members.length - 1, 4) * 280}px`,
                  maxWidth: '100%'
                }} 
              />
            </div>
          )}
          
          {/* Children nodes */}
          <div className="flex flex-wrap justify-center gap-8 pt-4">
            {member.team_members?.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                {member.team_members && member.team_members.length > 1 && (
                  <div className="w-0.5 h-4 bg-border -mt-4" />
                )}
                <OrgChartNode member={child} level={level + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
