import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Shield, Mail, Lock, User, Award, AlertCircle, Key, Loader2 } from 'lucide-react';
import { lovable } from '@/integrations/lovable/index';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import logoCsn from '@/assets/logo-csn.png';
import { ensureProfileHasGrade } from '@/lib/profileSync';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe: minimum 6 caractères'),
});

const signupSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe: minimum 6 caractères'),
  nom: z.string().min(2, 'Nom requis (minimum 2 caractères)'),
  prenom: z.string().min(2, 'Prénom requis (minimum 2 caractères)'),
  grade_code: z.string().min(1, 'Veuillez sélectionner un grade'),
  custom_grade: z.string().optional(),
});

const adminSignupSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe: minimum 6 caractères'),
  nom: z.string().min(2, 'Nom requis (minimum 2 caractères)'),
  prenom: z.string().min(2, 'Prénom requis (minimum 2 caractères)'),
  matricule: z.string().regex(/^CSN-2013-\d{3}$/, 'Format matricule invalide (CSN-2013-XXX)'),
});

// Grades hiérarchiques disponibles
const GRADES = [
  { code: 'president_conseil', label: 'Président du conseil', requiresApproval: true },
  { code: 'secretaire_permanent', label: 'Secrétaire Permanent', requiresApproval: true },
  { code: 'chef_division', label: 'Chef de division', requiresApproval: false },
  { code: 'chef_bureau', label: 'Chef de Bureau', requiresApproval: false },
  { code: 'ata_1', label: 'ATA 1 (Attaché 1ère classe)', requiresApproval: false },
  { code: 'ata_2', label: 'ATA 2 (Attaché 2ème classe)', requiresApproval: false },
  { code: 'aga_1', label: 'AGA 1 (Agent 1ère classe)', requiresApproval: false },
  { code: 'aga_2', label: 'AGA 2 (Agent 2ème classe)', requiresApproval: false },
  { code: 'huissier', label: 'Huissier', requiresApproval: false },
  { code: 'custom', label: 'Autre (préciser)', requiresApproval: false },
];

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [gradeCode, setGradeCode] = useState('');
  const [customGrade, setCustomGrade] = useState('');
  const [isAdminSignup, setIsAdminSignup] = useState(false);
  const [adminMatricule, setAdminMatricule] = useState('');
  const [matriculeValid, setMatriculeValid] = useState<boolean | null>(null);
  const [checkingMatricule, setCheckingMatricule] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.redirected) {
        return;
      }

      if (result.error) {
        toast.error(result.error.message || 'Erreur de connexion Google');
        setGoogleLoading(false);
        return;
      }

      toast.success('Connexion Google réussie');
      navigate('/');
    } catch (error) {
      toast.error('Erreur lors de la connexion Google');
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });

      if (result.redirected) {
        return;
      }

      if (result.error) {
        toast.error(result.error.message || 'Erreur de connexion Apple');
        setAppleLoading(false);
        return;
      }

      toast.success('Connexion Apple réussie');
      navigate('/');
    } catch (error) {
      toast.error('Erreur lors de la connexion Apple');
      setAppleLoading(false);
    }
  };

  // Prevent auto-redirect on SIGNED_IN during post-signup synchronization.
  const postSignupSyncingRef = useRef(false);

  const selectedGrade = GRADES.find(g => g.code === gradeCode);
  const requiresApproval = selectedGrade?.requiresApproval ?? false;
  const isCustomGrade = gradeCode === 'custom';

  // Vérifier la disponibilité du matricule via edge function (sécurisé)
  const checkMatricule = async (matricule: string) => {
    if (!matricule || !/^CSN-2013-\d{3}$/.test(matricule)) {
      setMatriculeValid(null);
      return;
    }
    
    setCheckingMatricule(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-admin-matricule', {
        body: { matricule, action: 'check' }
      });

      if (error) {
        console.error('Matricule check error:', error);
        setMatriculeValid(false);
      } else {
        setMatriculeValid(data?.valid === true);
      }
    } catch {
      setMatriculeValid(false);
    } finally {
      setCheckingMatricule(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (adminMatricule.length >= 12) {
        checkMatricule(adminMatricule);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [adminMatricule]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        if (!postSignupSyncingRef.current) {
          navigate('/');
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        if (!postSignupSyncingRef.current) {
          navigate('/');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      loginSchema.parse({ email, password });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou mot de passe incorrect');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Veuillez confirmer votre email avant de vous connecter');
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }
    
    // Force session refresh to ensure latest roles/grades are loaded
    if (data.session) {
      await supabase.auth.refreshSession();
    }
    
    toast.success('Connexion réussie');
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Admin signup flow
    if (isAdminSignup) {
      try {
        adminSignupSchema.parse({ email, password, nom, prenom, matricule: adminMatricule });
      } catch (err) {
        if (err instanceof z.ZodError) {
          toast.error(err.errors[0].message);
          return;
        }
      }

      if (!matriculeValid) {
        toast.error('Matricule invalide ou déjà utilisé');
        return;
      }

      setLoading(true);

      // Create the account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            nom,
            prenom,
            grade_code: 'secretaire_permanent', // Admin gets this grade
            is_admin_registration: true,
            admin_matricule: adminMatricule,
          }
        }
      });

      if (authError) {
        toast.error(authError.message);
        setLoading(false);
        return;
      }

      // Wait a moment for the profile to be created by the trigger
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Get the profile ID
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_id', authData.user?.id)
        .single();

      if (profileData) {
        // Get session for auth token
        const { data: { session } } = await supabase.auth.getSession();
        
        // Validate and mark matricule as used via secure edge function
        const { data: validateResult, error: validateError } = await supabase.functions.invoke('validate-admin-matricule', {
          body: { 
            matricule: adminMatricule, 
            action: 'use',
            profile_id: profileData.id 
          }
        });

        if (validateError || !validateResult?.success) {
          toast.error('Erreur lors de la validation du matricule');
        } else {
          toast.success('Compte administrateur créé avec succès! Vous pouvez maintenant vous connecter.');
        }
      }

      // Clear form
      setEmail('');
      setPassword('');
      setNom('');
      setPrenom('');
      setAdminMatricule('');
      setIsAdminSignup(false);
      setLoading(false);
      return;
    }

    // Regular signup flow
    // Validate custom grade if selected
    if (isCustomGrade && (!customGrade || customGrade.trim().length < 2)) {
      toast.error('Veuillez préciser votre grade personnalisé');
      return;
    }
    
    try {
      signupSchema.parse({ 
        email, 
        password, 
        nom, 
        prenom, 
        grade_code: gradeCode,
        custom_grade: isCustomGrade ? customGrade : undefined 
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setLoading(true);
    postSignupSyncingRef.current = true;
    
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          nom,
          prenom,
          grade_code: gradeCode,
          custom_grade: isCustomGrade ? customGrade.trim() : null,
        }
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Cet email est déjà enregistré');
      } else if (error.message.includes('rate limit')) {
        toast.error('Trop de tentatives. Veuillez réessayer dans quelques minutes.');
      } else {
        toast.error(error.message);
      }
      postSignupSyncingRef.current = false;
      setLoading(false);
      return;
    }

    // If no session (email confirmation required), we can't sync/profile-update immediately.
    if (!authData?.session || !authData.user?.id) {
      toast.success(
        "Compte créé. Veuillez confirmer votre email, puis connectez-vous pour activer vos droits."
      );
      postSignupSyncingRef.current = false;
      setLoading(false);
      return;
    }

    // Ensure grade is actually written in `profiles.grade_id` and validated.
    try {
      await ensureProfileHasGrade({
        authId: authData.user.id,
        gradeCode,
        customGrade: isCustomGrade ? customGrade : null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue.";
      toast.error(
        `Inscription créée, mais échec de configuration du grade: ${message}`
      );
      // Safety: avoid landing in an inconsistent permission state.
      await supabase.auth.signOut();
      postSignupSyncingRef.current = false;
      setLoading(false);
      return;
    }

    // Force immediate re-fetch of the profile/grade in AuthProvider (via TOKEN_REFRESHED event).
    await supabase.auth.refreshSession();

    if (requiresApproval) {
      toast.success(
        "Compte créé! Votre demande est en attente d'approbation par un administrateur."
      );
    } else {
      toast.success('Compte créé avec succès! Redirection en cours...');
    }

    // Clear form
    setEmail('');
    setPassword('');
    setNom('');
    setPrenom('');
    setGradeCode('');
    setCustomGrade('');

    postSignupSyncingRef.current = false;
    setLoading(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src={logoCsn} 
            alt="Logo Conseil Scientifique National" 
            className="w-20 h-20 mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold text-foreground">SIGC-CSN</h1>
          <p className="text-muted-foreground mt-2">
            Système Intégré de Gestion du Conseil
          </p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Inscription</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                    {loading ? 'Connexion...' : 'Se connecter'}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Ou</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={handleGoogleSignIn}
                    disabled={loading || googleLoading}
                  >
                    {googleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    {googleLoading ? 'Connexion...' : 'Continuer avec Google'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 bg-black text-white hover:bg-black/90 hover:text-white"
                    onClick={handleAppleSignIn}
                    disabled={loading || googleLoading || appleLoading}
                  >
                    {appleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                    )}
                    {appleLoading ? 'Connexion...' : 'Continuer avec Apple'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  {/* Admin registration toggle */}
                  <div className="flex items-center space-x-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Checkbox 
                      id="admin-signup"
                      checked={isAdminSignup}
                      onCheckedChange={(checked) => setIsAdminSignup(checked === true)}
                    />
                    <Label 
                      htmlFor="admin-signup" 
                      className="text-sm font-medium cursor-pointer flex items-center gap-2"
                    >
                      <Shield className="w-4 h-4 text-primary" />
                      Inscription Administrateur (avec matricule)
                    </Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="nom"
                          type="text"
                          placeholder="Nom"
                          value={nom}
                          onChange={(e) => setNom(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prenom">Prénom</Label>
                      <Input
                        id="prenom"
                        type="text"
                        placeholder="Prénom"
                        value={prenom}
                        onChange={(e) => setPrenom(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {isAdminSignup ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="matricule">Matricule Administrateur</Label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="matricule"
                            type="text"
                            placeholder="CSN-2013-XXX"
                            value={adminMatricule}
                            onChange={(e) => setAdminMatricule(e.target.value.toUpperCase())}
                            className={`pl-10 ${
                              matriculeValid === true 
                                ? 'border-emerald-500 focus-visible:ring-emerald-500' 
                                : matriculeValid === false 
                                  ? 'border-destructive focus-visible:ring-destructive' 
                                  : ''
                            }`}
                            required
                          />
                          {checkingMatricule && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                        {matriculeValid === true && (
                          <p className="text-sm text-emerald-600 flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                            Matricule valide et disponible
                          </p>
                        )}
                        {matriculeValid === false && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-destructive" />
                            Matricule invalide ou déjà utilisé
                          </p>
                        )}
                      </div>

                      <Alert className="bg-primary/5 border-primary/20">
                        <Shield className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-sm">
                          L'inscription administrateur nécessite un matricule prédéfini au format CSN-2013-XXX.
                          Contactez le support si vous n'avez pas de matricule.
                        </AlertDescription>
                      </Alert>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="grade">Grade hiérarchique</Label>
                        <div className="relative">
                          <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                          <Select value={gradeCode} onValueChange={setGradeCode}>
                            <SelectTrigger className="pl-10">
                              <SelectValue placeholder="Sélectionnez votre grade" />
                            </SelectTrigger>
                            <SelectContent>
                              {GRADES.map((grade) => (
                                <SelectItem key={grade.code} value={grade.code}>
                                  {grade.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {isCustomGrade && (
                        <div className="space-y-2">
                          <Label htmlFor="custom-grade">Précisez votre grade</Label>
                          <Input
                            id="custom-grade"
                            type="text"
                            placeholder="Votre grade"
                            value={customGrade}
                            onChange={(e) => setCustomGrade(e.target.value)}
                            required
                          />
                        </div>
                      )}

                      {requiresApproval && (
                        <Alert className="bg-amber-500/10 border-amber-500/30">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm">
                            Ce grade nécessite une validation par un administrateur. 
                            Votre compte sera activé après approbation.
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Minimum 6 caractères"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || (isAdminSignup ? !matriculeValid : !gradeCode)}
                  >
                    {loading ? 'Création...' : isAdminSignup ? 'Créer un compte administrateur' : 'Créer un compte'}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Conseil Scientifique National
        </p>
      </div>
    </div>
  );
};

export default Auth;
