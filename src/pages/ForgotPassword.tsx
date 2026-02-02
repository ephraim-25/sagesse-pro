import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, ArrowLeft, CheckCircle2, Loader2, KeyRound } from 'lucide-react';
import { z } from 'zod';
import logoCsn from '@/assets/logo-csn.png';

const emailSchema = z.object({
  email: z.string().email('Veuillez entrer une adresse email valide'),
});

type Step = 'request' | 'sent';

const ForgotPassword = () => {
  const [step, setStep] = useState<Step>('request');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setStep('sent');
      toast.success('Email de récupération envoyé');
    } catch (error: any) {
      console.error('Password reset error:', error);
      // Don't reveal if email exists or not for security
      toast.error('Une erreur s\'est produite. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      toast.success('Email renvoyé avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <img 
            src={logoCsn} 
            alt="CSN Logo" 
            className="w-16 h-16 mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold text-foreground">SIGC-CSN</h1>
          <p className="text-muted-foreground text-sm">Récupération de compte</p>
        </div>

        <Card className="shadow-lg border-border/50">
          {step === 'request' && (
            <>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <KeyRound className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Mot de passe oublié ?</CardTitle>
                <CardDescription>
                  Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Adresse email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loading || !email}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link 
                    to="/auth" 
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Retour à la connexion
                  </Link>
                </div>
              </CardContent>
            </>
          )}

          {step === 'sent' && (
            <>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <CardTitle>Email envoyé !</CardTitle>
                <CardDescription>
                  Si un compte existe avec cette adresse, vous recevrez un email avec les instructions de récupération.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">Étapes suivantes :</h4>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">1</span>
                      <span>Vérifiez votre boîte de réception (et les spams)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">2</span>
                      <span>Cliquez sur le lien dans l'email</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">3</span>
                      <span>Créez votre nouveau mot de passe</span>
                    </li>
                  </ol>
                </div>

                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Vous n'avez pas reçu l'email ?
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={handleResend}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    Renvoyer l'email
                  </Button>
                </div>

                <div className="text-center pt-2">
                  <Link 
                    to="/auth" 
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Retour à la connexion
                  </Link>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          © 2025 Conseil Scientifique National. Tous droits réservés.
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
