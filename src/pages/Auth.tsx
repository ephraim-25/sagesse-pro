import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Shield, Mail, Lock, User, Building2, Award, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [gradeCode, setGradeCode] = useState('');
  const [customGrade, setCustomGrade] = useState('');

  const selectedGrade = GRADES.find(g => g.code === gradeCode);
  const requiresApproval = selectedGrade?.requiresApproval ?? false;
  const isCustomGrade = gradeCode === 'custom';

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate('/');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate('/');
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
    
    const { error } = await supabase.auth.signInWithPassword({
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
    } else {
      toast.success('Connexion réussie');
    }
    
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
    
    const { error } = await supabase.auth.signUp({
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
    } else {
      if (requiresApproval) {
        toast.success('Compte créé! Votre demande est en attente d\'approbation par un administrateur.');
      } else {
        toast.success('Compte créé avec succès! Vous pouvez maintenant vous connecter.');
      }
      // Clear form
      setEmail('');
      setPassword('');
      setNom('');
      setPrenom('');
      setGradeCode('');
      setCustomGrade('');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">SIGC</h1>
          <p className="text-muted-foreground mt-2">
            Système Intelligent de Gestion du Conseil
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

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Connexion...' : 'Se connecter'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
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

                  <Button type="submit" className="w-full" disabled={loading || !gradeCode}>
                    {loading ? 'Création...' : 'Créer un compte'}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Building2 className="inline w-4 h-4 mr-1" />
          Conseil Scientifique National
        </p>
      </div>
    </div>
  );
};

export default Auth;
