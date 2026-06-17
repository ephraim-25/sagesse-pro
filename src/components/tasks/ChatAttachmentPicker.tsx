import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Loader2, X, FileText, Image as ImageIcon, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ChatAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

interface ChatAttachmentPickerProps {
  attachments: ChatAttachment[];
  onChange: (next: ChatAttachment[]) => void;
  disabled?: boolean;
}

export const CHAT_ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
export const CHAT_ATTACHMENT_ACCEPT = "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt";
const MAX_SIZE = CHAT_ATTACHMENT_MAX_SIZE;
const ACCEPTED = CHAT_ATTACHMENT_ACCEPT;

/**
 * Uploads files to the task chat bucket and returns ChatAttachment metadata.
 * Used by the picker AND by the drag-and-drop handler in TaskChat.
 */
export async function uploadChatFiles(
  files: File[],
  onError: (msg: string) => void
): Promise<ChatAttachment[]> {
  const out: ChatAttachment[] = [];
  for (const file of files) {
    if (file.size > MAX_SIZE) {
      onError(`« ${file.name} » dépasse la taille de 10 Mo.`);
      continue;
    }
    const ext = file.name.split(".").pop() || "bin";
    const path = `chat/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("task-chat-attachments")
      .upload(path, file, { contentType: file.type });
    if (error) {
      onError(explainError(error as { message?: string; statusCode?: string | number }, file.name));
      continue;
    }
    // Bucket is private; persist the storage path and sign on demand at read time.
    out.push({ url: path, name: file.name, type: file.type, size: file.size });
  }
  return out;
}

/** Resolve a stored attachment reference (path or legacy public URL) to a usable URL. */
export async function resolveAttachmentUrl(stored: string): Promise<string> {
  if (!stored) return stored;
  if (/^https?:\/\//i.test(stored)) return stored; // legacy entries
  const { data, error } = await supabase.storage
    .from("task-chat-attachments")
    .createSignedUrl(stored, 60 * 60);
  if (error || !data?.signedUrl) return stored;
  return data.signedUrl;
}

function explainError(err: { message?: string; statusCode?: string | number } | null | undefined, name: string) {
  const msg = (err?.message || "").toLowerCase();
  const status = String(err?.statusCode ?? "");
  if (msg.includes("row-level security") || msg.includes("rls") || status === "403") {
    return `Accès refusé pour « ${name} ». Vous devez être connecté pour partager une pièce jointe.`;
  }
  if (msg.includes("bucket") && msg.includes("not found")) {
    return `L'espace de stockage est indisponible. Réessayez plus tard.`;
  }
  if (msg.includes("exceeded") || status === "413") {
    return `« ${name} » dépasse la taille autorisée (10 Mo).`;
  }
  if (msg.includes("network") || msg.includes("failed to fetch")) {
    return `Connexion interrompue lors de l'envoi de « ${name} ». Vérifiez votre réseau.`;
  }
  return err?.message ? `Échec de l'envoi de « ${name} » : ${err.message}` : `Échec de l'envoi de « ${name} ».`;
}

function getIcon(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  if (type === "application/pdf" || type.includes("word")) return FileText;
  return File;
}

export function ChatAttachmentPicker({ attachments, onChange, disabled }: ChatAttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = () => inputRef.current?.click();

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await uploadChatFiles(files, (m) => toast.error(m));
      if (uploaded.length > 0) onChange([...attachments, ...uploaded]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (idx: number) => {
    const next = attachments.filter((_, i) => i !== idx);
    onChange(next);
  };

  return (
    <div className="space-y-2" data-testid="chat-attachment-picker">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED}
        className="hidden"
        onChange={handleFiles}
        disabled={disabled || uploading}
        data-testid="chat-attachment-input"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full flex-shrink-0"
        onClick={handlePick}
        disabled={disabled || uploading}
        title="Joindre une image ou un fichier"
        data-testid="chat-attachment-button"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
      </Button>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-2">
          {attachments.map((att, idx) => {
            const Icon = getIcon(att.type);
            const isImage = att.type.startsWith("image/");
            return (
              <div
                key={idx}
                className={cn(
                  "relative flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md border bg-muted/50 text-xs max-w-[180px]"
                )}
              >
                {isImage ? (
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="truncate">{att.name}</span>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="p-0.5 hover:bg-destructive/20 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
