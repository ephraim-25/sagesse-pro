import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Briefcase, 
  Camera, 
  Save, 
  Loader2,
  Shield,
  Calendar,
  MapPin,
  GraduationCap,
  Hash,
  FileText
} from 'lucide-react';
import { z } from 'zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const profileSchema = z.object({
  nom: z.string().min(2, 'Nom requis (minimum 2 caractères)'),
  prenom: z.string().min(2, 'Prénom requis (minimum 2 caractères)'),
  postnom: z.string().optional(),
  telephone: z.string().optional(),
  fonction: z.string().optional(),
  service: z.string().optional(),
  lieu_naissance: z.string().optional(),
  date_naissance: z.string().optional(),
  matricule: z.string().optional(),
  niveau_etude: z.string().optional(),
  date_engagement: z.string().optional(),
  date_notification: z.string().optional(),
  date_octroi_matricule: z.string().optional(),
  direction: z.string().optional(),
});

const NIVEAU_ETUDES = [
  'Primaire',
  'Secondaire',
  'Graduat / Licence',
  'Master / Maîtrise',
  'Doctorat',
  'Autre',
];

const Profile = () => {
  const { profile, grade, refreshUserData, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    postnom: '',
    telephone: '',
    fonction: '',
    service: '',
    lieu_naissance: '',
    date_naissance: '',
    matricule: '',
    niveau_etude: '',
    date_engagement: '',
    date_notification: '',
    date_octroi_matricule: '',
    direction: '',
  });

  useEffect(() => {
    if (profile) {
      const p = profile as any;
      setFormData({
        nom: profile.nom || '',
        prenom: profile.prenom || '',
        postnom: profile.postnom || '',
        telephone: profile.telephone || '',
        fonction: profile.fonction || '',
        service: profile.service || '',
        lieu_naissance: p.lieu_naissance || '',
        date_naissance: p.date_naissance || '',
        matricule: p.matricule || '',
        niveau_etude: p.niveau_etude || '',
        date_engagement: p.date_engagement || '',
        date_notification: p.date_notification || '',
        date_octroi_matricule: p.date_octroi_matricule || '',
        direction: p.direction || '',
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2 Mo');
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Update profile with new photo URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await refreshUserData();
      toast.success('Photo de profil mise à jour');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Erreur lors de l\'upload de la photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Validate form data
    const result = profileSchema.safeParse(formData);
    if (!result.success) {
      const errors = result.error.errors.map(e => e.message).join(', ');
      toast.error(errors);
      return;
    }

    setLoading(true);
    try {
      // Clean up empty date strings to null
      const cleanedData: Record<string, any> = { ...formData };
      ['date_naissance', 'date_engagement', 'date_notification', 'date_octroi_matricule'].forEach(key => {
        if (cleanedData[key] === '') {
          cleanedData[key] = null;
        }
      });
      
      // Convert empty strings to null for optional fields
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === '') {
          cleanedData[key] = null;
        }
      });

      const { error } = await supabase
        .from('profiles')
        .update(cleanedData)
        .eq('id', profile.id);

      if (error) throw error;

      await refreshUserData();
      toast.success('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (!profile) return 'U';
    return `${profile.prenom?.[0] || ''}${profile.nom?.[0] || ''}`.toUpperCase();
  };

  const getGradeLabel = () => {
    if (profile?.custom_grade) return profile.custom_grade;
    return grade?.label || 'Non défini';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non disponible';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (!profile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Mon Profil</h1>
          <p className="page-description">Gérez vos informations personnelles et administratives</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="text-center pb-4">
              <div className="relative mx-auto">
                <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                  <AvatarImage src={profile.photo_url || undefined} alt={`${profile.prenom} ${profile.nom}`} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <label 
                  htmlFor="photo-upload" 
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                />
              </div>
              <CardTitle className="mt-4">{profile.prenom} {profile.nom}</CardTitle>
              <CardDescription>{profile.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  {getGradeLabel()}
                </Badge>
              </div>
              
              <Separator />
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{profile.email}</span>
                </div>
                {profile.telephone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{profile.telephone}</span>
                  </div>
                )}
                {formData.matricule && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hash className="w-4 h-4" />
                    <span className="font-mono">{formData.matricule}</span>
                  </div>
                )}
                {formData.direction && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span>{formData.direction}</span>
                  </div>
                )}
                {profile.service && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>{profile.service}</span>
                  </div>
                )}
                {profile.fonction && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="w-4 h-4" />
                    <span>{profile.fonction}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  <span>Membre depuis: {formatDate((profile as any).created_at ?? null)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${profile.statut === 'actif' ? 'bg-success' : 'bg-muted'}`} />
                  <span>Statut: {profile.statut === 'actif' ? 'Actif' : 'Suspendu'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations personnelles
              </CardTitle>
              <CardDescription>
                Mettez à jour vos informations de profil
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Identité */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Identité
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prenom">Prénom *</Label>
                      <Input
                        id="prenom"
                        value={formData.prenom}
                        onChange={(e) => handleInputChange('prenom', e.target.value)}
                        placeholder="Votre prénom"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postnom">Post-nom</Label>
                      <Input
                        id="postnom"
                        value={formData.postnom}
                        onChange={(e) => handleInputChange('postnom', e.target.value)}
                        placeholder="Optionnel"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom *</Label>
                      <Input
                        id="nom"
                        value={formData.nom}
                        onChange={(e) => handleInputChange('nom', e.target.value)}
                        placeholder="Votre nom"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lieu_naissance" className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        Lieu de naissance
                      </Label>
                      <Input
                        id="lieu_naissance"
                        value={formData.lieu_naissance}
                        onChange={(e) => handleInputChange('lieu_naissance', e.target.value)}
                        placeholder="Ex: Kinshasa"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_naissance" className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        Date de naissance
                      </Label>
                      <Input
                        id="date_naissance"
                        type="date"
                        value={formData.date_naissance}
                        onChange={(e) => handleInputChange('date_naissance', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="matricule" className="flex items-center gap-2">
                        <Hash className="w-3 h-3" />
                        Matricule
                      </Label>
                      <Input
                        id="matricule"
                        value={formData.matricule}
                        onChange={(e) => handleInputChange('matricule', e.target.value)}
                        placeholder="Ex: CSN-2024-XXX"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="niveau_etude" className="flex items-center gap-2">
                        <GraduationCap className="w-3 h-3" />
                        Niveau d'étude
                      </Label>
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

                {/* Contact & Affectation */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Contact & Affectation
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="telephone">Téléphone</Label>
                      <Input
                        id="telephone"
                        type="tel"
                        value={formData.telephone}
                        onChange={(e) => handleInputChange('telephone', e.target.value)}
                        placeholder="+243 XXX XXX XXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="direction">Direction</Label>
                      <Input
                        id="direction"
                        value={formData.direction}
                        onChange={(e) => handleInputChange('direction', e.target.value)}
                        placeholder="Ex: Direction Technique"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="service">Service / Bureau</Label>
                      <Input
                        id="service"
                        value={formData.service}
                        onChange={(e) => handleInputChange('service', e.target.value)}
                        placeholder="Ex: Bureau Informatique"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fonction">Fonction</Label>
                      <Input
                        id="fonction"
                        value={formData.fonction}
                        onChange={(e) => handleInputChange('fonction', e.target.value)}
                        placeholder="Ex: Analyste de données"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Données administratives */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Données Administratives
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date_engagement">Date d'engagement</Label>
                      <Input
                        id="date_engagement"
                        type="date"
                        value={formData.date_engagement}
                        onChange={(e) => handleInputChange('date_engagement', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_notification">Date de notification</Label>
                      <Input
                        id="date_notification"
                        type="date"
                        value={formData.date_notification}
                        onChange={(e) => handleInputChange('date_notification', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_octroi_matricule">Date d'octroi matricule</Label>
                      <Input
                        id="date_octroi_matricule"
                        type="date"
                        value={formData.date_octroi_matricule}
                        onChange={(e) => handleInputChange('date_octroi_matricule', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Enregistrer les modifications
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Email Section (read-only) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Adresse email
            </CardTitle>
            <CardDescription>
              Votre adresse email est liée à votre compte et ne peut pas être modifiée ici
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Input
                value={user?.email || profile.email}
                disabled
                className="max-w-md"
              />
              <Badge variant="outline" className="text-success border-success">
                Vérifié
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Profile;
