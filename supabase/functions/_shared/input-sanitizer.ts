/**
 * Shared input sanitization utilities for edge functions
 * Prevents XSS, SQL injection, and other malicious input
 */

/**
 * Sanitize text content by escaping HTML entities
 * Use this for any user-provided text that will be stored and later displayed
 */
export function sanitizeText(input: string | undefined | null, maxLength = 200): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\\/g, '&#x5c;')
    .trim()
    .substring(0, maxLength);
}

/**
 * Validate and sanitize activity descriptions
 * Only allows alphanumeric characters, common punctuation, and French accents
 */
export function sanitizeActivity(input: string | undefined | null, maxLength = 200): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove any control characters and normalize whitespace
  const cleaned = input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Allow alphanumeric, spaces, common punctuation, and French accents
  const allowed = cleaned.replace(/[^a-zA-Z0-9\s\-.,!?'":;()àéèêëïîôûùüçÀÉÈÊËÏÎÔÛÙÜÇ]/g, '');
  
  return sanitizeText(allowed, maxLength);
}

/**
 * Validate UUID format
 */
export function isValidUUID(input: string | undefined | null): boolean {
  if (!input || typeof input !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);
}

/**
 * Validate status values against allowed list
 */
export function isValidStatus<T extends string>(input: string | undefined | null, allowedValues: T[]): input is T {
  if (!input || typeof input !== 'string') return false;
  return allowedValues.includes(input as T);
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: number | undefined | null, min: number, max: number): number | null {
  if (input === undefined || input === null || typeof input !== 'number' || isNaN(input)) {
    return null;
  }
  return Math.max(min, Math.min(max, Math.floor(input)));
}

/**
 * Validate and sanitize reason/comment text
 * More restrictive than general activity - for audit trail entries
 */
export function sanitizeReason(input: string | undefined | null, maxLength = 100): string {
  if (!input || typeof input !== 'string') return '';
  
  // Same as activity but shorter default length
  return sanitizeActivity(input, maxLength);
}

/**
 * Pseudonymize user ID for logging
 * Only show first 8 characters to prevent full ID exposure in logs
 */
export function pseudonymizeId(id: string | undefined | null): string {
  if (!id || typeof id !== 'string') return 'unknown';
  return id.substring(0, 8) + '...';
}

/**
 * Sanitize error for client response
 * Prevents leaking internal error details
 */
export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Map known errors to safe messages
    if (error.message.includes('duplicate key')) {
      return 'Cette entrée existe déjà';
    }
    if (error.message.includes('foreign key')) {
      return 'Référence invalide';
    }
    if (error.message.includes('not found')) {
      return 'Ressource non trouvée';
    }
    if (error.message.includes('permission') || error.message.includes('denied')) {
      return 'Permission refusée';
    }
  }
  return 'Erreur serveur';
}
