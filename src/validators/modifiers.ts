/**
 * Property Validator - Modifier Validators
 *
 * Validators that modify other validators: optional, nullable
 */

import type { Validator } from '../types.js';
import { createValidator } from '../internal/core.js';

/**
 * Optional validator - standalone implementation for tree-shaking
 *
 * Makes a validator accept undefined in addition to its normal type.
 *
 * @example
 * ```typescript
 * const schema = optional(string());
 * validate(schema, 'hello');    // { ok: true, value: 'hello' }
 * validate(schema, undefined);  // { ok: true, value: undefined }
 * validate(schema, null);       // { ok: false, error: ... }
 * ```
 */
export function optional<T>(validator: Validator<T>): Validator<T | undefined> {
  const optionalValidator = createValidator(
    (data): data is T | undefined => data === undefined || validator.validate(data),
    (data) => validator.error(data)
  );
  // Expose metadata for JSON Schema introspection
  optionalValidator._isOptional = true;
  optionalValidator._innerValidator = validator as Validator<unknown>;
  return optionalValidator;
}

/**
 * Nullable validator - standalone implementation for tree-shaking
 *
 * Makes a validator accept null in addition to its normal type.
 *
 * @example
 * ```typescript
 * const schema = nullable(string());
 * validate(schema, 'hello');    // { ok: true, value: 'hello' }
 * validate(schema, null);       // { ok: true, value: null }
 * validate(schema, undefined);  // { ok: false, error: ... }
 * ```
 */
export function nullable<T>(validator: Validator<T>): Validator<T | null> {
  const nullableValidator = createValidator(
    (data): data is T | null => data === null || validator.validate(data),
    (data) => validator.error(data)
  );
  // Expose metadata for JSON Schema introspection
  nullableValidator._isNullable = true;
  nullableValidator._innerValidator = validator as Validator<unknown>;
  return nullableValidator;
}
