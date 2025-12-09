import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { 
  QrCode, 
  Clock, 
  LogIn, 
  LogOut,
  CheckCircle2,
  MapPin,
  Calendar,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTodayPresence, useRecordPresence, usePresences, useProfile } from "@/hooks/useData";
import { MemberQRCode } from "@/components/qrcode/MemberQRCode";
import { QRScanner } from "@/components/qrcode/QRScanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CheckIn = () => {
  const { profile } = useAuth();
  const { data: todayPresence, isLoading: loadingPresence } = useTodayPresence();
  const { data: allPresences, isLoading: loadingAllPresences } = usePresences(
    new Date().toISOString().split('T')[0]
  );
  const recordPresence = useRecordPresence();
  const [scannedMemberId, setScannedMemberId] = useState<string | null>(null);
  const { data: scannedProfile } = useProfile(scannedMemberId || '');

  const isCheckedIn = todayPresence?.heure_entree && !todayPresence?.heure_sortie;
  const checkInTime = todayPresence?.heure_entree 
    ? new Date(todayPresence.heure_entree).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null;

  const handleCheckIn = async () => {
    try {
      await recordPresence.mutateAsync({ 
        type: 'entree',
        appareil: navigator.userAgent,
        localisation: 'France'
      });
      toast.success('Entrée enregistrée avec succès');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du pointage');
    }
  };

  const handleCheckOut = async () => {
    try {
      await recordPresence.mutateAsync({ type: 'sortie' });
      toast.success('Sortie enregistrée avec succès');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du pointage');
    }
  };

  const handleQRScan = async (data: { memberId: string }) => {
    setScannedMemberId(data.memberId);
    
    // If scanning own QR code, trigger check-in/out
    if (data.memberId === profile?.id) {
      if (isCheckedIn) {
        await handleCheckOut();
      } else {
        await handleCheckIn();
      }
    } else {
      toast.info('QR Code d\'un autre membre détecté');
    }
  };

  // Calculate today stats
  const todayStats = {
    arrivals: allPresences?.filter(p => p.heure_entree).length || 0,
    departures: allPresences?.filter(p => p.heure_sortie).length || 0,
    present: allPresences?.filter(p => p.heure_entree && !p.heure_sortie).length || 0,
    avgArrival: allPresences?.length 
      ? (() => {
          const arrivals = allPresences
            .filter(p => p.heure_entree)
            .map(p => new Date(p.heure_entree!).getTime());
          if (arrivals.length === 0) return '--:--';
          const avg = arrivals.reduce((a, b) => a + b, 0) / arrivals.length;
          return new Date(avg).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        })()
      : '--:--',
  };

  // Recent check-ins
  const recentCheckIns = allPresences
    ?.filter(p => p.heure_entree)
    .sort((a, b) => new Date(b.heure_entree!).getTime() - new Date(a.heure_entree!).getTime())
    .slice(0, 5)
    .map(p => ({
      name: p.profile ? `${p.profile.prenom} ${p.profile.nom}` : 'Utilisateur',
      time: new Date(p.heure_entree!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      type: 'in',
    })) || [];

  if (loadingPresence) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Pointage</h1>
          <p className="page-description">Gérez votre présence quotidienne</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Check-in Card */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="manual" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="manual">Manuel</TabsTrigger>
                <TabsTrigger value="scan">Scanner</TabsTrigger>
                <TabsTrigger value="myqr">Mon QR Code</TabsTrigger>
              </TabsList>

              <TabsContent value="manual">
                <div className="bg-card rounded-xl p-8 shadow-soft border border-border/50">
                  <div className="text-center mb-8">
                    <div className={cn(
                      "w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center",
                      isCheckedIn ? "bg-success/10" : "bg-muted"
                    )}>
                      {isCheckedIn ? (
                        <CheckCircle2 className="w-12 h-12 text-success" />
                      ) : (
                        <Clock className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      {isCheckedIn ? "Vous êtes présent" : "Pas encore pointé"}
                    </h2>
                    {checkInTime && isCheckedIn && (
                      <p className="text-muted-foreground">
                        Arrivée à {checkInTime}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {!isCheckedIn ? (
                      <Button 
                        size="lg" 
                        variant="success" 
                        onClick={handleCheckIn} 
                        className="min-w-48"
                        disabled={recordPresence.isPending}
                      >
                        {recordPresence.isPending ? (
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                          <LogIn className="w-5 h-5 mr-2" />
                        )}
                        Pointer l'arrivée
                      </Button>
                    ) : (
                      <Button 
                        size="lg" 
                        variant="destructive" 
                        onClick={handleCheckOut} 
                        className="min-w-48"
                        disabled={recordPresence.isPending}
                      >
                        {recordPresence.isPending ? (
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                          <LogOut className="w-5 h-5 mr-2" />
                        )}
                        Pointer le départ
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="scan">
                <QRScanner 
                  onScan={handleQRScan}
                  onError={(error) => toast.error(error)}
                />
                {scannedProfile && (
                  <div className="mt-4 p-4 bg-info/10 rounded-lg">
                    <p className="text-sm text-info">
                      Membre détecté: {scannedProfile.prenom} {scannedProfile.nom}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="myqr">
                <div className="flex justify-center">
                  <MemberQRCode />
                </div>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Montrez ce QR code pour être scanné lors du pointage
                </p>
              </TabsContent>
            </Tabs>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Today's Stats */}
            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Statistiques du Jour
              </h3>
              {loadingAllPresences ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-success/10 rounded-lg">
                    <p className="text-2xl font-bold text-success">{todayStats.arrivals}</p>
                    <p className="text-xs text-muted-foreground">Arrivées</p>
                  </div>
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <p className="text-2xl font-bold text-destructive">{todayStats.departures}</p>
                    <p className="text-xs text-muted-foreground">Départs</p>
                  </div>
                  <div className="p-3 bg-info/10 rounded-lg">
                    <p className="text-2xl font-bold text-info">{todayStats.present}</p>
                    <p className="text-xs text-muted-foreground">Présents</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{todayStats.avgArrival}</p>
                    <p className="text-xs text-muted-foreground">Arrivée moy.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Check-ins */}
            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Pointages Récents
              </h3>
              {loadingAllPresences ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCheckIns.length > 0 ? recentCheckIns.map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          item.type === "in" ? "bg-success" : "bg-destructive"
                        )} />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{item.time}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun pointage aujourd'hui
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Location Info */}
            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Localisation
              </h3>
              <p className="text-sm text-muted-foreground">
                Conseil Scientifique National
              </p>
              <p className="text-sm text-muted-foreground">
                123 Avenue de la Recherche
              </p>
              <p className="text-sm text-muted-foreground">
                75001 Paris, France
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CheckIn;
