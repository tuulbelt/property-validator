/**
 * Property Validator - Literal Validator
 */

import type { Validator } from '../types.js';
import { createValidator, getTypeName } from '../internal/core.js';

/**
 * Literal validator - standalone implementation for tree-shaking
 *
 * Validates that data is exactly equal to the specified literal value.
 *
 * @example
 * ```typescript
 * const status = literal('active');
 * validate(status, 'active');   // { ok: true, value: 'active' }
 * validate(status, 'inactive'); // { ok: false, error: ... }
 *
 * const maxRetries = literal(3);
 * validate(maxRetries, 3);  // { ok: true, value: 3 }
 * validate(maxRetries, 5);  // { ok: false, error: ... }
 * ```
 */
export function literal<T extends string | number | boolean | null>(
  value: T
): Validator<T> {
  // v0.8.0 OPTIMIZATION: Create compiled validation function for JIT bypass
  const compiledValidate = (data: unknown): boolean => data === value;

  const validator = createValidator(
    (data): data is T => compiledValidate(data),
    (data) => `Expected literal value ${JSON.stringify(value)}, got ${getTypeName(data)}`
  );

  // Expose _compiled for unions to chain JIT bypass
  validator._compiled = compiledValidate;

  // v0.8.5: Store literal value for JIT union inlining
  (validator as any)._literalValue = value;

  return validator;
}
