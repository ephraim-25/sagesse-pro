import { useState, useRef, useEffect, useCallback } from "react";
import { useTaskMessages, type TaskMessage } from "@/hooks/useTaskMessages";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2, CheckCheck, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TaskChatProps {
  taskId: string;
  taskCreatorId: string | null;
  taskAssignedTo: string | null;
}

export function TaskChat({ taskId, taskCreatorId, taskAssignedTo }: TaskChatProps) {
  const { profile } = useAuth();
  const { messages, loading, typingUser, sendMessage, sendTyping, stopTyping, markAsRead } =
    useTaskMessages(taskId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isParticipant = profile?.id === taskCreatorId || profile?.id === taskAssignedTo;

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark as read when chat is visible
  useEffect(() => {
    markAsRead();
  }, [messages.length, markAsRead]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(input);
      setInput("");
      stopTyping();
    } catch {
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    sendTyping();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(stopTyping, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[400px] border border-border rounded-xl overflow-hidden bg-background">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Aucun message. Commencez la discussion !
          </p>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender_id === profile?.id;
          const senderName = msg.sender
            ? `${msg.sender.prenom} ${msg.sender.nom}`
            : "Inconnu";
          const initials = msg.sender
            ? `${msg.sender.prenom[0]}${msg.sender.nom[0]}`
            : "?";

          return (
            <div
              key={msg.id}
              className={cn("flex gap-2 max-w-[85%]", isMine ? "ml-auto flex-row-reverse" : "")}
            >
              {!isMine && (
                <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                {!isMine && (
                  <p className="text-[11px] text-muted-foreground mb-0.5 font-medium">
                    {senderName}
                  </p>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  )}
                >
                  {msg.content}
                </div>
                <div className={cn("flex items-center gap-1 mt-0.5", isMine ? "justify-end" : "")}>
                  <span className="text-[10px] text-muted-foreground">
                    {formatTime(msg.created_at)}
                  </span>
                  {isMine && (
                    msg.read ? (
                      <CheckCheck className="w-3 h-3 text-primary" />
                    ) : (
                      <Check className="w-3 h-3 text-muted-foreground" />
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Typing indicator */}
      {typingUser && (
        <div className="px-4 pb-1">
          <p className="text-xs text-muted-foreground italic animate-pulse">
            {typingUser} est en train d'écrire...
          </p>
        </div>
      )}

      {/* Input */}
      {isParticipant ? (
        <div className="p-3 border-t border-border flex gap-2">
          <Input
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrire un message..."
            className="flex-1 rounded-full"
            disabled={sending}
          />
          <Button
            size="icon"
            className="rounded-full flex-shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      ) : (
        <div className="p-3 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Seuls le créateur et l'agent assigné peuvent envoyer des messages.
          </p>
        </div>
      )}
    </div>
  );
}
