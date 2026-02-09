import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  X, 
  FileText, 
  Image as ImageIcon, 
  File, 
  Loader2,
  Paperclip
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

    // Validate files
    for (const file of files) {
      if (!Object.keys(ALLOWED_TYPES).includes(file.type)) {
        toast.error(`Type de fichier non supporté: ${file.name}. Utilisez PDF, Word, PNG ou JPEG.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Fichier trop volumineux: ${file.name}. Maximum 10 Mo.`);
        return;
      }
    }

    setUploading(true);
    const newFiles: UploadedFile[] = [];

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
          toast.error(`Erreur lors de l'upload de ${file.name}`);
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
        toast.success(`${newFiles.length} fichier(s) uploadé(s)`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload');
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
