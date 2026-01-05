/**
 * Property Validator - Lite entry point (v0.9.2)
 *
 * Minimal bundle size entry point for tree-shaking optimized builds.
 * Excludes the v namespace object and compile functions.
 *
 * Bundle size comparison:
 * - Full import (@tuulbelt/property-validator): ~30KB
 * - /v import (@tuulbelt/property-validator/v): ~30KB
 * - /lite import (@tuulbelt/property-validator/lite): ~8-12KB (depending on validators used)
 *
 * @example
 * ```typescript
 * // Minimal usage - only imports what you use
 * import { validate, string, number, object } from '@tuulbelt/property-validator/lite';
 *
 * const UserSchema = object({
 *   name: string(),
 *   age: number()
 * });
 *
 * const result = validate(UserSchema, data);
 * ```
 *
 * @example
 * ```typescript
 * // With refinements (tree-shakeable)
 * import { validate, string, number, email, positive } from '@tuulbelt/property-validator/lite';
 *
 * const EmailSchema = string(email());
 * const AgeSchema = number(positive());
 * ```
 */

// Core validation functions (always needed)
export { validate, check } from './index.js';

// Named validator exports (tree-shakeable)
export {
  // Primitives
  string,
  number,
  boolean,
  // Collections
  array,
  tuple,
  object,
  // Modifiers
  optional,
  nullable,
  // Special types
  union,
  literal,
  lazy,
  enum_,
} from './index.js';

// String refinements (tree-shakeable)
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
} from './refinements/string.js';

// Number refinements (tree-shakeable)
export {
  int,
  safeInt,
  finite,
  positive,
  negative,
  nonnegative,
  nonpositive,
  min,
  max,
  range,
  multipleOf,
} from './refinements/number.js';

// Array refinements (tree-shakeable)
export {
  minItems,
  maxItems,
  itemCount,
  nonemptyArray,
} from './refinements/array.js';

// Re-export types
export type {
  Validator,
  Result,
  ValidationError,
  StringValidator,
  NumberValidator,
  ArrayValidator,
  PathSegment,
  ValidationOptions,
  StringRefinement,
  NumberRefinement,
  ArrayRefinement,
} from './types.js';
