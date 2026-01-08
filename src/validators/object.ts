/**
 * Property Validator - Object and Record Validators
 *
 * Contains the object() and record() validators.
 */

import type { ObjectValidator, PathSegment, Result, ValidationOptions, Validator } from '../types.js';
import { ValidationError } from '../types.js';
import {
  createValidator,
  getTypeName,
  validateWithPath,
  ensureMutablePath,
} from '../internal/core.js';
import { validate } from '../core/validate.js';
import { compileObjectValidator } from '../jit.js';

/**
 * Object validator - standalone implementation for tree-shaking
 */
export function object<T extends Record<string, unknown>>(
  shape: { [K in keyof T]: Validator<T[K]> },
  options?: { strict?: boolean; passthrough?: boolean }
): ObjectValidator<T> {
  const strictMode = options?.strict ?? false;
  const passthroughMode = options?.passthrough ?? false;
  const schemaKeys = new Set(Object.keys(shape));
  const validator = createValidator(
    (data): data is T => {
      if (typeof data !== 'object' || data === null) {
        return false;
      }
      const obj = data as Record<string, unknown>;

      // In strict mode, reject unknown keys
      if (strictMode) {
        const dataKeys = Object.keys(obj);
        for (const key of dataKeys) {
          if (!schemaKeys.has(key)) {
            return false;
          }
        }
      }

      return Object.entries(shape).every(([key, fieldValidator]) =>
        validate(fieldValidator, obj[key]).ok
      );
    },
    (data) => {
      if (typeof data !== 'object' || data === null) {
        return `Expected object, got ${getTypeName(data)}`;
      }
      const obj = data as Record<string, unknown>;

      // In strict mode, report unknown keys
      if (strictMode) {
        const dataKeys = Object.keys(obj);
        for (const key of dataKeys) {
          if (!schemaKeys.has(key)) {
            return `Unknown key '${key}' in strict mode`;
          }
        }
      }

      for (const [key, fieldValidator] of Object.entries(shape)) {
        const result = validate(fieldValidator, obj[key]);
        if (!result.ok) {
          return `Invalid property '${key}': ${result.error}`;
        }
      }
      return 'Unknown validation error';
    }
  );

  // PHASE 1 OPTIMIZATION: Only set _transform if properties actually have transforms/defaults
  const hasTransforms = Object.values(shape).some(
    (fieldValidator) => fieldValidator._transform !== undefined || fieldValidator._default !== undefined
  );

  // PHASE 6 OPTIMIZATION: Pre-compile object validator for fast path
  const compiledValidator = compileObjectValidator(shape);
  const hasFieldRefinements = Object.values(shape).some(
    (fieldValidator) => fieldValidator._hasRefinements === true
  );
  // Cannot use compiled validator in strict mode (needs extra key checking)
  const isPlainObject = !hasTransforms && !hasFieldRefinements && !strictMode;

  // v0.8.0 OPTIMIZATION: Expose compiled validator for validateFast() bypass
  // Note: Cannot use compiled path for strict mode objects (needs extra key check)
  if (isPlainObject) {
    validator._compiled = compiledValidator;
  }

  if (hasTransforms) {
    // Store transformation function to apply transforms/defaults to object properties
    validator._transform = (data: any): T => {
      const obj = data as Record<string, unknown>;
      let result: Record<string, unknown> | null = null;

      for (const [key, fieldValidator] of Object.entries(shape)) {
        const fieldResult = validate(fieldValidator, obj[key]);
        if (fieldResult.ok) {
          const originalValue = obj[key];
          const transformedValue = fieldResult.value;

          if (originalValue !== transformedValue) {
            if (result === null) {
              result = { ...obj };
            }
            result[key] = transformedValue;
          }
        }
      }

      return (result ?? obj) as T;
    };
  }

  // Path-aware validation for nested errors
  validator._validateWithPath = (data: unknown, path: readonly PathSegment[] | PathSegment[], seen: WeakSet<object>, depth: number, options: ValidationOptions): Result<T> => {
    if (typeof data !== 'object' || data === null) {
      const details = new ValidationError({
        message: `Expected object, got ${getTypeName(data)}`,
        path: path,
        value: data,
        expected: 'object',
        code: 'VALIDATION_ERROR',
      });
      return { ok: false, error: details.message, details };
    }

    // PHASE 6 OPTIMIZATION: Fast path for plain objects with valid data
    if (isPlainObject &&
        !validator._hasRefinements &&
        options.checkCircular === false &&
        options.maxProperties === undefined) {
      if (compiledValidator(data)) {
        return { ok: true, value: data as T };
      }
    }

    // Check maximum properties limit
    const maxProperties = options.maxProperties ?? Infinity;
    const propertyCount = Object.keys(data).length;
    if (propertyCount > maxProperties) {
      const message = `Object exceeds maximum properties limit (${maxProperties})`;
      const details = new ValidationError({
        message,
        path,
        value: data,
        expected: `object with at most ${maxProperties} properties`,
        code: 'MAX_PROPERTIES_EXCEEDED',
      });
      return { ok: false, error: message, details };
    }

    // Check for circular references before recursing
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

    const obj = data as Record<string, unknown>;

    // In strict mode, reject unknown keys with path-aware errors
    if (strictMode) {
      const dataKeys = Object.keys(obj);
      for (const key of dataKeys) {
        if (!schemaKeys.has(key)) {
          const message = `Unknown key '${key}' in strict mode`;
          const details = new ValidationError({
            message,
            path: [...ensureMutablePath(path), key],
            value: obj[key],
            expected: `one of: ${[...schemaKeys].join(', ')}`,
            code: 'UNKNOWN_KEY',
          });
          return { ok: false, error: message, details };
        }
      }
    }

    let mutablePath = ensureMutablePath(path);
    for (const [key, fieldValidator] of Object.entries(shape)) {
      mutablePath.push(key);
      const result = validateWithPath(fieldValidator, obj[key], mutablePath, seen, depth + 1, options);

      if (!result.ok) {
        const wrappedError = `Invalid property '${key}': ${result.error}`;
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

    // Check refinements if present
    if (validator._hasRefinements && !validator.validate(data)) {
      const errorMessage = validator.error(data);
      const details = new ValidationError({
        message: errorMessage,
        path,
        value: data,
        expected: 'valid object',
        code: 'VALIDATION_ERROR',
      });
      return { ok: false, error: errorMessage, details };
    }

    // All fields valid, apply transform if needed
    const transformed = validator._transform ? validator._transform(data) : data;

    return { ok: true, value: transformed as T };
  };

  // Store shape for compilation optimization
  (validator as any)._shape = shape;
  (validator as any)._strict = strictMode;
  (validator as any)._passthrough = passthroughMode;

  // Create ObjectValidator with .strict() and .passthrough() methods
  const objectValidator = validator as ObjectValidator<T>;

  /**
   * Return a new object validator that rejects unknown keys
   */
  objectValidator.strict = (): ObjectValidator<T> => {
    return object<T>(shape, { strict: true, passthrough: false });
  };

  /**
   * Return a new object validator that allows unknown keys through
   */
  objectValidator.passthrough = (): ObjectValidator<T> => {
    return object<T>(shape, { strict: false, passthrough: true });
  };

  return objectValidator;
}

/**
 * Record validator - validates objects with dynamic keys (v0.11.0)
 *
 * Similar to TypeScript's Record<K, V> type. Validates that all keys
 * match the key validator and all values match the value validator.
 *
 * @param keyValidator - Validator for object keys (typically v.string())
 * @param valueValidator - Validator for object values
 * @returns Validator for Record<K, V>
 *
 * @example
 * ```typescript
 * const StringToNumber = v.record(v.string(), v.number());
 * StringToNumber.validate({ a: 1, b: 2 }) // true
 * StringToNumber.validate({ a: 'one' }) // false - value must be number
 *
 * // With key validation
 * const EmailToUser = v.record(v.string().email(), UserSchema);
 * ```
 */
export function record<K extends string, V>(
  keyValidator: Validator<K>,
  valueValidator: Validator<V>
): Validator<Record<K, V>> {
  const validator = createValidator(
    (data): data is Record<K, V> => {
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return false;
      }
      const obj = data as Record<string, unknown>;
      return Object.entries(obj).every(([key, value]) =>
        keyValidator.validate(key) && valueValidator.validate(value)
      );
    },
    (data) => {
      if (typeof data !== 'object' || data === null) {
        return `Expected object, got ${getTypeName(data)}`;
      }
      if (Array.isArray(data)) {
        return 'Expected object, got array';
      }
      const obj = data as Record<string, unknown>;
      for (const [key, value] of Object.entries(obj)) {
        if (!keyValidator.validate(key)) {
          return `Invalid key '${key}': ${keyValidator.error(key)}`;
        }
        if (!valueValidator.validate(value)) {
          return `Invalid value for key '${key}': ${valueValidator.error(value)}`;
        }
      }
      return 'Unknown validation error';
    }
  );

  // Path-aware validation for nested errors
  validator._validateWithPath = (data: unknown, path: readonly PathSegment[] | PathSegment[], seen: WeakSet<object>, depth: number, options: ValidationOptions): Result<Record<K, V>> => {
    if (typeof data !== 'object' || data === null) {
      const details = new ValidationError({
        message: `Expected object, got ${getTypeName(data)}`,
        path: path,
        value: data,
        expected: 'object',
        code: 'VALIDATION_ERROR',
      });
      return { ok: false, error: details.message, details };
    }

    if (Array.isArray(data)) {
      const details = new ValidationError({
        message: 'Expected object, got array',
        path: path,
        value: data,
        expected: 'object',
        code: 'VALIDATION_ERROR',
      });
      return { ok: false, error: details.message, details };
    }

    // Check for circular references
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

    const obj = data as Record<string, unknown>;
    let mutablePath = ensureMutablePath(path);

    for (const [key, value] of Object.entries(obj)) {
      // Validate key
      if (!keyValidator.validate(key)) {
        const keyError = keyValidator.error(key);
        const details = new ValidationError({
          message: `Invalid key '${key}': ${keyError}`,
          path: [...mutablePath, key],
          value: key,
          expected: 'valid key',
          code: 'INVALID_KEY',
        });
        return { ok: false, error: details.message, details };
      }

      // Validate value
      mutablePath.push(key);
      const result = validateWithPath(valueValidator, value, mutablePath, seen, depth + 1, options);

      if (!result.ok) {
        const wrappedError = `Invalid value for key '${key}': ${result.error}`;
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

    return { ok: true, value: data as Record<K, V> };
  };

  // Store type for optimizations
  validator._type = 'record';

  return validator;
}
