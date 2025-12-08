import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Settings as SettingsIcon,
  Building2,
  Bell,
  Mail,
  Globe,
  Database,
  Save
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Settings = () => {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Paramètres</h1>
          <p className="page-description">Configurez les paramètres du système</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="organization">Organisation</TabsTrigger>
            <TabsTrigger value="system">Système</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
              <div className="flex items-center gap-2 mb-6">
                <SettingsIcon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Paramètres Généraux</h3>
              </div>
              
              <div className="space-y-6 max-w-2xl">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom de l'organisation</label>
                  <Input defaultValue="Conseil Scientifique National" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email de contact</label>
                  <Input defaultValue="contact@csn.gov" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fuseau horaire</label>
                  <Input defaultValue="Europe/Paris (UTC+1)" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Langue par défaut</label>
                  <Input defaultValue="Français" />
                </div>

                <Button>
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
              <div className="flex items-center gap-2 mb-6">
                <Bell className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Paramètres de Notifications</h3>
              </div>
              
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <div>
                    <p className="font-medium">Notifications par email</p>
                    <p className="text-sm text-muted-foreground">Recevoir les alertes par email</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <div>
                    <p className="font-medium">Rappels de tâches</p>
                    <p className="text-sm text-muted-foreground">Notification avant les échéances</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <div>
                    <p className="font-medium">Rapports hebdomadaires</p>
                    <p className="text-sm text-muted-foreground">Résumé automatique chaque lundi</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <div>
                    <p className="font-medium">Alertes de sécurité</p>
                    <p className="text-sm text-muted-foreground">Notifications en cas d'activité suspecte</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Button>
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="organization">
            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
              <div className="flex items-center gap-2 mb-6">
                <Building2 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Structure Organisationnelle</h3>
              </div>
              
              <div className="space-y-6 max-w-2xl">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-3">Départements</h4>
                  <div className="space-y-2">
                    {["Recherche", "Administration", "Communication", "Finance", "IT"].map((dept) => (
                      <div key={dept} className="flex items-center justify-between py-2">
                        <span>{dept}</span>
                        <Button variant="ghost" size="sm">Modifier</Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="mt-4">
                    + Ajouter un département
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Horaires de travail par défaut</label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Début" defaultValue="08:30" />
                    <Input placeholder="Fin" defaultValue="17:30" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Jours de télétravail autorisés/semaine</label>
                  <Input type="number" defaultValue="2" className="w-24" />
                </div>

                <Button>
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="system">
            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
              <div className="flex items-center gap-2 mb-6">
                <Database className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Paramètres Système</h3>
              </div>
              
              <div className="space-y-6 max-w-2xl">
                <div className="p-4 bg-success/5 rounded-lg border border-success/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="font-medium text-success">Système opérationnel</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Dernière vérification : il y a 5 minutes
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <div>
                      <p className="font-medium">Sauvegarde automatique</p>
                      <p className="text-sm text-muted-foreground">Toutes les 24 heures</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <div>
                      <p className="font-medium">Mode maintenance</p>
                      <p className="text-sm text-muted-foreground">Désactiver l'accès utilisateur</p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <div>
                      <p className="font-medium">Logs détaillés</p>
                      <p className="text-sm text-muted-foreground">Enregistrer toutes les actions</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Database className="w-4 h-4 mr-2" />
                    Exporter les données
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
                    Réinitialiser le système
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Settings;
