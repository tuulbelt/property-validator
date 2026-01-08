/**
 * Tree-Shakeable Refinement Functions
 *
 * All refinements are exported individually for optimal tree-shaking.
 * Import only what you need from the main entry point:
 *
 * @example
 * import { string, email, minLength, number, int, positive } from 'property-validator';
 *
 * const EmailSchema = string(email(), minLength(5));
 * const AgeSchema = number(int(), positive());
 */

// String refinements
export {
  minLength,
  maxLength,
  length,
  nonempty,
  email,
  url,
  uuid,
  pattern,
  startsWith,
  endsWith,
  includes,
  datetime,
  date,
  time,
  ip,
  ipv4,
  ipv6,
  // ID format refinements (v0.9.5)
  cuid,
  cuid2,
  ulid,
  nanoid,
  // Encoding refinements (v0.9.5)
  base64,
  hex,
  jwt,
} from './string.js';

// Number refinements
export {
  int,
  safeInt,
  positive,
  negative,
  nonnegative,
  nonpositive,
  min,
  max,
  range,
  finite,
  multipleOf,
  // Extended number refinements (v0.9.5)
  port,
  latitude,
  longitude,
  percentage,
} from './number.js';

// Array refinements
export {
  minItems,
  maxItems,
  itemCount,
  nonemptyArray,
} from './array.js';
