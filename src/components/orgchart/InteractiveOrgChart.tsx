import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OrgChartNode, OrgMember } from './OrgChartNode';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, ZoomIn, ZoomOut, Maximize2, Users, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  photo_url?: string;
  fonction?: string;
  manager_id?: string;
  last_status?: string;
  grades?: {
    label: string;
    rank_order: number;
  };
}

export function InteractiveOrgChart() {
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(100);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Fetch all profiles with their grades
  const { data: profiles, isLoading } = useQuery({
    queryKey: ['org-chart-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          nom,
          prenom,
          email,
          telephone,
          photo_url,
          fonction,
          manager_id,
          last_status,
          grades:grade_id (
            label,
            rank_order
          )
        `)
        .eq('account_status', 'active')
        .order('nom');

      if (error) throw error;
      return data as Profile[];
    },
  });

  // Build hierarchical structure
  const orgStructure = useMemo(() => {
    if (!profiles || profiles.length === 0) return null;

    // Map profiles to OrgMember format
    const membersMap = new Map<string, OrgMember>();
    
    profiles.forEach((profile) => {
      const status = profile.last_status === 'connecte' ? 'active' 
        : profile.last_status === 'pause' || profile.last_status === 'reunion' ? 'remote'
        : 'absent';

      membersMap.set(profile.id, {
        id: profile.id,
        nom: profile.nom,
        prenom: profile.prenom,
        email: profile.email,
        telephone: profile.telephone || undefined,
        photo_url: profile.photo_url || undefined,
        fonction: profile.fonction || undefined,
        grade_label: profile.grades?.label,
        status,
        team_members: [],
      });
    });

    // Build hierarchy
    const rootMembers: OrgMember[] = [];
    
    profiles.forEach((profile) => {
      const member = membersMap.get(profile.id)!;
      
      if (profile.manager_id && membersMap.has(profile.manager_id)) {
        const manager = membersMap.get(profile.manager_id)!;
        if (!manager.team_members) manager.team_members = [];
        manager.team_members.push(member);
      } else {
        // No manager or manager not found = root level
        rootMembers.push(member);
      }
    });

    // Sort root members by grade rank (highest first)
    rootMembers.sort((a, b) => {
      const gradeA = profiles.find(p => p.id === a.id)?.grades?.rank_order ?? 999;
      const gradeB = profiles.find(p => p.id === b.id)?.grades?.rank_order ?? 999;
      return gradeA - gradeB;
    });

    // If we have a clear leader, use them as root
    if (rootMembers.length > 0) {
      // Take the highest ranked person as the organization head
      const head = rootMembers[0];
      // Put other root members as their team if they have no other head
      if (rootMembers.length > 1) {
        head.team_members = [...(head.team_members || []), ...rootMembers.slice(1)];
        return head;
      }
      return head;
    }

    // Fallback: return first member
    return membersMap.values().next().value || null;
  }, [profiles]);

  // Filter members based on search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !profiles) return [];
    
    const query = searchQuery.toLowerCase();
    return profiles.filter(p => 
      p.nom.toLowerCase().includes(query) ||
      p.prenom.toLowerCase().includes(query) ||
      p.email.toLowerCase().includes(query) ||
      p.fonction?.toLowerCase().includes(query)
    );
  }, [searchQuery, profiles]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const handleResetZoom = () => setZoom(100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-card rounded-xl border border-border/50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement de l'organigramme...</p>
        </div>
      </div>
    );
  }

  if (!orgStructure) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-card rounded-xl border border-border/50">
        <Users className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Aucun organigramme disponible</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Ajoutez des membres et définissez leurs managers pour visualiser la structure organisationnelle.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      {/* Header with controls */}
      <div className="p-4 border-b border-border/50 bg-muted/30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Organigramme Interactif</h3>
              <p className="text-sm text-muted-foreground">
                {profiles?.length || 0} membres • Cliquez pour développer/réduire
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un membre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-background rounded-lg border p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium w-10 text-center">{zoom}%</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleResetZoom}>
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Search results dropdown */}
        {searchQuery && searchResults.length > 0 && (
          <div className="mt-3 p-2 bg-background rounded-lg border max-h-48 overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-2">{searchResults.length} résultat(s)</p>
            <div className="space-y-1">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
                  onClick={() => {
                    setHighlightedId(result.id);
                    setSearchQuery('');
                    // Scroll to element logic could be added here
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {result.prenom?.charAt(0)}{result.nom?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{result.prenom} {result.nom}</p>
                    <p className="text-xs text-muted-foreground">{result.fonction || result.grades?.label || 'Membre'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Org Chart Canvas */}
      <div className="p-8 overflow-auto min-h-[500px] bg-gradient-to-br from-background via-muted/20 to-background">
        <div 
          className="flex justify-center transition-transform duration-300"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
        >
          <OrgChartNode member={orgStructure} />
        </div>
      </div>
      
      {/* Legend */}
      <div className="p-4 border-t border-border/50 bg-muted/30">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-muted-foreground">Présent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-info" />
            <span className="text-muted-foreground">Télétravail</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Absent</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Nombre de subordonnés</span>
          </div>
        </div>
      </div>
    </div>
  );
}
