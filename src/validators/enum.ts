/**
 * Property Validator - Enum Validator
 *
 * Contains the enum_() validator - sugar for union of literals.
 */

import type { Validator } from '../types.js';
import { createValidator } from '../internal/core.js';
import { literal } from './literal.js';
import { union } from './union.js';

/**
 * Enum validator - standalone implementation for tree-shaking
 * Sugar for union of literals
 */
export function enum_<T extends readonly string[]>(
  values: T
): Validator<T[number]> {
  // Use standalone literal() and union() to avoid pulling in v namespace
  const literals = values.map((value) => literal(value));
  const unionValidator = union(literals as any);

  const validator = createValidator(
    (data): data is T[number] => unionValidator.validate(data),
    (data) => `Expected one of ${JSON.stringify(values)}, got ${JSON.stringify(data)}`
  );

  // Expose enum values for JSON Schema introspection
  (validator as any)._enumValues = values;

  return validator;
}
