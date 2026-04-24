import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  File,
  Loader2,
  Paperclip,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function explainUploadError(err: { message?: string; statusCode?: string | number } | null | undefined, fileName: string): string {
  const raw = err?.message || '';
  const status = String(err?.statusCode ?? '');
  const msg = raw.toLowerCase();

  if (msg.includes('row-level security') || msg.includes('rls') || status === '403' || msg.includes('unauthorized')) {
    return `Accès refusé pour « ${fileName} ». Votre rôle ne permet pas d'envoyer ce document. Contactez un administrateur si le problème persiste.`;
  }
  if (msg.includes('bucket') && msg.includes('not found')) {
    return `L'espace de stockage est introuvable. Veuillez réessayer dans un instant ou contacter un administrateur.`;
  }
  if (msg.includes('exceeded') || msg.includes('too large') || status === '413') {
    return `« ${fileName} » dépasse la taille autorisée (10 Mo).`;
  }
  if (msg.includes('mime') || msg.includes('not allowed')) {
    return `Le format de « ${fileName} » n'est pas autorisé.`;
  }
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return `Connexion interrompue lors de l'envoi de « ${fileName} ». Vérifiez votre réseau et réessayez.`;
  }
  if (raw) return `Échec de l'envoi de « ${fileName} » : ${raw}`;
  return `Échec de l'envoi de « ${fileName} ». Veuillez réessayer.`;
}

interface TaskFileUploadProps {
  onFilesUploaded: (urls: string[]) => void;
  existingFiles?: string[];
  disabled?: boolean;
}

interface UploadedFile {
  name: string;
  url: string;
  type: string;
}

const ALLOWED_TYPES = {
  'application/pdf': { icon: FileText, label: 'PDF', color: 'text-red-500' },
  'application/msword': { icon: FileText, label: 'DOC', color: 'text-blue-500' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, label: 'DOCX', color: 'text-blue-500' },
  'image/png': { icon: ImageIcon, label: 'PNG', color: 'text-green-500' },
  'image/jpeg': { icon: ImageIcon, label: 'JPEG', color: 'text-green-500' },
  'image/jpg': { icon: ImageIcon, label: 'JPG', color: 'text-green-500' },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const TaskFileUpload = ({ onFilesUploaded, existingFiles = [], disabled }: TaskFileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(
    existingFiles.map(url => ({
      name: url.split('/').pop() || 'file',
      url,
      type: 'application/octet-stream'
    }))
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileTypeConfig = (type: string) => {
    return ALLOWED_TYPES[type as keyof typeof ALLOWED_TYPES] || { icon: File, label: 'FILE', color: 'text-muted-foreground' };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadError(null);

    // Validate files
    for (const file of files) {
      if (!Object.keys(ALLOWED_TYPES).includes(file.type)) {
        const msg = `Type de fichier non supporté : « ${file.name} ». Formats acceptés : PDF, Word, PNG, JPEG.`;
        setUploadError(msg);
        toast.error(msg);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        const msg = `« ${file.name} » dépasse la taille maximale de 10 Mo.`;
        setUploadError(msg);
        toast.error(msg);
        return;
      }
    }

    setUploading(true);
    const newFiles: UploadedFile[] = [];
    const errors: string[] = [];

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `tasks/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('task-documents')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          const friendly = explainUploadError(uploadError as any, file.name);
          errors.push(friendly);
          toast.error(friendly);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('task-documents')
          .getPublicUrl(filePath);

        newFiles.push({
          name: file.name,
          url: publicUrl,
          type: file.type
        });
      }

      if (newFiles.length > 0) {
        const allFiles = [...uploadedFiles, ...newFiles];
        setUploadedFiles(allFiles);
        onFilesUploaded(allFiles.map(f => f.url));
        toast.success(`${newFiles.length} fichier(s) ajouté(s)`);
      }
      if (errors.length > 0) {
        setUploadError(errors.join(' • '));
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const friendly = explainUploadError(error, files[0]?.name || 'document');
      setUploadError(friendly);
      toast.error(friendly);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onFilesUploaded(newFiles.map(f => f.url));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="gap-2"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Paperclip className="w-4 h-4" />
          )}
          Joindre des fichiers
        </Button>
        <span className="text-xs text-muted-foreground">
          PDF, Word, PNG, JPEG (max 10 Mo)
        </span>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploadedFiles.map((file, index) => {
            const config = getFileTypeConfig(file.type);
            const Icon = config.icon;
            
            return (
              <Badge 
                key={index} 
                variant="secondary" 
                className="pl-2 pr-1 py-1 gap-1.5 max-w-[200px]"
              >
                <Icon className={cn("w-3 h-3 flex-shrink-0", config.color)} />
                <span className="truncate text-xs">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="ml-1 p-0.5 hover:bg-destructive/20 rounded"
                  disabled={disabled}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TaskFileUpload;
