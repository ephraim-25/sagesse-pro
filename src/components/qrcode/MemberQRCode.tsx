import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, QrCode } from 'lucide-react';
import { useRef } from 'react';

interface MemberQRCodeProps {
  memberId?: string;
  memberName?: string;
  size?: number;
  showDownload?: boolean;
}

export const MemberQRCode = ({ 
  memberId, 
  memberName,
  size = 200,
  showDownload = true 
}: MemberQRCodeProps) => {
  const { profile } = useAuth();
  const svgRef = useRef<HTMLDivElement>(null);

  const id = memberId || profile?.id;
  const name = memberName || (profile ? `${profile.prenom} ${profile.nom}` : 'Utilisateur');

  if (!id) {
    return (
      <div className="flex items-center justify-center p-8 bg-muted/30 rounded-lg">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  // Generate QR data with member info
  const qrData = JSON.stringify({
    type: 'SIGC_PRESENCE',
    memberId: id,
    timestamp: Date.now(),
  });

  const handleDownload = () => {
    if (!svgRef.current) return;

    const svg = svgRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `qrcode-${name.replace(/\s+/g, '-').toLowerCase()}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          QR Code Personnel
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div 
          ref={svgRef}
          className="p-4 bg-white rounded-lg shadow-inner"
        >
          <QRCodeSVG
            value={qrData}
            size={size}
            level="H"
            includeMargin
            imageSettings={{
              src: '/favicon.ico',
              x: undefined,
              y: undefined,
              height: 24,
              width: 24,
              excavate: true,
            }}
          />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          {name}
        </p>
        {showDownload && (
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Télécharger
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
