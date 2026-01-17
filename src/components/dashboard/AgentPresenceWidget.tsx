import { useState } from 'react';
import { useTeleworkSession } from '@/hooks/useTeleworkSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building2, 
  Laptop, 
  Clock, 
  Play, 
  Pause, 
  Square, 
  Loader2,
  Coffee,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentPresenceWidgetProps {
  className?: string;
}

export function AgentPresenceWidget({ className }: AgentPresenceWidgetProps) {
  const { 
    session, 
    isCheckedIn, 
    isLoading, 
    checkin, 
    checkout, 
    updateStatus,
    elapsedSeconds,
    status 
  } = useTeleworkSession();
  
  const [activity, setActivity] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  // Format elapsed time
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formattedDuration = formatDuration(elapsedSeconds);
  const currentStatus = status;

  const handleCheckIn = async (type: 'office' | 'remote') => {
    setCheckingIn(true);
    try {
      await checkin(type === 'remote' ? activity : undefined);
      setActivity('');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      await checkout(activity || undefined);
      setActivity('');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleStatusChange = async (status: 'connecte' | 'pause' | 'reunion') => {
    await updateStatus(status, activity || undefined);
    setActivity('');
  };

  if (isLoading) {
    return (
      <Card className={cn("shadow-soft", className)}>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("shadow-soft overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="w-5 h-5 text-primary" />
          Ma Présence
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {!isCheckedIn ? (
          // Not checked in - show big buttons
          <div className="space-y-6">
            <div className="text-center mb-4">
              <p className="text-muted-foreground">Commencez votre journée de travail</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button
                size="lg"
                className="h-24 flex-col gap-2 bg-success hover:bg-success/90 text-success-foreground"
                onClick={() => handleCheckIn('office')}
                disabled={checkingIn}
              >
                {checkingIn ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <>
                    <Building2 className="w-8 h-8" />
                    <span className="font-semibold">Au Bureau</span>
                  </>
                )}
              </Button>
              
              <Button
                size="lg"
                className="h-24 flex-col gap-2 bg-info hover:bg-info/90 text-info-foreground"
                onClick={() => handleCheckIn('remote')}
                disabled={checkingIn}
              >
                {checkingIn ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <>
                    <Laptop className="w-8 h-8" />
                    <span className="font-semibold">Télétravail</span>
                  </>
                )}
              </Button>
            </div>
            
            <Textarea
              placeholder="Activité prévue aujourd'hui (optionnel)..."
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        ) : (
          // Checked in - show status and timer
          <div className="space-y-6">
            {/* Timer display */}
            <div className="text-center py-4 bg-muted/30 rounded-xl">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Temps travaillé aujourd'hui
              </p>
              <p className="text-4xl font-bold text-foreground font-mono">
                {formattedDuration}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                  currentStatus === 'connecte' && 'bg-success/10 text-success',
                  currentStatus === 'pause' && 'bg-warning/10 text-warning',
                  currentStatus === 'reunion' && 'bg-info/10 text-info'
                )}>
                  {currentStatus === 'connecte' && <Play className="w-3 h-3" />}
                  {currentStatus === 'pause' && <Pause className="w-3 h-3" />}
                  {currentStatus === 'reunion' && <Users className="w-3 h-3" />}
                  {currentStatus === 'connecte' ? 'Actif' : currentStatus === 'pause' ? 'En pause' : 'En réunion'}
                </span>
              </div>
            </div>
            
            {/* Status buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={currentStatus === 'connecte' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'flex-col h-16 gap-1',
                  currentStatus === 'connecte' && 'bg-success hover:bg-success/90'
                )}
                onClick={() => handleStatusChange('connecte')}
              >
                <Play className="w-4 h-4" />
                <span className="text-xs">Actif</span>
              </Button>
              
              <Button
                variant={currentStatus === 'pause' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'flex-col h-16 gap-1',
                  currentStatus === 'pause' && 'bg-warning hover:bg-warning/90'
                )}
                onClick={() => handleStatusChange('pause')}
              >
                <Coffee className="w-4 h-4" />
                <span className="text-xs">Pause</span>
              </Button>
              
              <Button
                variant={currentStatus === 'reunion' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'flex-col h-16 gap-1',
                  currentStatus === 'reunion' && 'bg-info hover:bg-info/90'
                )}
                onClick={() => handleStatusChange('reunion')}
              >
                <Users className="w-4 h-4" />
                <span className="text-xs">Réunion</span>
              </Button>
            </div>
            
            {/* Activity note */}
            <Textarea
              placeholder="Note d'activité..."
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            
            {/* Checkout button */}
            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={handleCheckOut}
              disabled={checkingOut}
            >
              {checkingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Square className="w-4 h-4" />
                  Terminer ma journée
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
