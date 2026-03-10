import { useState } from "react";
import { Bell, Check, CheckCheck, BellOff, BellRing, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "@/hooks/useNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, string> = {
  approval_request: "📋",
  force_checkout: "⏹️",
  task_assigned: "📝",
  info: "ℹ️",
  warning: "⚠️",
  success: "✅",
};

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { permission, isSupported, requestPermission } = usePushNotifications();
  const [open, setOpen] = useState(false);

  const handleEnablePush = async () => {
    await requestPermission();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="w-5 h-5 animate-pulse" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={markAllAsRead}
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                Tout lire
              </Button>
            )}
          </div>
        </div>

        {/* Push notification prompt */}
        {isSupported && permission === "default" && (
          <div className="px-4 py-2 bg-muted/50 border-b border-border">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Recevoir les notifications même en arrière-plan ?
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={handleEnablePush}
              >
                Activer
              </Button>
            </div>
          </div>
        )}

        {/* Notification list */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BellOff className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3",
                    !notif.read && "bg-primary/5"
                  )}
                  onClick={() => {
                    if (!notif.read) markAsRead(notif.id);
                  }}
                >
                  <span className="text-lg mt-0.5 shrink-0">
                    {typeIcons[notif.type || "info"] || "🔔"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        "text-sm leading-tight",
                        !notif.read && "font-semibold"
                      )}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      )}
                    </div>
                    {notif.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.body}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {notif.created_at
                        ? formatDistanceToNow(new Date(notif.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })
                        : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
