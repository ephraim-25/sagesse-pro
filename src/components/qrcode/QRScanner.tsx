import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QRScannerProps {
  onScan: (data: { memberId: string }) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const QRScanner = ({ onScan, onError, className }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  }, []);

  const startScanning = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices.length === 0) {
        setHasCamera(false);
        onError?.('Aucune caméra détectée');
        return;
      }

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader');
      }

      setIsScanning(true);
      setScanResult(null);

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            
            if (data.type === 'SIGC_PRESENCE' && data.memberId) {
              setScanResult({
                success: true,
                message: 'QR Code scanné avec succès!',
              });
              onScan({ memberId: data.memberId });
              stopScanning();
            } else {
              setScanResult({
                success: false,
                message: 'QR Code invalide',
              });
            }
          } catch {
            setScanResult({
              success: false,
              message: 'Format de QR Code non reconnu',
            });
          }
        },
        () => {
          // QR code not found in frame - ignore
        }
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      setHasCamera(false);
      onError?.('Impossible d\'accéder à la caméra');
      setIsScanning(false);
    }
  }, [onScan, onError, stopScanning]);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          Scanner un Badge
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="space-y-4">
          <div 
            id="qr-reader" 
            className={cn(
              "rounded-lg overflow-hidden bg-muted/30",
              !isScanning && "hidden"
            )}
          />
          
          {!isScanning && !scanResult && (
            <div className="aspect-square max-w-[300px] mx-auto bg-muted/30 rounded-lg flex items-center justify-center">
              {hasCamera ? (
                <Camera className="w-16 h-16 text-muted-foreground/50" />
              ) : (
                <CameraOff className="w-16 h-16 text-muted-foreground/50" />
              )}
            </div>
          )}

          {scanResult && (
            <div className={cn(
              "p-4 rounded-lg flex items-center gap-3",
              scanResult.success ? "bg-success/10" : "bg-destructive/10"
            )}>
              {scanResult.success ? (
                <CheckCircle2 className="w-6 h-6 text-success" />
              ) : (
                <XCircle className="w-6 h-6 text-destructive" />
              )}
              <span className={scanResult.success ? "text-success" : "text-destructive"}>
                {scanResult.message}
              </span>
            </div>
          )}

          <div className="flex justify-center gap-2">
            {!isScanning ? (
              <Button 
                onClick={startScanning}
                disabled={!hasCamera}
              >
                <Camera className="w-4 h-4 mr-2" />
                {scanResult ? 'Scanner à nouveau' : 'Démarrer le scan'}
              </Button>
            ) : (
              <Button variant="outline" onClick={stopScanning}>
                <CameraOff className="w-4 h-4 mr-2" />
                Arrêter
              </Button>
            )}
          </div>

          {!hasCamera && (
            <p className="text-sm text-muted-foreground text-center">
              Aucune caméra disponible. Veuillez autoriser l'accès à la caméra.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
