/**
 * Property Validator - Tuple Validator
 *
 * Contains the tuple() validator for fixed-length arrays with per-index types.
 */

import type { PathSegment, Result, TupleType, ValidationOptions, Validator } from '../types.js';
import { ValidationError } from '../types.js';
import {
  createValidator,
  getTypeName,
  validateWithPath,
  ensureMutablePath,
} from '../internal/core.js';

/**
 * Tuple validator - standalone implementation for tree-shaking
 * Fixed-length array with per-index types
 */
export function tuple<T extends readonly Validator<any>[]>(
  validators: T
): Validator<TupleType<T>> {
  const validator = createValidator(
    (data): data is TupleType<T> => {
      if (!Array.isArray(data)) return false;
      if (data.length !== validators.length) return false;
      return validators.every((validator, index) =>
        validator.validate(data[index])
      );
    },
    (data) => {
      if (!Array.isArray(data)) {
        return `Expected tuple (array), got ${getTypeName(data)}`;
      }
      if (data.length !== validators.length) {
        return `Tuple must have exactly ${validators.length} element(s), got ${data.length}`;
      }
      const invalidIndex = validators.findIndex(
        (validator, index) => !validator.validate(data[index])
      );
      if (invalidIndex !== -1) {
        const v = validators[invalidIndex];
        return `Invalid element at index ${invalidIndex}: ${v!.error(data[invalidIndex])}`;
      }
      return 'Tuple validation failed';
    }
  );

  // Path-aware validation for tuple elements
  validator._validateWithPath = (data: unknown, path: readonly PathSegment[] | PathSegment[], seen: WeakSet<object>, depth: number, options: ValidationOptions): Result<TupleType<T>> => {
    if (!Array.isArray(data)) {
      const details = new ValidationError({
        message: `Expected tuple (array), got ${getTypeName(data)}`,
        path: path,
        value: data,
        expected: 'tuple',
        code: 'VALIDATION_ERROR',
      });
      return { ok: false, error: details.message, details };
    }

    // Check for circular references before recursing (only if enabled)
    if (options.checkCircular !== false) {
      if (seen.has(data)) {
        const details = new ValidationError({
          message: 'Circular reference detected',
          path,
          value: data,
          expected: 'non-circular structure',
          code: 'CIRCULAR_REFERENCE',
        });
        return { ok: false, error: 'Circular reference detected', details };
      }
      seen.add(data);
    }

    // Check length
    if (data.length !== validators.length) {
      const message = `Tuple must have exactly ${validators.length} element(s), got ${data.length}`;
      const details = new ValidationError({
        message,
        path,
        value: data,
        expected: `tuple with ${validators.length} elements`,
        code: 'VALIDATION_ERROR',
      });
      return { ok: false, error: message, details };
    }

    // Validate each element with index in path
    let mutablePath = ensureMutablePath(path);
    for (let i = 0; i < validators.length; i++) {
      mutablePath.push(i);
      const result = validateWithPath(validators[i]!, data[i], mutablePath, seen, depth + 1, options);

      if (!result.ok) {
        const wrappedError = `Invalid element at index ${i}: ${result.error}`;
        if (result.details) {
          const details = new ValidationError({
            message: wrappedError,
            path: result.details.path,
            value: result.details.value,
            expected: result.details.expected,
            code: result.details.code,
          });
          return { ok: false, error: wrappedError, details };
        }
        return { ok: false, error: wrappedError };
      }

      mutablePath.pop();
    }

    return { ok: true, value: data as TupleType<T> };
  };

  // Expose tuple validators for JSON Schema introspection
  (validator as any)._tupleValidators = validators;

  return validator;
}
