/**
 * Property Validator - Internal Core Utilities
 *
 * This module contains the foundational utilities used by all validators.
 * Not intended for direct public use - use the main entry point instead.
 *
 * @internal
 */

import type {
  PathSegment,
  Result,
  ValidationOptions,
  Validator,
} from '../types.js';

import { ValidationError } from '../types.js';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a clear type name for error messages
 */
export function getTypeName(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Number.isNaN(value)) return 'NaN';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Extract expected type from error message
 */
export function extractExpectedType(message: string): string {
  const match = message.match(/Expected (\w+)/);
  return match ? match[1]! : '';
}

/**
 * Singleton empty path array - reused for all successful validations
 * to avoid allocation overhead
 */
export const EMPTY_PATH: readonly PathSegment[] = [];

/**
 * Ensure path is mutable (clone if it's the singleton EMPTY_PATH)
 */
export function ensureMutablePath(path: PathSegment[] | readonly PathSegment[]): PathSegment[] {
  return path === EMPTY_PATH ? [] : path as PathSegment[];
}

// ============================================================================
// Shared Primitive Validator Functions
// ============================================================================
// These functions are defined once at module level to avoid creating new
// closures every time v.string(), v.number(), or v.boolean() is called.
// This reduces function allocation overhead for primitive validators.

/** Shared string validation function */
export function validateString(data: unknown): data is string {
  return typeof data === 'string';
}

/** Shared string error function */
export function stringError(data: unknown): string {
  return `Expected string, got ${getTypeName(data)}`;
}

/** Shared number validation function */
export function validateNumber(data: unknown): data is number {
  return typeof data === 'number' && !Number.isNaN(data);
}

/** Shared number error function */
export function numberError(data: unknown): string {
  return `Expected number, got ${getTypeName(data)}`;
}

/** Shared boolean validation function */
export function validateBoolean(data: unknown): data is boolean {
  return typeof data === 'boolean';
}

/** Shared boolean error function */
export function booleanError(data: unknown): string {
  return `Expected boolean, got ${getTypeName(data)}`;
}

// ============================================================================
// Core Validation Engine
// ============================================================================

/**
 * Internal validation function with path tracking
 * @internal - exported for use by validators, not for public API
 */
export function validateWithPath<T>(
  validator: Validator<T>,
  data: unknown,
  path: readonly PathSegment[] | PathSegment[] = [],
  seen: WeakSet<object> = new WeakSet(),
  depth: number = 0,
  options: ValidationOptions = {}
): Result<T> {
  // Check maximum depth limit
  const maxDepth = options.maxDepth ?? Infinity;
  if (depth > maxDepth) {
    const details = new ValidationError({
      message: `Maximum nesting depth exceeded (${maxDepth})`,
      path,
      value: data,
      expected: `depth <= ${maxDepth}`,
      code: 'MAX_DEPTH_EXCEEDED',
    });
    return { ok: false, error: `Maximum nesting depth exceeded (${maxDepth})`, details };
  }

  // If validator has path-aware validation, use it (it will handle circular detection and depth)
  if (validator._validateWithPath) {
    return validator._validateWithPath(data, path, seen, depth, options);
  }

  // Apply default value if data is undefined and default is present
  let processedData = data;
  if (data === undefined && validator._default !== undefined) {
    processedData =
      typeof validator._default === 'function'
        ? (validator._default as () => T)()
        : validator._default;
  }

  if (validator.validate(processedData)) {
    // Apply transformation if present
    const value = validator._transform
      ? validator._transform(processedData)
      : processedData;
    return { ok: true, value: value as T };
  }

  // Create detailed error with path information
  const errorMessage = validator.error(processedData);
  const details = new ValidationError({
    message: errorMessage,
    path: path,
    value: processedData,
    expected: validator._type || extractExpectedType(errorMessage),
    code: 'VALIDATION_ERROR',
  });

  return { ok: false, error: errorMessage, details };
}

/**
 * Fast path validation without path tracking or circular detection
 * Used when no special options are enabled for maximum performance
 *
 * For complex validators (objects, arrays), still delegates to validateWithPath
 * but with a special fast mode that skips circular detection
 * @internal
 */
export function validateFast<T>(validator: Validator<T>, data: unknown): Result<T> {
  // v0.8.0 OPTIMIZATION: Direct JIT bypass for plain objects
  // For plain objects with _compiled validator, skip validateWithPath entirely
  // This eliminates function call chain overhead (8x speedup over validateWithPath)
  // Note: Must also check _hasRefinements because .refine() can be called after creation
  if (validator._compiled && !validator._hasRefinements) {
    if (validator._compiled(data)) {
      // Success: return Result directly without validateWithPath machinery
      return { ok: true, value: data as T };
    }
    // Failure: fall through to validateWithPath for detailed error message
  }

  // If validator has custom path-aware validation (objects, arrays, unions),
  // use it but with minimal overhead (reused empty path, no circular checking)
  if (validator._validateWithPath) {
    // OPTIMIZATION: Use singleton EMPTY_PATH to avoid allocation on success path
    // Path will only be cloned if we need to modify it (on errors)
    return validateWithPath(validator, data, EMPTY_PATH, new WeakSet(), 0, { checkCircular: false });
  }

  // For simple validators (primitives), do direct validation
  // Apply default value if data is undefined and default is present
  let processedData = data;
  if (data === undefined && validator._default !== undefined) {
    processedData =
      typeof validator._default === 'function'
        ? (validator._default as () => T)()
        : validator._default;
  }

  // Direct validation without path/circular/depth tracking
  if (validator.validate(processedData)) {
    // Apply transformation if present
    const value = validator._transform
      ? validator._transform(processedData)
      : processedData;
    return { ok: true, value: value as T };
  }

  // On error, build detailed error message
  const errorMessage = validator.error(processedData);
  return { ok: false, error: errorMessage };
}

// ============================================================================
// Validator Factory
// ============================================================================

/**
 * Create a validator with refinement and transform support
 * @internal - used by all validator constructors
 */
export function createValidator<T>(
  validateFn: (data: unknown) => data is T,
  errorFn: (data: unknown) => string
): Validator<T> {
  const refinements: Array<{ predicate: (value: T) => boolean; message: string }> = [];

  const validator: Validator<T> = {
    validate(data: unknown): data is T {
      // First check base validation
      if (!validateFn(data)) {
        return false;
      }

      // Then check all refinements (skip empty loop for performance)
      if (refinements.length === 0) {
        return true;
      }
      return refinements.every((refinement) => refinement.predicate(data));
    },

    error(data: unknown): string {
      // Check base validation first
      if (!validateFn(data)) {
        return errorFn(data);
      }

      // Find first failing refinement
      const failedRefinement = refinements.find(
        (refinement) => !refinement.predicate(data as T)
      );

      return failedRefinement ? failedRefinement.message : errorFn(data);
    },

    refine(predicate: (value: T) => boolean, message: string): Validator<T> {
      // Create new validator with additional refinement
      refinements.push({ predicate, message });
      // Mark that this validator has refinements (for optimization detection)
      validator._hasRefinements = true;
      return validator;
    },

    transform<U>(fn: (value: T) => U): Validator<U> {
      // Create new validator using createValidator helper (with all methods)
      const transformedValidator = createValidator<U>(
        // Validation: validate as T first
        (data): data is U => validator.validate(data),
        // Error: use current validator's error
        (data) => validator.error(data)
      );

      // Store transformation function that chains with previous transforms
      transformedValidator._transform = (value: any): U => {
        // If current validator has a transform, apply it first
        const baseValue = validator._transform ? validator._transform(value) : value;
        // Then apply this transformation
        return fn(baseValue as T);
      };

      return transformedValidator;
    },

    optional(): Validator<T | undefined> {
      // Create validator that accepts T or undefined
      const optionalValidator = createValidator(
        (data): data is T | undefined => data === undefined || validator.validate(data),
        (data) => validator.error(data)
      );

      // Delegate path-aware validation to wrapped validator
      optionalValidator._validateWithPath = (data: unknown, path: readonly PathSegment[] | PathSegment[], seen: WeakSet<object>, depth: number, options: ValidationOptions): Result<T | undefined> => {
        if (data === undefined) {
          return { ok: true, value: undefined as T | undefined };
        }
        return validateWithPath(validator, data, path, seen, depth, options) as Result<T | undefined>;
      };

      return optionalValidator;
    },

    nullable(): Validator<T | null> {
      // Create validator that accepts T or null
      const nullableValidator = createValidator(
        (data): data is T | null => data === null || validator.validate(data),
        (data) => validator.error(data)
      );

      // Delegate path-aware validation to wrapped validator
      nullableValidator._validateWithPath = (data: unknown, path: readonly PathSegment[] | PathSegment[], seen: WeakSet<object>, depth: number, options: ValidationOptions): Result<T | null> => {
        if (data === null) {
          return { ok: true, value: null as T | null };
        }
        return validateWithPath(validator, data, path, seen, depth, options) as Result<T | null>;
      };

      return nullableValidator;
    },

    nullish(): Validator<T | undefined | null> {
      // Create validator that accepts T, undefined, or null
      const nullishValidator = createValidator(
        (data): data is T | undefined | null =>
          data === undefined || data === null || validator.validate(data),
        (data) => validator.error(data)
      );

      // Delegate path-aware validation to wrapped validator
      nullishValidator._validateWithPath = (data: unknown, path: readonly PathSegment[] | PathSegment[], seen: WeakSet<object>, depth: number, options: ValidationOptions): Result<T | undefined | null> => {
        if (data === undefined || data === null) {
          return { ok: true, value: data as T | undefined | null };
        }
        return validateWithPath(validator, data, path, seen, depth, options) as Result<T | undefined | null>;
      };

      return nullishValidator;
    },

    default(value: T | (() => T)): Validator<T> {
      // Create validator that replaces undefined with default value
      const defaultValidator = createValidator(
        (data): data is T => data === undefined || validator.validate(data),
        (data) => validator.error(data)
      );

      // Store default value or function
      defaultValidator._default = value;

      return defaultValidator;
    },
  };

  return validator;
}
