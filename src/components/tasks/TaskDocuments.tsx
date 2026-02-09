import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Image as ImageIcon, 
  File, 
  Download,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskDocumentsProps {
  documents: string[];
  className?: string;
}

const getFileInfo = (url: string) => {
  const fileName = url.split('/').pop() || 'file';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  if (['pdf'].includes(ext)) {
    return { icon: FileText, label: 'PDF', color: 'text-red-500', bgColor: 'bg-red-500/10' };
  }
  if (['doc', 'docx'].includes(ext)) {
    return { icon: FileText, label: 'Word', color: 'text-blue-500', bgColor: 'bg-blue-500/10' };
  }
  if (['png', 'jpg', 'jpeg'].includes(ext)) {
    return { icon: ImageIcon, label: 'Image', color: 'text-green-500', bgColor: 'bg-green-500/10' };
  }
  return { icon: File, label: 'Fichier', color: 'text-muted-foreground', bgColor: 'bg-muted' };
};

export const TaskDocuments = ({ documents, className }: TaskDocumentsProps) => {
  if (!documents || documents.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {documents.map((url, index) => {
        const info = getFileInfo(url);
        const Icon = info.icon;
        const fileName = decodeURIComponent(url.split('/').pop() || 'document');
        // Clean up the generated filename to show something more readable
        const displayName = fileName.length > 25 
          ? `${info.label} ${index + 1}` 
          : fileName;

        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border hover:shadow-sm transition-all group"
            style={{ backgroundColor: 'var(--card)' }}
          >
            <div className={cn("p-1 rounded", info.bgColor)}>
              <Icon className={cn("w-3 h-3", info.color)} />
            </div>
            <span className="max-w-[100px] truncate">{displayName}</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        );
      })}
    </div>
  );
};

export default TaskDocuments;
