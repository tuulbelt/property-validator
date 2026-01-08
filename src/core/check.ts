/**
 * Property Validator - Boolean Check API
 *
 * Fast boolean-only validation without error details.
 */

import type { Validator } from '../types.js';

/**
 * Boolean-only validation without error details (v0.8.5)
 *
 * Maximum performance validation that returns only true/false.
 * Use when you don't need error messages and want maximum throughput.
 *
 * @param validator - The validator to check against
 * @param data - The data to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * ```typescript
 * const UserSchema = v.object({ name: v.string(), age: v.number() });
 *
 * // Fast boolean check (no error details)
 * if (check(UserSchema, data)) {
 *   // data is valid
 *   processUser(data);
 * }
 *
 * // For error details, use validate() instead:
 * const result = validate(UserSchema, data);
 * if (!result.ok) console.log(result.error);
 * ```
 */
export function check<T>(validator: Validator<T>, data: unknown): boolean {
  // v0.8.5 OPTIMIZATION: Direct JIT bypass for maximum speed
  // Uses _compiled when available - returns boolean directly without Result allocation
  // This is the fastest possible validation path
  if (validator._compiled && !validator._hasRefinements) {
    return validator._compiled(data);
  }

  // Fallback: use validator's internal validate method (returns boolean)
  // This is still fast as it skips Result allocation
  return validator.validate(data);
}
