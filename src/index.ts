#!/usr/bin/env -S npx tsx
/**
 * Property Validator
 *
 * Runtime type validation with TypeScript inference.
 */

import { realpathSync } from 'node:fs';

/**
 * Structured validation error with formatting support
 */
export class ValidationError extends Error {
  public readonly path: string[];
  public readonly value: unknown;
  public readonly expected: string;
  public readonly code: string;

  constructor(options: {
    message: string;
    path?: string[];
    value?: unknown;
    expected?: string;
    code?: string;
  }) {
    super(options.message);
    this.name = 'ValidationError';
    this.path = options.path || [];
    this.value = options.value;
    this.expected = options.expected || '';
    this.code = options.code || 'VALIDATION_ERROR';
  }

  /**
   * Format error in different styles
   */
  format(style: 'json' | 'text' | 'color'): string {
    switch (style) {
      case 'json':
        return this.formatJSON();
      case 'text':
        return this.formatText();
      case 'color':
        return this.formatColor();
      default:
        return this.message;
    }
  }

  /**
   * Format as JSON
   */
  private formatJSON(): string {
    return JSON.stringify(
      {
        error: this.code,
        message: this.message,
        path: this.path.length > 0 ? this.path.join('.') : undefined,
        expected: this.expected || undefined,
        received: this.getTypeName(this.value),
      },
      null,
      2
    );
  }

  /**
   * Format as plain text
   */
  private formatText(): string {
    const parts: string[] = [];

    if (this.path.length > 0) {
      parts.push(`At path: ${this.path.join('.')}`);
    }

    parts.push(`Error: ${this.message}`);

    if (this.expected) {
      parts.push(`Expected: ${this.expected}`);
    }

    parts.push(`Received: ${this.getTypeName(this.value)}`);

    return parts.join('\n');
  }

  /**
   * Format with ANSI colors for terminal output
   */
  private formatColor(): string {
    const red = '\x1b[31m';
    const yellow = '\x1b[33m';
    const blue = '\x1b[34m';
    const gray = '\x1b[90m';
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';

    const parts: string[] = [];

    if (this.path.length > 0) {
      parts.push(`${gray}At path:${reset} ${blue}${this.path.join('.')}${reset}`);
    }

    parts.push(`${red}${bold}Error:${reset} ${this.message}`);

    if (this.expected) {
      parts.push(`${gray}Expected:${reset} ${this.expected}`);
    }

    parts.push(`${gray}Received:${reset} ${yellow}${this.getTypeName(this.value)}${reset}`);

    return parts.join('\n');
  }

  /**
   * Get type name for error messages
   */
  private getTypeName(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Number.isNaN(value)) return 'NaN';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
}

/**
 * Validation result
 */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; details?: ValidationError };

/**
 * Validation options for security limits
 */
export interface ValidationOptions {
  /**
   * Maximum nesting depth for objects and arrays (prevents stack overflow)
   * @default Infinity
   */
  maxDepth?: number;

  /**
   * Maximum number of properties in an object (prevents DoS attacks)
   * @default Infinity
   */
  maxProperties?: number;

  /**
   * Maximum number of items in an array (prevents DoS attacks)
   * @default Infinity
   */
  maxItems?: number;
}

/**
 * Validator interface
 */
export interface Validator<T> {
  validate(data: unknown): data is T;
  error(data: unknown): string;
  refine(predicate: (value: T) => boolean, message: string): Validator<T>;
  transform<U>(fn: (value: T) => U): Validator<U>;
  optional(): Validator<T | undefined>;
  nullable(): Validator<T | null>;
  nullish(): Validator<T | undefined | null>;
  default(value: T | (() => T)): Validator<T>;
  _transform?: (value: any) => T;  // Internal: transformation function
  _default?: T | (() => T);  // Internal: default value or function
  _type?: string;  // Internal: validator type for optimizations
  _hasRefinements?: boolean;  // Internal: whether validator has refinements
  _validateWithPath?: (data: unknown, path: string[], seen: WeakSet<object>, depth: number, options: ValidationOptions) => Result<T>;  // Internal: path-aware validation
}

/**
 * Array validator with length constraints
 */
export interface ArrayValidator<T> extends Validator<T[]> {
  min(n: number): ArrayValidator<T>;
  max(n: number): ArrayValidator<T>;
  length(n: number): ArrayValidator<T>;
  nonempty(): ArrayValidator<T>;
  // Inherit refine and transform from Validator
}

/**
 * Tuple type inference helper
 */
type TupleType<T extends readonly Validator<any>[]> = {
  [K in keyof T]: T[K] extends Validator<infer U> ? U : never;
};

/**
 * Union type inference helper
 */
type UnionType<T extends readonly Validator<any>[]> = T extends readonly [
  Validator<infer U>,
  ...infer Rest
]
  ? Rest extends readonly Validator<any>[]
    ? U | UnionType<Rest>
    : U
  : never;

/**
 * Get a clear type name for error messages
 */
function getTypeName(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Number.isNaN(value)) return 'NaN';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Create a validator with refinement and transform support
 */
function createValidator<T>(
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

      // Then check all refinements
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
      optionalValidator._validateWithPath = (data: unknown, path: string[], seen: WeakSet<object>, depth: number, options: ValidationOptions): Result<T | undefined> => {
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
      nullableValidator._validateWithPath = (data: unknown, path: string[], seen: WeakSet<object>, depth: number, options: ValidationOptions): Result<T | null> => {
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
      nullishValidator._validateWithPath = (data: unknown, path: string[], seen: WeakSet<object>, depth: number, options: ValidationOptions): Result<T | undefined | null> => {
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

/**
 * Internal validation function with path tracking
 * @internal - exported for use by validators, not for public API
 */
export function validateWithPath<T>(
  validator: Validator<T>,
  data: unknown,
  path: string[] = [],
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
 * Extract expected type from error message
 */
function extractExpectedType(message: string): string {
  const match = message.match(/Expected (\w+)/);
  return match ? match[1]! : '';
}

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
  return validateWithPath(validator, data, [], new WeakSet(), 0, options || {});
}

/**
 * Compiled validator type - a function that validates data
 */
export type CompiledValidator<T> = (data: unknown) => Result<T>;

/**
 * Cache for compiled validators (WeakMap to allow garbage collection)
 */
const compiledCache = new WeakMap<Validator<any>, CompiledValidator<any>>();

/**
 * Compile a validator into an optimized validation function
 *
 * The compiled function is cached, so subsequent calls with the same
 * validator return the cached compiled function.
 *
 * @param validator - The validator to compile
 * @returns A compiled validation function
 *
 * @example
 * ```typescript
 * const userValidator = v.object({ name: v.string(), age: v.number() });
 * const validateUser = v.compile(userValidator);
 *
 * // Fast repeated validations
 * for (const user of users) {
 *   const result = validateUser(user);
 *   if (result.ok) {
 *     console.log(result.value);
 *   }
 * }
 * ```
 */
export function compile<T>(validator: Validator<T>): CompiledValidator<T> {
  // Check cache first
  const cached = compiledCache.get(validator);
  if (cached) {
    return cached as CompiledValidator<T>;
  }

  // Try to optimize based on validator type
  let compiled: CompiledValidator<T>;

  // Only apply fast path to plain primitives (no transforms, defaults, refinements)
  const isPlainPrimitive = validator._type && !validator._transform && !validator._default && !validator._hasRefinements;

  // Fast path for primitives (inline validation, no function calls)
  if (isPlainPrimitive && validator._type === 'string') {
    compiled = ((data: unknown): Result<T> => {
      if (typeof data === 'string') {
        return { ok: true, value: data as T };
      }
      return { ok: false, error: `Expected string, got ${getTypeName(data)}` };
    }) as CompiledValidator<T>;
  } else if (isPlainPrimitive && validator._type === 'number') {
    compiled = ((data: unknown): Result<T> => {
      if (typeof data === 'number' && !Number.isNaN(data)) {
        return { ok: true, value: data as T };
      }
      return { ok: false, error: `Expected number, got ${getTypeName(data)}` };
    }) as CompiledValidator<T>;
  } else if (isPlainPrimitive && validator._type === 'boolean') {
    compiled = ((data: unknown): Result<T> => {
      if (typeof data === 'boolean') {
        return { ok: true, value: data as T };
      }
      return { ok: false, error: `Expected boolean, got ${getTypeName(data)}` };
    }) as CompiledValidator<T>;
  } else {
    // Generic path - use validate() for complex validators
    compiled = ((data: unknown): Result<T> => {
      return validate(validator, data);
    }) as CompiledValidator<T>;
  }

  // Cache the compiled validator
  compiledCache.set(validator, compiled);

  return compiled;
}

/**
 * Validator builders
 */
export const v = {
  /**
   * String validator
   */
  string(): Validator<string> {
    const validator = createValidator(
      (data): data is string => typeof data === 'string',
      (data) => `Expected string, got ${getTypeName(data)}`
    );
    validator._type = 'string';
    return validator;
  },

  /**
   * Number validator
   */
  number(): Validator<number> {
    const validator = createValidator(
      (data): data is number => typeof data === 'number' && !Number.isNaN(data),
      (data) => `Expected number, got ${getTypeName(data)}`
    );
    validator._type = 'number';
    return validator;
  },

  /**
   * Boolean validator
   */
  boolean(): Validator<boolean> {
    const validator = createValidator(
      (data): data is boolean => typeof data === 'boolean',
      (data) => `Expected boolean, got ${getTypeName(data)}`
    );
    validator._type = 'boolean';
    return validator;
  },

  /**
   * Array validator with optional length constraints
   */
  array<T>(itemValidator: Validator<T>): ArrayValidator<T> {
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

          // Validate each item using top-level validate() to apply transforms/defaults
          if (!data.every((item) => validate(itemValidator, item).ok)) return false;

          // Check all refinements
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

        _transform(data: any): T[] {
          // Apply transforms/defaults to each array element
          return (data as unknown[]).map((item) => {
            const result = validate(itemValidator, item);
            return result.ok ? result.value : item;
          }) as T[];
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
          // Create a base validator for transform
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
          // Create a base validator then apply optional
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
          // Create a base validator then apply nullable
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
          // Create a base validator then apply nullish
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
          // Create a base validator then apply default
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

        _validateWithPath(data: unknown, path: string[], seen: WeakSet<object>, depth: number, options: ValidationOptions): Result<T[]> {
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

          // Check for circular references before recursing
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
          // Add to seen set before recursing into elements
          seen.add(data);

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

          // Validate each element with index in path (skip holes in sparse arrays)
          for (let i = 0; i < data.length; i++) {
            // Skip holes in sparse arrays (like [1, , 3])
            if (!(i in data)) continue;

            // OPTIMIZATION: Reuse path array with push/pop instead of spread
            // This avoids O(n * path_length) allocations and gives 3-4x speedup
            const indexPath = `[${i}]`;
            path.push(indexPath);
            const result = validateWithPath(itemValidator, data[i], path, seen, depth + 1, options);

            if (!result.ok) {
              // Don't pop path - we're returning immediately, and result.details.path references this array
              // Wrap error message to include array context
              const wrappedError = `Invalid item at index ${i}: ${result.error}`;
              if (result.details) {
                // Create new ValidationError with wrapped message but keep original path
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

            // Success - restore path for next iteration
            path.pop();
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

          // All elements valid, apply transform if needed
          const transformed = validator._transform ? validator._transform(data) : data;
          return { ok: true, value: transformed as T[] };
        },
      };

      return validator;
    };

    return createArrayValidator();
  },

  /**
   * Tuple validator - fixed-length array with per-index types
   */
  tuple<T extends readonly Validator<any>[]>(
    validators: T
  ): Validator<TupleType<T>> {
    const validator = createValidator(
      (data): data is TupleType<T> => {
        if (!Array.isArray(data)) return false;

        // Must have exact length
        if (data.length !== validators.length) return false;

        // Validate each element at its index
        return validators.every((validator, index) =>
          validator.validate(data[index])
        );
      },
      (data) => {
        if (!Array.isArray(data)) {
          return `Expected tuple (array), got ${getTypeName(data)}`;
        }

        // Check length first
        if (data.length !== validators.length) {
          return `Tuple must have exactly ${validators.length} element(s), got ${data.length}`;
        }

        // Find first invalid element
        const invalidIndex = validators.findIndex(
          (validator, index) => !validator.validate(data[index])
        );

        if (invalidIndex !== -1) {
          const validator = validators[invalidIndex];
          return `Invalid element at index ${invalidIndex}: ${validator!.error(data[invalidIndex])}`;
        }

        return 'Tuple validation failed';
      }
    );

    // Path-aware validation for tuple elements
    validator._validateWithPath = (data: unknown, path: string[], seen: WeakSet<object>, depth: number, options: ValidationOptions): Result<TupleType<T>> => {
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

      // Check for circular references before recursing
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
      // Add to seen set before recursing into elements
      seen.add(data);

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
      for (let i = 0; i < validators.length; i++) {
        const result = validateWithPath(validators[i]!, data[i], [...path, `[${i}]`], seen, depth + 1, options);
        if (!result.ok) {
          // Wrap error message to include tuple context
          const wrappedError = `Invalid element at index ${i}: ${result.error}`;
          if (result.details) {
            // Create new ValidationError with wrapped message but keep original path
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
      }

      // All elements valid
      return { ok: true, value: data as TupleType<T> };
    };

    return validator;
  },

  /**
   * Object validator
   */
  object<T extends Record<string, unknown>>(
    shape: { [K in keyof T]: Validator<T[K]> }
  ): Validator<T> {
    const validator = createValidator(
      (data): data is T => {
        if (typeof data !== 'object' || data === null) {
          return false;
        }
        const obj = data as Record<string, unknown>;
        return Object.entries(shape).every(([key, validator]) =>
          validate(validator, obj[key]).ok
        );
      },
      (data) => {
        if (typeof data !== 'object' || data === null) {
          return `Expected object, got ${getTypeName(data)}`;
        }
        const obj = data as Record<string, unknown>;
        for (const [key, validator] of Object.entries(shape)) {
          const result = validate(validator, obj[key]);
          if (!result.ok) {
            return `Invalid property '${key}': ${result.error}`;
          }
        }
        return 'Unknown validation error';
      }
    );

    // Store transformation function to apply transforms/defaults to object properties
    validator._transform = (data: any): T => {
      const obj = data as Record<string, unknown>;
      // Start with a copy of all properties (to preserve extra properties)
      const result: Record<string, unknown> = { ...obj };
      // Apply transforms/defaults to properties in the shape
      for (const [key, fieldValidator] of Object.entries(shape)) {
        const fieldResult = validate(fieldValidator, obj[key]);
        if (fieldResult.ok) {
          result[key] = fieldResult.value;
        }
      }
      return result as T;
    };

    // Path-aware validation for nested errors
    validator._validateWithPath = (data: unknown, path: string[], seen: WeakSet<object>, depth: number, options: ValidationOptions): Result<T> => {
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
      // Add to seen set before recursing into properties
      seen.add(data);

      const obj = data as Record<string, unknown>;
      // Validate each field with extended path
      for (const [key, fieldValidator] of Object.entries(shape)) {
        const result = validateWithPath(fieldValidator, obj[key], [...path, key], seen, depth + 1, options);
        if (!result.ok) {
          // Wrap error message to include property context
          const wrappedError = `Invalid property '${key}': ${result.error}`;
          if (result.details) {
            // Create new ValidationError with wrapped message but keep original path
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
      }

      // Check refinements if present (refinements are in createValidator closure)
      // We need to call the base validator to check them
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

    return validator;
  },

  /**
   * Optional validator
   */
  optional<T>(validator: Validator<T>): Validator<T | undefined> {
    return createValidator(
      (data): data is T | undefined => data === undefined || validator.validate(data),
      (data) => validator.error(data)
    );
  },

  /**
   * Nullable validator
   */
  nullable<T>(validator: Validator<T>): Validator<T | null> {
    return createValidator(
      (data): data is T | null => data === null || validator.validate(data),
      (data) => validator.error(data)
    );
  },

  /**
   * Union validator - validates if data matches any of the provided schemas
   */
  union<T extends readonly Validator<any>[]>(
    validators: T
  ): Validator<UnionType<T>> {
    return createValidator(
      (data): data is UnionType<T> => {
        // Try each validator in order, return true on first success
        return validators.some((validator) => validator.validate(data));
      },
      (data) => {
        // If validation failed, collect errors from all validators
        const errors = validators.map((validator) => validator.error(data));

        // Return aggregated error message
        if (errors.length === 1) {
          return errors[0] || 'Union validation failed';
        }

        return `Expected one of:\n  - ${errors.join('\n  - ')}`;
      }
    );
  },

  /**
   * Literal validator - validates exact value match
   */
  literal<T extends string | number | boolean | null>(
    value: T
  ): Validator<T> {
    return createValidator(
      (data): data is T => data === value,
      (data) => `Expected literal value ${JSON.stringify(value)}, got ${getTypeName(data)}`
    );
  },

  /**
   * Enum validator - validates string literal union (sugar for union of literals)
   */
  enum<T extends readonly string[]>(values: T): Validator<T[number]> {
    const literals = values.map((value) => v.literal(value));
    const unionValidator = v.union(literals as any);

    return createValidator(
      (data): data is T[number] => unionValidator.validate(data),
      (data) => `Expected one of ${JSON.stringify(values)}, got ${JSON.stringify(data)}`
    );
  },

  /**
   * Lazy validator - defers validator creation for recursive schemas
   *
   * @param fn - Function that returns the validator
   * @returns A lazy validator
   *
   * @example
   * ```typescript
   * // Define recursive tree structure
   * const TreeNode = v.object({
   *   value: v.number(),
   *   children: v.lazy(() => v.array(TreeNode))
   * });
   *
   * const tree = {
   *   value: 1,
   *   children: [
   *     { value: 2, children: [] },
   *     { value: 3, children: [] }
   *   ]
   * };
   *
   * const result = validate(TreeNode, tree);
   * ```
   */
  lazy<T>(fn: () => Validator<T>): Validator<T> {
    // Cache the validator once it's created
    let cachedValidator: Validator<T> | null = null;

    const getValidator = (): Validator<T> => {
      if (cachedValidator === null) {
        cachedValidator = fn();
      }
      return cachedValidator;
    };

    const lazyValidator = createValidator(
      (data): data is T => {
        const validator = getValidator();
        return validator.validate(data);
      },
      (data) => {
        const validator = getValidator();
        return validator.error(data);
      }
    );

    // Delegate path-aware validation to the wrapped validator
    lazyValidator._validateWithPath = (data: unknown, path: string[], seen: WeakSet<object>, depth: number, options: ValidationOptions): Result<T> => {
      const validator = getValidator();
      return validateWithPath(validator, data, path, seen, depth, options);
    };

    return lazyValidator;
  },

  /**
   * Compile a validator into an optimized validation function
   *
   * @param validator - The validator to compile
   * @returns A compiled validation function
   *
   * @example
   * ```typescript
   * const userValidator = v.object({ name: v.string(), age: v.number() });
   * const validateUser = v.compile(userValidator);
   *
   * // Fast repeated validations
   * for (const user of users) {
   *   const result = validateUser(user);
   * }
   * ```
   */
  compile,
};

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): { input: string; verbose: boolean } {
  let input = '';
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: propval [options] <json-data>

Runtime type validation with TypeScript inference.

Options:
  -v, --verbose  Enable verbose output
  -h, --help     Show this help message

Examples:
  propval '{"name":"Alice","age":30}'
  propval --verbose '{"email":"test@example.com"}'`);
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      input = arg;
    }
  }

  return { input, verbose };
}

// CLI entry point - only runs when executed directly
function main(): void {
  const args = globalThis.process?.argv?.slice(2) ?? [];
  const { input, verbose } = parseArgs(args);

  if (!input) {
    console.error('Error: No input provided');
    console.error('Usage: propval [options] <json-data>');
    globalThis.process?.exit(1);
    return;
  }

  try {
    const data = JSON.parse(input);

    // Example: validate a simple object
    const userValidator = v.object({
      name: v.string(),
      age: v.number(),
      email: v.string(),
    });

    const result = validate(userValidator, data);

    if (result.ok) {
      if (verbose) {
        console.error('[INFO] Validation successful');
      }
      console.log(JSON.stringify(result.value, null, 2));
    } else {
      console.error(`Validation error: ${result.error}`);
      globalThis.process?.exit(1);
    }
  } catch (error) {
    console.error(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
    globalThis.process?.exit(1);
  }
}

// Check if this module is being run directly
// Must resolve symlinks for npm link support (argv1 may be symlink path)
const argv1 = globalThis.process?.argv?.[1];
if (argv1) {
  try {
    const realPath = realpathSync(argv1);
    if (import.meta.url === `file://${realPath}`) {
      main();
    }
  } catch {
    // Fallback for non-existent paths
    if (import.meta.url === `file://${argv1}`) {
      main();
    }
  }
}
