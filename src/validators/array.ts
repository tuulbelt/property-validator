/**
 * Property Validator - Array Validator
 *
 * Contains the array() validator with chainable constraint methods.
 */

import type { ArrayValidator, PathSegment, Result, ValidationOptions, Validator } from '../types.js';
import { ValidationError } from '../types.js';
import {
  createValidator,
  getTypeName,
  validateWithPath,
  validateFast,
  ensureMutablePath,
} from '../internal/core.js';
import { validate } from '../core/validate.js';
import { compileArrayValidator, compileArrayValidatorJIT } from '../jit.js';

/**
 * Compile an array transform function at validator construction time
 *
 * @param itemValidator - Validator for array items
 * @returns Pre-compiled transform function
 */
function compileArrayTransform<T>(itemValidator: Validator<T>): (data: any) => T[] {
  const itemType = itemValidator._type;
  const hasRefinements = itemValidator._hasRefinements;
  const hasTransform = itemValidator._transform !== undefined;
  const hasDefault = itemValidator._default !== undefined;

  // Fast path: Plain primitives (no transforms, defaults, or refinements that modify values)
  const isPlainPrimitive = itemType && !hasRefinements && !hasTransform && !hasDefault;

  if (isPlainPrimitive) {
    // No transformations needed - return input directly
    return (data: any): T[] => data as T[];
  }

  // PHASE 1 OPTIMIZATION: Plain objects without transforms
  // Object validators without transforms can return input directly (zero-copy)
  const objectShape = (itemValidator as any)._shape;
  const isPlainObject = objectShape && !hasRefinements && !hasTransform && !hasDefault;

  if (isPlainObject) {
    // No transformations needed - return input directly (eliminates validateFast calls)
    return (data: any): T[] => data as T[];
  }

  // Generic path: Complex validators or validators with transforms
  // Use copy-on-write strategy: only clone array if transforms are actually applied
  return (data: any): T[] => {
    const arr = data as unknown[];
    let result: unknown[] | null = null;

    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const validationResult = validateFast(itemValidator, item);

      if (validationResult.ok && item !== validationResult.value) {
        // First change detected - create copy
        if (result === null) {
          result = arr.slice(0, i); // Copy items up to this point
        }
        result.push(validationResult.value);
      } else if (result !== null) {
        // Already copying, add item as-is
        result.push(item);
      }
    }

    // If no transforms applied, return input directly (no clone)
    return (result ?? arr) as T[];
  };
}

/**
 * Array validator - standalone implementation for tree-shaking
 */
export function array<T>(itemValidator: Validator<T>): ArrayValidator<T> {
  // COMPILE-TIME: Pre-compile validators ONCE at construction
  const compiledValidate = compileArrayValidator(itemValidator);
  const compiledTransform = compileArrayTransform(itemValidator);

  const createArrayValidator = (
    minLength?: number,
    maxLength?: number,
    exactLength?: number,
    refinements: Array<{ predicate: (value: T[]) => boolean; message: string }> = []
  ): ArrayValidator<T> => {
    const validator: ArrayValidator<T> = {
      validate(data: unknown): data is T[] {
        if (!Array.isArray(data)) return false;

        // Check length constraints
        if (minLength !== undefined && data.length < minLength) return false;
        if (maxLength !== undefined && data.length > maxLength) return false;
        if (exactLength !== undefined && data.length !== exactLength) return false;

        // RUNTIME: Use pre-compiled validator
        if (!compiledValidate(data)) return false;

        // Check all refinements
        if (refinements.length === 0) {
          return true;
        }
        return refinements.every((refinement) => refinement.predicate(data));
      },

      error(data: unknown): string {
        if (!Array.isArray(data)) {
          return `Expected array, got ${getTypeName(data)}`;
        }

        // Check length constraints first
        if (minLength !== undefined && data.length < minLength) {
          return `Array must have at least ${minLength} element(s), got ${data.length}`;
        }
        if (maxLength !== undefined && data.length > maxLength) {
          return `Array must have at most ${maxLength} element(s), got ${data.length}`;
        }
        if (exactLength !== undefined && data.length !== exactLength) {
          return `Array must have exactly ${exactLength} element(s), got ${data.length}`;
        }

        // Find first invalid item
        const invalidIndex = data.findIndex((item) => !validate(itemValidator, item).ok);
        if (invalidIndex !== -1) {
          return `Invalid item at index ${invalidIndex}: ${itemValidator.error(data[invalidIndex])}`;
        }

        // Check refinements
        const failedRefinement = refinements.find(
          (refinement) => !refinement.predicate(data)
        );
        if (failedRefinement) {
          return failedRefinement.message;
        }

        return 'Array validation failed';
      },

      min(n: number): ArrayValidator<T> {
        return createArrayValidator(n, maxLength, exactLength, refinements);
      },

      max(n: number): ArrayValidator<T> {
        return createArrayValidator(minLength, n, exactLength, refinements);
      },

      length(n: number): ArrayValidator<T> {
        return createArrayValidator(undefined, undefined, n, refinements);
      },

      nonempty(): ArrayValidator<T> {
        return createArrayValidator(1, maxLength, exactLength, refinements);
      },

      refine(predicate: (value: T[]) => boolean, message: string): ArrayValidator<T> {
        return createArrayValidator(minLength, maxLength, exactLength, [
          ...refinements,
          { predicate, message },
        ]);
      },

      transform<U>(fn: (value: T[]) => U): Validator<U> {
        const baseValidator = createValidator<T[]>(
          (data): data is T[] => {
            const arrayValidator = createArrayValidator(minLength, maxLength, exactLength, refinements);
            return arrayValidator.validate(data);
          },
          (data) => {
            const arrayValidator = createArrayValidator(minLength, maxLength, exactLength, refinements);
            return arrayValidator.error(data);
          }
        );
        return baseValidator.transform(fn);
      },

      optional(): Validator<T[] | undefined> {
        const baseValidator = createValidator<T[]>(
          (data): data is T[] => {
            const arrayValidator = createArrayValidator(minLength, maxLength, exactLength, refinements);
            return arrayValidator.validate(data);
          },
          (data) => {
            const arrayValidator = createArrayValidator(minLength, maxLength, exactLength, refinements);
            return arrayValidator.error(data);
          }
        );
        return baseValidator.optional();
      },

      nullable(): Validator<T[] | null> {
        const baseValidator = createValidator<T[]>(
          (data): data is T[] => {
            const arrayValidator = createArrayValidator(minLength, maxLength, exactLength, refinements);
            return arrayValidator.validate(data);
          },
          (data) => {
            const arrayValidator = createArrayValidator(minLength, maxLength, exactLength, refinements);
            return arrayValidator.error(data);
          }
        );
        return baseValidator.nullable();
      },

      nullish(): Validator<T[] | undefined | null> {
        const baseValidator = createValidator<T[]>(
          (data): data is T[] => {
            const arrayValidator = createArrayValidator(minLength, maxLength, exactLength, refinements);
            return arrayValidator.validate(data);
          },
          (data) => {
            const arrayValidator = createArrayValidator(minLength, maxLength, exactLength, refinements);
            return arrayValidator.error(data);
          }
        );
        return baseValidator.nullish();
      },

      default(value: T[] | (() => T[])): Validator<T[]> {
        const baseValidator = createValidator<T[]>(
          (data): data is T[] => {
            const arrayValidator = createArrayValidator(minLength, maxLength, exactLength, refinements);
            return arrayValidator.validate(data);
          },
          (data) => {
            const arrayValidator = createArrayValidator(minLength, maxLength, exactLength, refinements);
            return arrayValidator.error(data);
          }
        );
        return baseValidator.default(value);
      },

      _validateWithPath(data: unknown, path: readonly PathSegment[] | PathSegment[], seen: WeakSet<object>, depth: number, options: ValidationOptions): Result<T[]> {
        if (!Array.isArray(data)) {
          const details = new ValidationError({
            message: `Expected array, got ${getTypeName(data)}`,
            path: path,
            value: data,
            expected: 'array',
            code: 'VALIDATION_ERROR',
          });
          return { ok: false, error: details.message, details };
        }

        // Check maximum items limit
        const maxItems = options.maxItems ?? Infinity;
        if (data.length > maxItems) {
          const message = `Array exceeds maximum items limit (${maxItems})`;
          const details = new ValidationError({
            message,
            path,
            value: data,
            expected: `array with at most ${maxItems} items`,
            code: 'MAX_ITEMS_EXCEEDED',
          });
          return { ok: false, error: message, details };
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

        // Check length constraints
        if (minLength !== undefined && data.length < minLength) {
          const message = `Array must have at least ${minLength} element(s), got ${data.length}`;
          const details = new ValidationError({
            message,
            path,
            value: data,
            expected: `array with min length ${minLength}`,
            code: 'VALIDATION_ERROR',
          });
          return { ok: false, error: message, details };
        }
        if (maxLength !== undefined && data.length > maxLength) {
          const message = `Array must have at most ${maxLength} element(s), got ${data.length}`;
          const details = new ValidationError({
            message,
            path,
            value: data,
            expected: `array with max length ${maxLength}`,
            code: 'VALIDATION_ERROR',
          });
          return { ok: false, error: message, details };
        }
        if (exactLength !== undefined && data.length !== exactLength) {
          const message = `Array must have exactly ${exactLength} element(s), got ${data.length}`;
          const details = new ValidationError({
            message,
            path,
            value: data,
            expected: `array with length ${exactLength}`,
            code: 'VALIDATION_ERROR',
          });
          return { ok: false, error: message, details };
        }

        // OPTIMIZATION: Fast-path for plain primitive validators (string, number, boolean only)
        // Note: 'array' type is NOT a primitive - it requires recursive validation
        const itemType = itemValidator._type;
        const isPlainPrimitive = (itemType === 'string' || itemType === 'number' || itemType === 'boolean') &&
          !itemValidator._transform && !itemValidator._default && !itemValidator._hasRefinements;

        // Check depth limit
        const maxDepth = options.maxDepth ?? Infinity;
        if (depth + 1 > maxDepth) {
          const message = `Maximum nesting depth exceeded (${maxDepth})`;
          const details = new ValidationError({
            message,
            path,
            value: data,
            expected: `depth <= ${maxDepth}`,
            code: 'MAX_DEPTH_EXCEEDED',
          });
          return { ok: false, error: message, details };
        }

        let mutablePath = ensureMutablePath(path);

        if (isPlainPrimitive) {
          const primitiveType = itemValidator._type;

          for (let i = 0; i < data.length; i++) {
            if (!(i in data)) continue;

            const item = data[i];
            let isValid = false;

            if (primitiveType === 'string') {
              isValid = typeof item === 'string';
            } else if (primitiveType === 'number') {
              isValid = typeof item === 'number' && !Number.isNaN(item);
            } else if (primitiveType === 'boolean') {
              isValid = typeof item === 'boolean';
            }

            if (!isValid) {
              mutablePath.push(i);
              const message = `Invalid item at index ${i}: Expected ${primitiveType}, got ${getTypeName(item)}`;
              const details = new ValidationError({
                message,
                path: mutablePath,
                value: item,
                expected: primitiveType,
                code: 'VALIDATION_ERROR',
              });
              return { ok: false, error: message, details };
            }
          }
        } else {
          for (let i = 0; i < data.length; i++) {
            if (!(i in data)) continue;

            mutablePath.push(i);
            const result = validateWithPath(itemValidator, data[i], mutablePath, seen, depth + 1, options);

            if (!result.ok) {
              const wrappedError = `Invalid item at index ${i}: ${result.error}`;
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
        }

        // Check refinements
        const failedRefinement = refinements.find((r) => !r.predicate(data));
        if (failedRefinement) {
          const details = new ValidationError({
            message: failedRefinement.message,
            path,
            value: data,
            expected: 'valid array',
            code: 'VALIDATION_ERROR',
          });
          return { ok: false, error: failedRefinement.message, details };
        }

        // Apply transform if needed
        const transformed = validator._transform ? validator._transform(data) : data;
        return { ok: true, value: transformed as T[] };
      },
    };

    // Only assign _transform when item validators need transforms
    const hasItemTransform = itemValidator._transform !== undefined;
    const hasItemDefault = itemValidator._default !== undefined;
    const itemNeedsTransform = hasItemTransform || hasItemDefault;

    if (itemNeedsTransform) {
      validator._transform = (data: any): T[] => {
        return compiledTransform(data);
      };
    }

    // Expose compiled validator for validateFast() bypass
    const isPlainArray = minLength === undefined && maxLength === undefined &&
                         exactLength === undefined && refinements.length === 0 &&
                         !itemNeedsTransform;
    if (isPlainArray) {
      const completeJIT = compileArrayValidatorJIT(itemValidator);
      if (completeJIT !== null) {
        validator._compiled = completeJIT;
      } else {
        validator._compiled = (data: unknown): boolean => {
          if (!Array.isArray(data)) return false;
          return compiledValidate(data);
        };
      }
    }

    // Store item validator for JSON Schema introspection
    (validator as any)._itemValidator = itemValidator;

    // Store constraints for JSON Schema introspection
    if (minLength !== undefined) {
      (validator as any)._minLength = minLength;
    }
    if (maxLength !== undefined) {
      (validator as any)._maxLength = maxLength;
    }
    if (exactLength !== undefined) {
      (validator as any)._exactLength = exactLength;
    }

    validator._type = 'array';

    return validator;
  };

  return createArrayValidator();
}
