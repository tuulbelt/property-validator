/**
 * String Refinement Functions (Tree-Shakeable)
 *
 * Each function is a separate export, enabling bundlers to eliminate unused refinements.
 * Import only what you need:
 *
 * @example
 * import { string, email, minLength } from 'property-validator';
 * const EmailSchema = string(email(), minLength(5));
 */

import type { StringRefinement } from '../types.js';

// ============================================================================
// Validation Patterns
// ============================================================================

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^https?:\/\/[^\s]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
const IPV4_PATTERN = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_PATTERN = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;

// ID Format Patterns (v0.9.5)
const CUID_PATTERN = /^c[^\s-]{8,}$/;
const CUID2_PATTERN = /^[0-9a-z]+$/;
const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
const NANOID_PATTERN = /^[A-Za-z0-9_-]{21}$/;

// Encoding Patterns (v0.9.5)
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const HEX_PATTERN = /^[0-9a-fA-F]+$/;
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

// ============================================================================
// Length Refinements
// ============================================================================

/**
 * Minimum string length
 * @example string(minLength(1)) // At least 1 character
 */
export function minLength(n: number): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => s.length >= n,
    message: `String must be at least ${n} character(s)`,
  };
}

/**
 * Maximum string length
 * @example string(maxLength(100)) // At most 100 characters
 */
export function maxLength(n: number): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => s.length <= n,
    message: `String must be at most ${n} character(s)`,
  };
}

/**
 * Exact string length
 * @example string(length(5)) // Exactly 5 characters
 */
export function length(n: number): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => s.length === n,
    message: `String must be exactly ${n} character(s)`,
  };
}

/**
 * Non-empty string (at least 1 character)
 * @example string(nonempty())
 */
export function nonempty(): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => s.length > 0,
    message: 'String cannot be empty',
  };
}

// ============================================================================
// Format Refinements
// ============================================================================

/**
 * Valid email format
 * @example string(email())
 */
export function email(): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => EMAIL_PATTERN.test(s),
    message: 'Must be a valid email address',
  };
}

/**
 * Valid URL format (http/https)
 * @example string(url())
 */
export function url(): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => URL_PATTERN.test(s),
    message: 'Must be a valid URL',
  };
}

/**
 * Valid UUID format (v1-v5)
 * @example string(uuid())
 */
export function uuid(): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => UUID_PATTERN.test(s),
    message: 'Must be a valid UUID',
  };
}

/**
 * Custom regex pattern
 * @example string(pattern(/^\d{3}-\d{4}$/, 'phone number'))
 */
export function pattern(regex: RegExp, name?: string): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => regex.test(s),
    message: name ? `Must be a valid ${name}` : `String must match pattern ${regex}`,
  };
}

// ============================================================================
// Content Refinements
// ============================================================================

/**
 * String must start with prefix
 * @example string(startsWith('https://'))
 */
export function startsWith(prefix: string): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => s.startsWith(prefix),
    message: `String must start with "${prefix}"`,
  };
}

/**
 * String must end with suffix
 * @example string(endsWith('.json'))
 */
export function endsWith(suffix: string): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => s.endsWith(suffix),
    message: `String must end with "${suffix}"`,
  };
}

/**
 * String must contain substring
 * @example string(includes('@'))
 */
export function includes(substring: string): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => s.includes(substring),
    message: `String must contain "${substring}"`,
  };
}

// ============================================================================
// Date/Time Refinements
// ============================================================================

/**
 * Valid ISO 8601 datetime (YYYY-MM-DDTHH:MM:SS)
 * @example string(datetime())
 */
export function datetime(): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => DATETIME_PATTERN.test(s),
    message: 'Must be a valid ISO 8601 datetime (YYYY-MM-DDTHH:MM:SS)',
  };
}

/**
 * Valid ISO 8601 date (YYYY-MM-DD)
 * @example string(date())
 */
export function date(): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => DATE_PATTERN.test(s),
    message: 'Must be a valid ISO 8601 date (YYYY-MM-DD)',
  };
}

/**
 * Valid ISO 8601 time (HH:MM:SS)
 * @example string(time())
 */
export function time(): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => TIME_PATTERN.test(s),
    message: 'Must be a valid ISO 8601 time (HH:MM:SS)',
  };
}

// ============================================================================
// Network Refinements
// ============================================================================

/**
 * Valid IP address (IPv4 or IPv6)
 * @example string(ip())
 */
export function ip(): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => IPV4_PATTERN.test(s) || IPV6_PATTERN.test(s),
    message: 'Must be a valid IP address (IPv4 or IPv6)',
  };
}

/**
 * Valid IPv4 address
 * @example string(ipv4())
 */
export function ipv4(): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => IPV4_PATTERN.test(s),
    message: 'Must be a valid IPv4 address',
  };
}

/**
 * Valid IPv6 address
 * @example string(ipv6())
 */
export function ipv6(): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => IPV6_PATTERN.test(s),
    message: 'Must be a valid IPv6 address',
  };
}

// ============================================================================
// ID Format Refinements (v0.9.5)
// ============================================================================

/**
 * Valid CUID (Collision-resistant Unique ID)
 * @example string(cuid())
 * @see https://github.com/paralleldrive/cuid
 */
export function cuid(): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => CUID_PATTERN.test(s),
    message: 'Must be a valid CUID',
  };
}

/**
 * Valid CUID2 (Collision-resistant Unique ID v2)
 * @example string(cuid2())
 * @see https://github.com/paralleldrive/cuid2
 */
export function cuid2(): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => s.length > 0 && CUID2_PATTERN.test(s),
    message: 'Must be a valid CUID2',
  };
}

/**
 * Valid ULID (Universally Unique Lexicographically Sortable Identifier)
 * @example string(ulid())
 * @see https://github.com/ulid/spec
 */
export function ulid(): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => ULID_PATTERN.test(s),
    message: 'Must be a valid ULID',
  };
}

/**
 * Valid NanoID (URL-friendly unique ID, default 21 characters)
 * @example string(nanoid())
 * @see https://github.com/ai/nanoid
 */
export function nanoid(): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => NANOID_PATTERN.test(s),
    message: 'Must be a valid NanoID',
  };
}

// ============================================================================
// Encoding Refinements (v0.9.5)
// ============================================================================

/**
 * Valid Base64 encoded string
 * @example string(base64())
 */
export function base64(): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => s.length === 0 || BASE64_PATTERN.test(s),
    message: 'Must be a valid Base64 string',
  };
}

/**
 * Valid hexadecimal string
 * @example string(hex())
 */
export function hex(): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => s.length > 0 && HEX_PATTERN.test(s),
    message: 'Must be a valid hexadecimal string',
  };
}

/**
 * Valid JWT (JSON Web Token)
 * @example string(jwt())
 * @see https://jwt.io
 */
export function jwt(): StringRefinement {
  return {
    _kind: 'string-refinement',
    check: (s) => JWT_PATTERN.test(s),
    message: 'Must be a valid JWT',
  };
}
