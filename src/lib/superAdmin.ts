/**
 * Super administrator marker.
 * The super admin is the platform owner: Ephraim YABA (ephraimyaba7@gmail.com).
 * He always has full admin role plus a visual marker across the UI.
 */
export const SUPER_ADMIN_EMAIL = "ephraimyaba7@gmail.com";

export function isSuperAdminEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase() === SUPER_ADMIN_EMAIL;
}
