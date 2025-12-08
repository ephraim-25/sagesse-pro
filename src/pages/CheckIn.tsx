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
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const CheckIn = () => {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCheckIn = () => {
    const now = new Date();
    setCheckInTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    setIsCheckedIn(true);
    toast({
      title: "Check-in effectué",
      description: `Vous avez pointé à ${now.toLocaleTimeString('fr-FR')}`,
    });
  };

  const handleCheckOut = () => {
    const now = new Date();
    setIsCheckedIn(false);
    toast({
      title: "Check-out effectué",
      description: `Vous avez quitté à ${now.toLocaleTimeString('fr-FR')}`,
    });
  };

  const todayStats = {
    arrivals: 42,
    departures: 8,
    present: 34,
    avgArrival: "08:32",
  };

  const recentCheckIns = [
    { name: "Marie Dupont", time: "08:45", type: "in" },
    { name: "Jean Martin", time: "08:42", type: "in" },
    { name: "Sophie Bernard", time: "08:38", type: "in" },
    { name: "Pierre Durand", time: "08:35", type: "in" },
    { name: "Claire Moreau", time: "08:30", type: "in" },
  ];

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

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                {!isCheckedIn ? (
                  <Button size="lg" variant="success" onClick={handleCheckIn} className="min-w-48">
                    <LogIn className="w-5 h-5 mr-2" />
                    Pointer l'arrivée
                  </Button>
                ) : (
                  <Button size="lg" variant="destructive" onClick={handleCheckOut} className="min-w-48">
                    <LogOut className="w-5 h-5 mr-2" />
                    Pointer le départ
                  </Button>
                )}
              </div>

              {/* QR Code Section */}
              <div className="border-t border-border pt-6">
                <div className="flex items-center justify-center gap-4 text-muted-foreground">
                  <QrCode className="w-6 h-6" />
                  <span>Ou scannez votre badge</span>
                </div>
                <div className="mt-4 p-8 bg-muted/30 rounded-lg flex items-center justify-center">
                  <div className="w-32 h-32 bg-foreground/10 rounded-lg flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-muted-foreground/50" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Today's Stats */}
            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Statistiques du Jour
              </h3>
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
            </div>

            {/* Recent Check-ins */}
            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Pointages Récents
              </h3>
              <div className="space-y-3">
                {recentCheckIns.map((item, index) => (
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
                ))}
              </div>
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
