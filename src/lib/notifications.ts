import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
  | "task_assigned"
  | "task_message"
  | "approval_request"
  | "approval_decision"
  | "force_checkout"
  | "telework_blocked"
  | "admin_alert"
  | "info"
  | "warning"
  | "success";

export interface NotificationMeta {
  task_id?: string;
  message_id?: string;
  target_user_id?: string;
  approval_id?: string;
  link?: string;
  [key: string]: unknown;
}

export interface SendNotificationParams {
  user_id: string;
  title: string;
  body?: string | null;
  type?: NotificationType;
  meta?: NotificationMeta;
  sender_id?: string | null;
}

/**
 * Send a single notification. RLS allows insert when sender is admin/president,
 * the manager of the target, or self-notification.
 */
export async function sendNotification(params: SendNotificationParams) {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.user_id,
    title: params.title,
    body: params.body ?? null,
    type: params.type ?? "info",
    meta: (params.meta ?? {}) as never,
    sender_id: params.sender_id ?? null,
  });
  if (error) {
    // Silent fail – notification errors should not block the main action.
    console.warn("[notifications] insert failed:", error.message);
  }
}

/**
 * Notify all admins about a critical platform event.
 * Uses a SECURITY DEFINER RPC so any authenticated user (agents, chefs…)
 * can deliver alerts to admins — total platform transparency.
 */
export async function notifyAdmins(params: Omit<SendNotificationParams, "user_id">) {
  const { error } = await supabase.rpc("notify_all_admins", {
    p_title: params.title,
    p_body: params.body ?? null,
    p_type: params.type ?? "admin_alert",
    p_meta: (params.meta ?? {}) as never,
  });
  if (error) {
    console.warn("[notifications] notify_all_admins failed:", error.message);
  }
}

/**
 * Build the in-app deep link for a notification based on its meta payload.
 */
export function buildNotificationLink(notif: {
  type?: string | null;
  meta?: NotificationMeta | null;
}): string | null {
  const meta = (notif.meta ?? {}) as NotificationMeta;
  if (meta.link && typeof meta.link === "string") return meta.link;

  switch (notif.type) {
    case "task_assigned":
    case "task_message":
      return meta.task_id ? `/taches?task=${meta.task_id}&tab=chat` : "/taches";
    case "approval_request":
    case "approval_decision":
      return "/admin";
    case "force_checkout":
    case "telework_blocked":
      return "/teletravail";
    case "admin_alert":
      return meta.task_id ? `/taches?task=${meta.task_id}` : "/admin";
    default:
      return null;
  }
}
