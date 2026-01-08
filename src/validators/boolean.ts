/**
 * Property Validator - Boolean Validator
 */

import type { Validator } from '../types.js';
import { createValidator, validateBoolean, booleanError } from '../internal/core.js';

/**
 * Boolean validator - standalone implementation for tree-shaking
 *
 * @example
 * ```typescript
 * const isActive = boolean();
 * validate(isActive, true);  // { ok: true, value: true }
 * validate(isActive, 'yes'); // { ok: false, error: 'Expected boolean, got string' }
 * ```
 */
export function boolean(): Validator<boolean> {
  const validator = createValidator(validateBoolean, booleanError);
  validator._type = 'boolean';
  validator._compiled = validateBoolean;
  return validator;
}
