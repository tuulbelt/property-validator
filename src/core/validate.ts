/**
 * Property Validator - Core Validation API
 *
 * Main validation functions for validating data against schemas.
 */

import type {
  Result,
  ValidationOptions,
  Validator,
} from '../types.js';

import {
  validateWithPath,
  validateFast,
} from '../internal/core.js';

/**
 * Validate data against a validator
 *
 * @param validator - Validator instance
 * @param data - Unknown data to validate
 * @param options - Validation options (maxDepth, maxProperties, maxItems)
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validate(v.string(), "hello");
 * if (result.ok) {
 *   console.log(result.value); // Type: string
 * } else {
 *   console.log(result.details?.format('color')); // Formatted error
 * }
 *
 * // With security limits
 * const result2 = validate(v.object({ nested: v.object({ deep: v.string() }) }), data, { maxDepth: 2 });
 * ```
 */
export function validate<T>(validator: Validator<T>, data: unknown, options?: ValidationOptions): Result<T> {
  const opts = options || {};

  // Determine if we need full validation with tracking
  const needsCircularDetection = opts.checkCircular === true;
  const needsSecurityLimits = opts.maxDepth !== undefined || opts.maxProperties !== undefined || opts.maxItems !== undefined;

  // Fast path: no tracking overhead
  // OPTIMIZATION: Skip path/WeakSet allocation when not needed (3-5x speedup)
  if (!needsCircularDetection && !needsSecurityLimits) {
    return validateFast(validator, data);
  }

  // Full path: with circular detection and/or security limits
  const seen = needsCircularDetection ? new WeakSet() : new WeakSet(); // Always allocate to avoid null checks
  return validateWithPath(validator, data, [], seen, 0, opts);
}

// Re-export validateWithPath for internal use by validators
export { validateWithPath } from '../internal/core.js';
