import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserProfile {
  id: string;
  nom: string;
  prenom: string;
  postnom: string | null;
  email: string;
  telephone: string | null;
  fonction: string | null;
  service: string | null;
  direction: string | null;
  lieu_naissance: string | null;
  date_naissance: string | null;
  matricule: string | null;
  niveau_etude: string | null;
  date_engagement: string | null;
  date_notification: string | null;
  date_octroi_matricule: string | null;
  secondary_bureau: string | null;
}

interface UserEditDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NIVEAU_ETUDES = [
  'Primaire',
  'Secondaire',
  'Graduat / Licence',
  'Master / Maîtrise',
  'Doctorat',
  'Autre',
];

const BUREAUX_SECONDARY = [
  'NTIC',
  'Revue',
];

export const UserEditDialog = ({ user, open, onOpenChange }: UserEditDialogProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        nom: user.nom || '',
        prenom: user.prenom || '',
        postnom: user.postnom || '',
        email: user.email || '',
        telephone: user.telephone || '',
        fonction: user.fonction || '',
        service: user.service || '',
        direction: user.direction || '',
        lieu_naissance: user.lieu_naissance || '',
        date_naissance: user.date_naissance || '',
        matricule: user.matricule || '',
        niveau_etude: user.niveau_etude || '',
        date_engagement: user.date_engagement || '',
        date_notification: user.date_notification || '',
        date_octroi_matricule: user.date_octroi_matricule || '',
        secondary_bureau: user.secondary_bureau || '',
      });
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      if (!user) throw new Error('No user selected');

      // Clean up empty strings to null for dates
      const cleanedUpdates = { ...updates };
      ['date_naissance', 'date_engagement', 'date_notification', 'date_octroi_matricule'].forEach(key => {
        if (cleanedUpdates[key as keyof UserProfile] === '') {
          (cleanedUpdates as any)[key] = null;
        }
      });

      const { error } = await (supabase as any).rpc('admin_update_profile', {
        p_user_id: user.id,
        p_updates: cleanedUpdates,
      });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Profil mis à jour avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour', {
        description: (error as Error).message,
      });
    },
  });

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le profil de {user.prenom} {user.nom}</DialogTitle>
          <DialogDescription>
            Modifiez les informations du membre. Tous les champs sont modifiables.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identité */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Identité
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-prenom">Prénom</Label>
                <Input
                  id="edit-prenom"
                  value={formData.prenom || ''}
                  onChange={(e) => handleInputChange('prenom', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-postnom">Post-nom</Label>
                <Input
                  id="edit-postnom"
                  value={formData.postnom || ''}
                  onChange={(e) => handleInputChange('postnom', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-nom">Nom</Label>
                <Input
                  id="edit-nom"
                  value={formData.nom || ''}
                  onChange={(e) => handleInputChange('nom', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-lieu_naissance">Lieu de naissance</Label>
                <Input
                  id="edit-lieu_naissance"
                  value={formData.lieu_naissance || ''}
                  onChange={(e) => handleInputChange('lieu_naissance', e.target.value)}
                  placeholder="Ex: Kinshasa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date_naissance">Date de naissance</Label>
                <Input
                  id="edit-date_naissance"
                  type="date"
                  value={formData.date_naissance || ''}
                  onChange={(e) => handleInputChange('date_naissance', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-matricule">Matricule</Label>
                <Input
                  id="edit-matricule"
                  value={formData.matricule || ''}
                  onChange={(e) => handleInputChange('matricule', e.target.value)}
                  placeholder="Ex: CSN-2024-XXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-niveau_etude">Niveau d'étude</Label>
                <Select
                  value={formData.niveau_etude || ''}
                  onValueChange={(value) => handleInputChange('niveau_etude', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    {NIVEAU_ETUDES.map((niveau) => (
                      <SelectItem key={niveau} value={niveau}>
                        {niveau}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Contact & Affectation
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-telephone">Téléphone</Label>
                <Input
                  id="edit-telephone"
                  value={formData.telephone || ''}
                  onChange={(e) => handleInputChange('telephone', e.target.value)}
                  placeholder="+243 XXX XXX XXX"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-direction">Direction</Label>
                <Input
                  id="edit-direction"
                  value={formData.direction || ''}
                  onChange={(e) => handleInputChange('direction', e.target.value)}
                  placeholder="Ex: Direction Technique"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-service">Service / Bureau</Label>
                <Input
                  id="edit-service"
                  value={formData.service || ''}
                  onChange={(e) => handleInputChange('service', e.target.value)}
                  placeholder="Ex: Bureau Informatique"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-fonction">Fonction</Label>
                <Input
                  id="edit-fonction"
                  value={formData.fonction || ''}
                  onChange={(e) => handleInputChange('fonction', e.target.value)}
                  placeholder="Ex: Analyste"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-secondary_bureau">Double Affectation (NTIC/Revue)</Label>
                <Select
                  value={formData.secondary_bureau || 'none'}
                  onValueChange={(value) => handleInputChange('secondary_bureau', value === 'none' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {BUREAUX_SECONDARY.map((bureau) => (
                      <SelectItem key={bureau} value={bureau}>
                        {bureau}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Données administratives */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Données Administratives
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date_engagement">Date d'engagement</Label>
                <Input
                  id="edit-date_engagement"
                  type="date"
                  value={formData.date_engagement || ''}
                  onChange={(e) => handleInputChange('date_engagement', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date_notification">Date de notification</Label>
                <Input
                  id="edit-date_notification"
                  type="date"
                  value={formData.date_notification || ''}
                  onChange={(e) => handleInputChange('date_notification', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date_octroi_matricule">Date d'octroi matricule</Label>
                <Input
                  id="edit-date_octroi_matricule"
                  type="date"
                  value={formData.date_octroi_matricule || ''}
                  onChange={(e) => handleInputChange('date_octroi_matricule', e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
