/**
 * Property Validator - Regex Patterns Module
 *
 * Standard patterns for common string format validation.
 * Extracted from index.ts for better code organization (v0.12.0).
 *
 * All patterns include length limits where applicable to prevent ReDoS attacks.
 */

// ============================================================================
// Date/Time Patterns (ISO 8601)
// ============================================================================

/** ISO 8601 datetime pattern - matches YYYY-MM-DDTHH:MM:SS with optional timezone */
export const DATETIME_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/;

/** ISO 8601 date pattern - matches YYYY-MM-DD */
export const DATE_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

/** ISO 8601 time pattern - matches HH:MM:SS with optional milliseconds */
export const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?$/;

// ============================================================================
// Network Patterns
// ============================================================================

/** Email pattern - follows RFC 5322 simplified format (rejects consecutive dots) */
export const EMAIL_PATTERN = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** URL pattern - matches http/https URLs */
export const URL_PATTERN = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

/** IPv4 pattern - matches valid IPv4 addresses */
export const IPV4_PATTERN = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

/** IPv6 pattern - matches valid IPv6 addresses (full and compressed) */
export const IPV6_PATTERN = /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?::[0-9a-fA-F]{1,4}){1,7}|::)$/;

// ============================================================================
// Identifier Patterns
// ============================================================================

/** UUID pattern - matches v1-v5 UUIDs */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** CUID pattern - starts with 'c', followed by 8+ alphanumeric chars */
export const CUID_PATTERN = /^c[^\s-]{8,}$/;

/** CUID2 pattern - lowercase alphanumeric only */
export const CUID2_PATTERN = /^[0-9a-z]+$/;

/** ULID pattern - 26 Crockford Base32 characters */
export const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;

/** NanoID pattern - 21 URL-safe characters */
export const NANOID_PATTERN = /^[A-Za-z0-9_-]{21}$/;

// ============================================================================
// Encoding Patterns
// ============================================================================

/** Base64 pattern - standard base64 with padding */
export const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

/** Hex pattern - hexadecimal string (non-empty) */
export const HEX_PATTERN = /^[0-9a-fA-F]+$/;

/** JWT pattern - three non-empty base64url segments separated by dots */
export const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

// ============================================================================
// Length Limits for ReDoS Prevention
// ============================================================================

/**
 * Maximum lengths for format validation (prevents ReDoS attacks)
 */
export const FORMAT_LIMITS = {
  /** RFC 5321: max 254 chars for email */
  EMAIL_MAX_LENGTH: 254,
  /** Practical limit for URLs */
  URL_MAX_LENGTH: 2083,
  /** IPv4: xxx.xxx.xxx.xxx */
  IPV4_MAX_LENGTH: 15,
  /** IPv6: max length including :: notation */
  IPV6_MAX_LENGTH: 45,
  /** CUID: typically 25-30 chars */
  CUID_MAX_LENGTH: 30,
  /** CUID2: variable length, typically up to 32 chars */
  CUID2_MAX_LENGTH: 32,
  /** Base64: reasonable limit for inline validation (1.5MB) */
  BASE64_MAX_LENGTH: 1_500_000,
  /** JWT: practical limit for tokens */
  JWT_MAX_LENGTH: 8_000,
} as const;
