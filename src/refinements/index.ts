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
} from './number.js';

// Array refinements
export {
  minItems,
  maxItems,
  itemCount,
  nonemptyArray,
} from './array.js';
