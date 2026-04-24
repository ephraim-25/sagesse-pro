import { FileText, Image as ImageIcon, File, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatAttachment } from "./ChatAttachmentPicker";

function getIcon(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  if (type === "application/pdf" || type.includes("word")) return FileText;
  return File;
}

interface ChatAttachmentListProps {
  attachments: ChatAttachment[];
  isMine?: boolean;
}

export function ChatAttachmentList({ attachments, isMine }: ChatAttachmentListProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-1.5">
      {attachments.map((att, idx) => {
        const isImage = att.type?.startsWith("image/");
        if (isImage) {
          return (
            <a
              key={idx}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg overflow-hidden border max-w-[220px]"
            >
              <img src={att.url} alt={att.name} className="w-full h-auto object-cover" />
            </a>
          );
        }
        const Icon = getIcon(att.type || "");
        return (
          <a
            key={idx}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs hover:bg-accent/50 transition-colors max-w-[220px]",
              isMine ? "bg-primary-foreground/10 border-primary-foreground/20" : "bg-background"
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate flex-1">{att.name}</span>
            <Download className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
          </a>
        );
      })}
    </div>
  );
}
