#!/usr/bin/env -S npx tsx
/**
 * Property Validator
 *
 * Runtime type validation with TypeScript inference.
 *
 * v0.9.0: Modular architecture - types extracted to ./types.ts
 * v0.9.1: Functional refinements API for tree-shaking support
 * v0.9.2: Entry points for /v (fluent API) and /lite (functional API)
 */

// Version constant - update here when releasing
export const VERSION = '0.9.5';

// Re-export ValidationError class (runtime value)
export { ValidationError } from './types.js';

// Re-export all types from types.ts for backwards compatibility
export type {
  PathSegment,
  Result,
  ValidationOptions,
  Validator,
  ArrayValidator,
  StringValidator,
  NumberValidator,
  TupleType,
  UnionType,
  CompiledValidator,
  CompiledCheck,
  StringRefinement,
  NumberRefinement,
  ArrayRefinement,
} from './types.js';

// Import types for internal use
import type {
  PathSegment,
  Result,
  ValidationOptions,
  Validator,
  ArrayValidator,
  StringValidator,
  NumberValidator,
  TupleType,
  UnionType,
  CompiledValidator,
  CompiledCheck,
  StringRefinement,
  NumberRefinement,
  ArrayRefinement,
} from './types.js';

// Import ValidationError class for runtime use
import { ValidationError, ObjectValidator } from './types.js';

// Import JIT compilation functions (v0.12.0 modularization)
import {
  canUseCodeGeneration,
  compilePropertyValidator,
  generateInlineTypeCheck,
  compileObjectValidator,
  compileUnionValidator,
  compileArrayValidatorJIT,
  compileArrayValidator,
  compileDiscriminatedUnionValidator,
} from './jit.js';

// Import regex patterns (v0.12.0 modularization)
import {
  EMAIL_PATTERN,
  URL_PATTERN,
  UUID_PATTERN,
  DATETIME_PATTERN,
  DATE_PATTERN,
  TIME_PATTERN,
  IPV4_PATTERN,
  IPV6_PATTERN,
  CUID_PATTERN,
  CUID2_PATTERN,
  ULID_PATTERN,
  NANOID_PATTERN,
  BASE64_PATTERN,
  HEX_PATTERN,
  JWT_PATTERN,
  FORMAT_LIMITS,
} from './patterns.js';

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
/**
 * Singleton empty path array - reused for all successful validations
 * to avoid allocation overhead
 * @internal
 */
const EMPTY_PATH: readonly PathSegment[] = [];

/**
 * Ensure path is mutable (clone if it's the singleton EMPTY_PATH)
 * @internal
 */
function ensureMutablePath(path: PathSegment[] | readonly PathSegment[]): PathSegment[] {
  return path === EMPTY_PATH ? [] : path as PathSegment[];
}

/**
 * Fast path validation without path tracking or circular detection
 * Used when no special options are enabled for maximum performance
 *
 * For complex validators (objects, arrays), still delegates to validateWithPath
 * but with a special fast mode that skips circular detection
 * @internal
 */
function validateFast<T>(validator: Validator<T>, data: unknown): Result<T> {
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

/**
 * Boolean-only validation without error details (v0.8.5)
 *
 * Maximum performance validation that returns only true/false.
 * Use when you don't need error messages and want maximum throughput.
 *
 * @param validator - The validator to check against
 * @param data - The data to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * ```typescript
 * const UserSchema = v.object({ name: v.string(), age: v.number() });
 *
 * // Fast boolean check (no error details)
 * if (v.check(UserSchema, data)) {
 *   // data is valid
 *   processUser(data);
 * }
 *
 * // For error details, use validate() instead:
 * const result = validate(UserSchema, data);
 * if (!result.ok) console.log(result.error);
 * ```
 */
export function check<T>(validator: Validator<T>, data: unknown): boolean {
  // v0.8.5 OPTIMIZATION: Direct JIT bypass for maximum speed
  // Uses _compiled when available - returns boolean directly without Result allocation
  // This is the fastest possible validation path
  if (validator._compiled && !validator._hasRefinements) {
    return validator._compiled(data);
  }

  // Fallback: use validator's internal validate method (returns boolean)
  // This is still fast as it skips Result allocation
  return validator.validate(data);
}

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
 * Cache for compiled check functions (WeakMap to allow garbage collection)
 */
const compiledCheckCache = new WeakMap<Validator<any>, CompiledCheck>();

/**
 * Compile a validator into a maximum-speed boolean check function
 *
 * This is the fastest possible validation path. The compiled function
 * is cached, so subsequent calls with the same validator return the
 * cached function. Unlike `compile()`, this returns only a boolean
 * with no error details.
 *
 * **Performance target:** 15-18M ops/sec (TypeBox territory)
 *
 * @param validator - The validator to compile
 * @returns A compiled check function that returns true/false
 *
 * @example
 * ```typescript
 * const checkUser = v.compileCheck(userValidator);
 *
 * // Maximum speed validation in hot loops
 * for (const user of users) {
 *   if (checkUser(user)) {
 *     processUser(user);
 *   }
 * }
 *
 * // Compare to check() which has function call overhead:
 * // v.check(userValidator, user)  // ~5% slower due to validator lookup
 * ```
 */
export function compileCheck<T>(validator: Validator<T>): CompiledCheck {
  // Check cache first
  const cached = compiledCheckCache.get(validator);
  if (cached) {
    return cached;
  }

  let compiled: CompiledCheck;

  // Fast path: Use existing _compiled if available (already JIT optimized)
  if (validator._compiled && !validator._hasRefinements) {
    compiled = validator._compiled;
  } else {
    // Fallback: Create wrapper around validate() method
    // This is still fast - it just returns the boolean, no Result allocation
    compiled = (data: unknown): boolean => validator.validate(data);
  }

  // Cache the compiled check function
  compiledCheckCache.set(validator, compiled);

  return compiled;
}

// JIT compilation functions are now imported from ./jit.ts (v0.12.0 modularization)

/**
 * Compile-time optimization for array transform.
 *
 * Pre-compiles specialized transform functions at construction time.
 *
 * For plain primitives (no transforms):
 * - Returns input directly (no clone, no transformation)
 *
 * For validators with transforms:
 * - Returns optimized transform loop with copy-on-write
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

// ============================================================================
// PHASE 5 OPTIMIZATION: Shared Primitive Validator Functions
// ============================================================================
// These functions are defined once at module level to avoid creating new
// closures every time v.string(), v.number(), or v.boolean() is called.
// This reduces function allocation overhead for primitive validators.

/** Shared string validation function */
function validateString(data: unknown): data is string {
  return typeof data === 'string';
}

/** Shared string error function */
function stringError(data: unknown): string {
  return `Expected string, got ${getTypeName(data)}`;
}

/** Shared number validation function */
function validateNumber(data: unknown): data is number {
  return typeof data === 'number' && !Number.isNaN(data);
}

/** Shared number error function */
function numberError(data: unknown): string {
  return `Expected number, got ${getTypeName(data)}`;
}

/** Shared boolean validation function */
function validateBoolean(data: unknown): data is boolean {
  return typeof data === 'boolean';
}

/** Shared boolean error function */
function booleanError(data: unknown): string {
  return `Expected boolean, got ${getTypeName(data)}`;
}

// Regex patterns are now imported from ./patterns.ts (v0.12.0 modularization)

/**
 * Create a StringValidator with chainable constraint methods
 * @internal
 */
function createStringValidator(
  refinements: Array<{ check: (s: string) => boolean; message: string }> = []
): StringValidator {
  // Base validation: typeof + all refinements
  const validateFn = (data: unknown): data is string => {
    if (typeof data !== 'string') return false;
    return refinements.every(r => r.check(data));
  };

  // Error message: first failing refinement or type error
  const errorFn = (data: unknown): string => {
    if (typeof data !== 'string') {
      return `Expected string, got ${getTypeName(data)}`;
    }
    for (const r of refinements) {
      if (!r.check(data)) {
        return r.message;
      }
    }
    return 'String validation failed';
  };

  const validator = createValidator(validateFn, errorFn) as StringValidator;
  validator._type = 'string';

  // Preserve JIT optimization when possible (no refinements)
  if (refinements.length === 0) {
    validator._compiled = validateString;
  } else {
    validator._hasRefinements = true;
  }

  // Add chainable methods
  validator.min = (length: number): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length >= length,
      message: `String must be at least ${length} character(s)`
    }]);
  };

  validator.max = (length: number): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length <= length,
      message: `String must be at most ${length} character(s)`
    }]);
  };

  validator.length = (length: number): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length === length,
      message: `String must be exactly ${length} character(s)`
    }]);
  };

  validator.nonempty = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length > 0,
      message: 'String cannot be empty'
    }]);
  };

  validator.email = (): StringValidator => {
    return createStringValidator([...refinements, {
      // RFC 5321: max 254 chars - length check prevents ReDoS
      check: (s) => s.length <= 254 && EMAIL_PATTERN.test(s),
      message: 'Must be a valid email address'
    }]);
  };

  validator.url = (): StringValidator => {
    return createStringValidator([...refinements, {
      // Practical limit of 2083 chars - length check prevents ReDoS
      check: (s) => s.length <= 2083 && URL_PATTERN.test(s),
      message: 'Must be a valid URL'
    }]);
  };

  validator.uuid = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => UUID_PATTERN.test(s),
      message: 'Must be a valid UUID'
    }]);
  };

  validator.pattern = (regex: RegExp, message?: string): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => regex.test(s),
      message: message ? `Must be a valid ${message}` : `String must match pattern ${regex}`
    }]);
  };

  validator.startsWith = (prefix: string): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.startsWith(prefix),
      message: `String must start with "${prefix}"`
    }]);
  };

  validator.endsWith = (suffix: string): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.endsWith(suffix),
      message: `String must end with "${suffix}"`
    }]);
  };

  validator.includes = (substring: string): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.includes(substring),
      message: `String must contain "${substring}"`
    }]);
  };

  validator.datetime = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => DATETIME_PATTERN.test(s),
      message: 'Must be a valid ISO 8601 datetime (YYYY-MM-DDTHH:MM:SS)'
    }]);
  };

  validator.date = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => DATE_PATTERN.test(s),
      message: 'Must be a valid ISO 8601 date (YYYY-MM-DD)'
    }]);
  };

  validator.time = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => TIME_PATTERN.test(s),
      message: 'Must be a valid ISO 8601 time (HH:MM:SS)'
    }]);
  };

  validator.ip = (): StringValidator => {
    return createStringValidator([...refinements, {
      // Max 45 chars (IPv6) - length check prevents ReDoS
      check: (s) => s.length <= 45 && (IPV4_PATTERN.test(s) || IPV6_PATTERN.test(s)),
      message: 'Must be a valid IP address (IPv4 or IPv6)'
    }]);
  };

  validator.ipv4 = (): StringValidator => {
    return createStringValidator([...refinements, {
      // Max 15 chars (xxx.xxx.xxx.xxx) - length check prevents ReDoS
      check: (s) => s.length <= 15 && IPV4_PATTERN.test(s),
      message: 'Must be a valid IPv4 address'
    }]);
  };

  validator.ipv6 = (): StringValidator => {
    return createStringValidator([...refinements, {
      // Max 45 chars - length check prevents ReDoS
      check: (s) => s.length <= 45 && IPV6_PATTERN.test(s),
      message: 'Must be a valid IPv6 address'
    }]);
  };

  // v0.9.5: ID format validators
  validator.cuid = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => CUID_PATTERN.test(s),
      message: 'Must be a valid CUID'
    }]);
  };

  validator.cuid2 = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length > 0 && CUID2_PATTERN.test(s),
      message: 'Must be a valid CUID2'
    }]);
  };

  validator.ulid = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => ULID_PATTERN.test(s),
      message: 'Must be a valid ULID'
    }]);
  };

  validator.nanoid = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => NANOID_PATTERN.test(s),
      message: 'Must be a valid NanoID'
    }]);
  };

  // v0.9.5: Encoding validators
  validator.base64 = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length === 0 || BASE64_PATTERN.test(s),
      message: 'Must be a valid Base64 string'
    }]);
  };

  validator.hex = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length > 0 && HEX_PATTERN.test(s),
      message: 'Must be a valid hexadecimal string'
    }]);
  };

  validator.jwt = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => JWT_PATTERN.test(s),
      message: 'Must be a valid JWT'
    }]);
  };

  return validator;
}

/**
 * Create a NumberValidator with chainable constraint methods
 * @internal
 */
function createNumberValidator(
  refinements: Array<{ check: (n: number) => boolean; message: string }> = []
): NumberValidator {
  // Base validation: typeof + not NaN + all refinements
  const validateFn = (data: unknown): data is number => {
    if (typeof data !== 'number' || Number.isNaN(data)) return false;
    return refinements.every(r => r.check(data));
  };

  // Error message: first failing refinement or type error
  const errorFn = (data: unknown): string => {
    if (typeof data !== 'number') {
      return `Expected number, got ${getTypeName(data)}`;
    }
    if (Number.isNaN(data)) {
      return 'Expected number, got NaN';
    }
    for (const r of refinements) {
      if (!r.check(data)) {
        return r.message;
      }
    }
    return 'Number validation failed';
  };

  const validator = createValidator(validateFn, errorFn) as NumberValidator;
  validator._type = 'number';

  // Preserve JIT optimization when possible (no refinements)
  if (refinements.length === 0) {
    validator._compiled = validateNumber;
  } else {
    validator._hasRefinements = true;
  }

  // Add chainable methods
  validator.int = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => Number.isInteger(n),
      message: 'Number must be an integer'
    }]);
  };

  validator.positive = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n > 0,
      message: 'Number must be positive'
    }]);
  };

  validator.negative = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n < 0,
      message: 'Number must be negative'
    }]);
  };

  validator.nonnegative = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n >= 0,
      message: 'Number must be non-negative'
    }]);
  };

  validator.nonpositive = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n <= 0,
      message: 'Number must be non-positive'
    }]);
  };

  validator.min = (minVal: number): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n >= minVal,
      message: `Number must be at least ${minVal}`
    }]);
  };

  validator.max = (maxVal: number): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n <= maxVal,
      message: `Number must be at most ${maxVal}`
    }]);
  };

  validator.range = (minVal: number, maxVal: number): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n >= minVal && n <= maxVal,
      message: `Number must be between ${minVal} and ${maxVal}`
    }]);
  };

  validator.finite = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => Number.isFinite(n),
      message: 'Number must be finite'
    }]);
  };

  validator.safeInt = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => Number.isSafeInteger(n),
      message: 'Number must be a safe integer'
    }]);
  };

  validator.multipleOf = (divisor: number): NumberValidator => {
    return createNumberValidator([...refinements, {
      // Handle floating point precision: check if remainder is close to 0 or divisor
      check: (n) => {
        const remainder = Math.abs(n % divisor);
        return remainder < 1e-10 || Math.abs(remainder - Math.abs(divisor)) < 1e-10;
      },
      message: `Number must be a multiple of ${divisor}`
    }]);
  };

  // v0.9.5: Extended number validators
  validator.port = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => Number.isInteger(n) && n >= 0 && n <= 65535,
      message: 'Must be a valid port number (0-65535)'
    }]);
  };

  validator.latitude = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n >= -90 && n <= 90,
      message: 'Must be a valid latitude (-90 to 90)'
    }]);
  };

  validator.longitude = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n >= -180 && n <= 180,
      message: 'Must be a valid longitude (-180 to 180)'
    }]);
  };

  validator.percentage = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n >= 0 && n <= 100,
      message: 'Must be a valid percentage (0-100)'
    }]);
  };

  return validator;
}

/**
 * Validator builders
 */
// v namespace provides fluent API for schema building
// Also available via @tuulbelt/property-validator/v for explicit imports
export const v = {
  /**
   * String validator with built-in constraints
   * @example
   * v.string().email()
   * v.string().url()
   * v.string().uuid()
   * v.string().pattern(/^\d{3}-\d{4}$/)
   * v.string().min(1).max(100)
   */
  string(): StringValidator {
    return createStringValidator();
  },

  /**
   * Number validator with built-in constraints
   * @example
   * v.number().int()
   * v.number().positive()
   * v.number().range(0, 100)
   * v.number().min(0).max(100)
   */
  number(): NumberValidator {
    return createNumberValidator();
  },

  /**
   * Boolean validator
   */
  boolean(): Validator<boolean> {
    const validator = createValidator(validateBoolean, booleanError);
    validator._type = 'boolean';
    // v0.8.0 OPTIMIZATION: Expose _compiled for JIT bypass (used by unions)
    validator._compiled = validateBoolean;
    return validator;
  },

  /**
   * Array validator with optional length constraints
   */
  array<T>(itemValidator: Validator<T>): ArrayValidator<T> {
    // COMPILE-TIME: Pre-compile validators ONCE at construction
    // This eliminates runtime conditionals and function call overhead
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

          // RUNTIME: Use pre-compiled validator (ZERO conditionals!)
          if (!compiledValidate(data)) return false;

          // Check all refinements (skip empty loop for performance)
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

        // NOTE: _transform is conditionally added below (only when item validators need transforms)

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

          // Check for circular references before recursing (only if enabled)
          // OPTIMIZATION: Skip WeakSet operations when checkCircular=false (default)
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
            // Add to seen set before recursing into elements
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

          // OPTIMIZATION: Fast-path for plain primitive validators (2-3x speedup)
          // Check if itemValidator is a plain primitive (no transforms, defaults, or refinements)
          const isPlainPrimitive = itemValidator._type && !itemValidator._transform && !itemValidator._default && !itemValidator._hasRefinements;

          // Check depth limit before validating elements (even for primitives)
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

          // OPTIMIZATION: Lazy path allocation - clone only when needed (on error descent)
          let mutablePath = ensureMutablePath(path);

          if (isPlainPrimitive) {
            // Inline validation for primitives - avoids validateWithPath overhead
            const primitiveType = itemValidator._type;

            for (let i = 0; i < data.length; i++) {
              if (!(i in data)) continue;

              const item = data[i];
              let isValid = false;

              // Inline type checks based on primitive type
              if (primitiveType === 'string') {
                isValid = typeof item === 'string';
              } else if (primitiveType === 'number') {
                isValid = typeof item === 'number' && !Number.isNaN(item);
              } else if (primitiveType === 'boolean') {
                isValid = typeof item === 'boolean';
              }

              if (!isValid) {
                // PHASE 4 OPTIMIZATION: Push raw index instead of formatted string
                // String formatting happens only in ValidationError.formatPathString()
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
            // Full validation path for complex validators
            for (let i = 0; i < data.length; i++) {
              // Skip holes in sparse arrays (like [1, , 3])
              if (!(i in data)) continue;

              // PHASE 4 OPTIMIZATION: Push raw index instead of formatted string "[${i}]"
              // This avoids string allocation on every iteration (hot path)
              // String formatting happens only when errors occur
              mutablePath.push(i);
              const result = validateWithPath(itemValidator, data[i], mutablePath, seen, depth + 1, options);

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

          // All elements valid, apply transform if needed
          const transformed = validator._transform ? validator._transform(data) : data;
          return { ok: true, value: transformed as T[] };
        },
      };

      // v0.8.0 OPTIMIZATION: Only assign _transform when item validators need transforms
      // This allows parent objects to detect arrays as "plain" and enable JIT bypass
      const hasItemTransform = itemValidator._transform !== undefined;
      const hasItemDefault = itemValidator._default !== undefined;
      const itemNeedsTransform = hasItemTransform || hasItemDefault;

      if (itemNeedsTransform) {
        // Only define _transform when item validators actually need it
        validator._transform = (data: any): T[] => {
          return compiledTransform(data);
        };
      }

      // v0.8.0 OPTIMIZATION: Expose compiled validator for validateFast() bypass
      // For plain arrays (no length constraints, no refinements, no item transforms), validateFast() can
      // call _compiled directly without going through validateWithPath machinery (2x speedup)
      const isPlainArray = minLength === undefined && maxLength === undefined &&
                           exactLength === undefined && refinements.length === 0 &&
                           !itemNeedsTransform;
      if (isPlainArray) {
        // PHASE 4: Try to use complete JIT function (includes Array.isArray check)
        // This eliminates the wrapper function overhead for a single JIT function call
        const completeJIT = compileArrayValidatorJIT(itemValidator);
        if (completeJIT !== null) {
          validator._compiled = completeJIT;
        } else {
          // Fallback: Create wrapper that includes Array.isArray check + item validation
          validator._compiled = (data: unknown): boolean => {
            return Array.isArray(data) && compiledValidate(data);
          };
        }
      }

      // Expose item validator for JSON Schema introspection
      (validator as any)._itemValidator = itemValidator;

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
      // OPTIMIZATION: Skip WeakSet operations when checkCircular=false (default)
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
        // Add to seen set before recursing into elements
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

      // OPTIMIZATION: Lazy path allocation - clone only when needed (on error descent)
      // Reuse path array with push/pop instead of spread (avoids O(n * path_length) allocations)
      let mutablePath = ensureMutablePath(path);

      // Validate each element with index in path
      // PHASE 4 OPTIMIZATION: Push raw index instead of formatted string
      for (let i = 0; i < validators.length; i++) {
        mutablePath.push(i);
        const result = validateWithPath(validators[i]!, data[i], mutablePath, seen, depth + 1, options);

        if (!result.ok) {
          // Don't pop path - we're returning immediately, and result.details.path references this array
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

        // Success - restore path for next iteration
        mutablePath.pop();
      }

      // All elements valid
      return { ok: true, value: data as TupleType<T> };
    };

    // Expose tuple validators for JSON Schema introspection
    (validator as any)._tupleValidators = validators;

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

    // PHASE 1 OPTIMIZATION: Only set _transform if properties actually have transforms/defaults
    // This allows compileArrayTransform to avoid calling validateFast() on each item
    // Expected impact: +30-40% for object arrays (eliminates Result object allocations)
    const hasTransforms = Object.values(shape).some(
      (fieldValidator) => fieldValidator._transform !== undefined || fieldValidator._default !== undefined
    );

    // PHASE 6 OPTIMIZATION: Pre-compile object validator for fast path
    // For plain objects (no transforms/defaults/refinements), we can use the compiled validator directly
    // and skip full validateWithPath machinery when validation succeeds
    // Expected impact: +10-15% for object validation
    const compiledValidator = compileObjectValidator(shape);
    // Check if ANY field validator has refinements (refinements must be checked at validation time)
    const hasFieldRefinements = Object.values(shape).some(
      (fieldValidator) => fieldValidator._hasRefinements === true
    );
    const isPlainObject = !hasTransforms && !hasFieldRefinements;

    // v0.8.0 OPTIMIZATION: Expose compiled validator for validateFast() bypass
    // For plain objects, validateFast() can call _compiled directly without
    // going through validateWithPath machinery (8x speedup potential)
    if (isPlainObject) {
      validator._compiled = compiledValidator;
    }

    if (hasTransforms) {
      // Store transformation function to apply transforms/defaults to object properties
      validator._transform = (data: any): T => {
        const obj = data as Record<string, unknown>;

        // OPTIMIZATION: Only clone if transforms are actually applied
        // This gives ~1.5x speedup by returning input directly when no changes needed
        let result: Record<string, unknown> | null = null;

        // Apply transforms/defaults to properties in the shape
        for (const [key, fieldValidator] of Object.entries(shape)) {
          const fieldResult = validate(fieldValidator, obj[key]);
          if (fieldResult.ok) {
            const originalValue = obj[key];
            const transformedValue = fieldResult.value;

            // Only create result object if a value changed
            if (originalValue !== transformedValue) {
              if (result === null) {
                // First change detected - create copy
                result = { ...obj };
              }
              result[key] = transformedValue;
            }
          }
        }

        // If no transforms applied, return input directly (no clone)
        return (result ?? obj) as T;
      };
    }
    // If no transforms, leave _transform undefined → compileArrayTransform uses optimized path

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
      // Skip full validateWithPath machinery when:
      // 1. Object is plain (no transforms/defaults/refinements)
      // 2. No security options (no maxProperties limit, no circular detection)
      // 3. Data is valid (compiled validator returns true)
      // Note: _hasRefinements is checked at runtime because .refine() can be called after object creation
      // Expected impact: +10-15% for successful object validation
      if (isPlainObject &&
          !validator._hasRefinements &&
          options.checkCircular === false &&
          options.maxProperties === undefined) {
        if (compiledValidator(data)) {
          return { ok: true, value: data as T };
        }
        // If invalid, fall through to full validation for detailed error message
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

      // Check for circular references before recursing (only if enabled)
      // OPTIMIZATION: Skip WeakSet operations when checkCircular=false (default)
      // This saves 5-10% overhead on nested object validation
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
        // Add to seen set before recursing into properties
        seen.add(data);
      }

      const obj = data as Record<string, unknown>;
      // Validate each field with extended path
      // OPTIMIZATION: Reuse path array with push/pop instead of spread
      // This avoids O(properties × path_length) allocations and gives 3-4x speedup
      // OPTIMIZATION: Lazy path allocation - clone only when needed (on error descent)
      let mutablePath = ensureMutablePath(path);
      for (const [key, fieldValidator] of Object.entries(shape)) {
        mutablePath.push(key);
        const result = validateWithPath(fieldValidator, obj[key], mutablePath, seen, depth + 1, options);

        if (!result.ok) {
          // Don't pop path - we're returning immediately, and result.details.path references this array
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

        // Success - restore path for next iteration
        mutablePath.pop();
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

    // Store shape for compilation optimization (used by compileArrayValidator)
    (validator as any)._shape = shape;

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
    const noneHaveRefinements = validators.every((v) => !v._hasRefinements);

    // v0.8.5 OPTIMIZATION: Try JIT compilation first (generates inline OR expression)
    // This eliminates loop overhead: `typeof data === 'string' || typeof data === 'number'`
    const jitCompiled = noneHaveRefinements ? compileUnionValidator(validators) : null;

    // Create compiled validation function
    let compiledValidate: (data: unknown) => boolean;

    if (jitCompiled !== null) {
      // Best path: JIT-compiled inline checks (no loop, no function calls for primitives)
      compiledValidate = jitCompiled;
    } else {
      // v0.8.0 fallback: Check if all child validators have _compiled for loop-based bypass
      const allHaveCompiled = validators.every((v) => v._compiled !== undefined);

      compiledValidate = allHaveCompiled && noneHaveRefinements
        ? (data: unknown): boolean => {
            // Fast path: use _compiled for each child validator
            for (const v of validators) {
              if (v._compiled!(data)) return true;
            }
            return false;
          }
        : (data: unknown): boolean => {
            // Fallback: use .validate() method
            for (const v of validators) {
              if (v.validate(data)) return true;
            }
            return false;
          };
    }

    const validator = createValidator(
      (data): data is UnionType<T> => compiledValidate(data),
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

    // v0.8.0 OPTIMIZATION: Expose _compiled for validateFast() bypass
    // Only when no child validators have refinements
    if (noneHaveRefinements) {
      validator._compiled = compiledValidate;
    }

    // Expose validators for JSON Schema introspection
    (validator as any)._validators = validators;

    return validator;
  },

  /**
   * Literal validator - validates exact value match
   */
  literal<T extends string | number | boolean | null>(
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
  },

  /**
   * Enum validator - validates string literal union (sugar for union of literals)
   */
  enum<T extends readonly string[]>(values: T): Validator<T[number]> {
    const literals = values.map((value) => v.literal(value));
    const unionValidator = v.union(literals as any);

    const validator = createValidator(
      (data): data is T[number] => unionValidator.validate(data),
      (data) => `Expected one of ${JSON.stringify(values)}, got ${JSON.stringify(data)}`
    );

    // Expose enum values for JSON Schema introspection
    (validator as any)._enumValues = values;

    return validator;
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
    lazyValidator._validateWithPath = (data: unknown, path: readonly PathSegment[] | PathSegment[], seen: WeakSet<object>, depth: number, options: ValidationOptions): Result<T> => {
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

  /**
   * Boolean-only validation without error details (v0.8.5)
   *
   * Maximum performance validation that returns only true/false.
   * Use when you don't need error messages and want maximum throughput.
   *
   * @param validator - The validator to check against
   * @param data - The data to validate
   * @returns true if valid, false otherwise
   *
   * @example
   * ```typescript
   * const UserSchema = v.object({ name: v.string(), age: v.number() });
   *
   * // Fast boolean check (no error details)
   * if (v.check(UserSchema, data)) {
   *   processUser(data);
   * }
   * ```
   */
  check,

  /**
   * Compile a validator into a maximum-speed boolean check function.
   *
   * Returns a cached function that can be called directly without
   * validator lookup overhead. This is the fastest validation path.
   *
   * @param validator - The validator to compile
   * @returns A function that validates and returns boolean
   *
   * @example
   * ```typescript
   * const checkUser = v.compileCheck(UserSchema);
   *
   * // Maximum speed in hot loops
   * for (const user of users) {
   *   if (checkUser(user)) {
   *     processUser(user);
   *   }
   * }
   * ```
   */
  compileCheck,
};

/**
 * Named exports for tree-shaking support (v0.9.0)
 *
 * Instead of importing the entire `v` namespace:
 *   import { v, validate } from 'property-validator';
 *   const schema = v.object({ name: v.string() });
 *
 * You can import only what you need:
 *   import { validate, object, string } from 'property-validator';
 *   const schema = object({ name: string() });
 *
 * This enables bundlers to tree-shake unused validators.
 */

// ============================================================================
// Tree-Shakeable Primitive Validators (v0.9.1)
// ============================================================================

/**
 * String validator - accepts optional refinements for tree-shaking
 *
 * @example
 * // Without refinements (backwards compatible, has chainable methods)
 * const s = string();
 * const email = string().email();
 *
 * @example
 * // With refinements (tree-shakeable, no chainable methods)
 * import { string, email, minLength } from 'property-validator';
 * const emailSchema = string(email(), minLength(5));
 */
export function string(...refinements: StringRefinement[]): StringValidator | Validator<string> {
  if (refinements.length === 0) {
    // No refinements: return chainable StringValidator (backwards compatible)
    // Use createStringValidator directly to avoid pulling in v namespace
    return createStringValidator();
  }

  // With refinements: create optimized validator without chainable methods
  // This enables tree-shaking since we only import the refinements we use
  const internalRefinements = refinements.map(r => ({
    check: r.check,
    message: r.message,
  }));

  // Use internal createStringValidator but return as plain Validator
  // (chainable methods are excluded for tree-shaking)
  const validateFn = (data: unknown): data is string => {
    if (typeof data !== 'string') return false;
    return internalRefinements.every(r => r.check(data));
  };

  const errorFn = (data: unknown): string => {
    if (typeof data !== 'string') {
      return `Expected string, got ${data === null ? 'null' : data === undefined ? 'undefined' : typeof data}`;
    }
    for (const r of internalRefinements) {
      if (!r.check(data)) {
        return r.message;
      }
    }
    return 'String validation failed';
  };

  const validator: Validator<string> = {
    validate: validateFn,
    error: errorFn,
    refine(predicate: (value: string) => boolean, message: string): Validator<string> {
      return string(...refinements, {
        _kind: 'string-refinement',
        check: predicate,
        message,
      });
    },
    transform<U>(fn: (value: string) => U): Validator<U> {
      // Use createStringValidator directly to avoid pulling in v namespace
      const transformedValidator = createStringValidator().transform(fn);
      return transformedValidator;
    },
    optional(): Validator<string | undefined> {
      // Use createValidator directly to avoid pulling in v namespace
      return createValidator(
        (data): data is string | undefined => data === undefined || this.validate(data),
        (data) => this.error(data)
      );
    },
    nullable(): Validator<string | null> {
      // Use createValidator directly to avoid pulling in v namespace
      return createValidator(
        (data): data is string | null => data === null || this.validate(data),
        (data) => this.error(data)
      );
    },
    nullish(): Validator<string | undefined | null> {
      const base = this;
      return {
        validate: (data): data is string | undefined | null =>
          data === undefined || data === null || base.validate(data),
        error: (data) => base.error(data),
        refine: (pred, msg) => base.refine(pred as any, msg) as any,
        transform: (fn) => base.transform(fn as any) as any,
        optional: () => base.optional() as any,
        nullable: () => base.nullable() as any,
        nullish: () => base.nullish() as any,
        default: (val) => base.default(val as any) as any,
      };
    },
    default(value: string | (() => string)): Validator<string> {
      // Use createStringValidator directly to avoid pulling in v namespace
      const defaultValidator = createStringValidator().default(value);
      return defaultValidator;
    },
  };

  validator._type = 'string';

  // Enable JIT bypass for fast path
  if (internalRefinements.length === 0) {
    validator._compiled = (data: unknown) => typeof data === 'string';
  }

  return validator;
}

/**
 * Number validator - accepts optional refinements for tree-shaking
 *
 * @example
 * // Without refinements (backwards compatible, has chainable methods)
 * const n = number();
 * const age = number().int().positive();
 *
 * @example
 * // With refinements (tree-shakeable, no chainable methods)
 * import { number, int, positive, min } from 'property-validator';
 * const ageSchema = number(int(), positive());
 * const priceSchema = number(min(0));
 */
export function number(...refinements: NumberRefinement[]): NumberValidator | Validator<number> {
  if (refinements.length === 0) {
    // No refinements: return chainable NumberValidator (backwards compatible)
    // Use createNumberValidator directly to avoid pulling in v namespace
    return createNumberValidator();
  }

  // With refinements: create optimized validator without chainable methods
  const internalRefinements = refinements.map(r => ({
    check: r.check,
    message: r.message,
  }));

  const validateFn = (data: unknown): data is number => {
    if (typeof data !== 'number' || Number.isNaN(data)) return false;
    return internalRefinements.every(r => r.check(data));
  };

  const errorFn = (data: unknown): string => {
    if (typeof data !== 'number') {
      return `Expected number, got ${data === null ? 'null' : data === undefined ? 'undefined' : typeof data}`;
    }
    if (Number.isNaN(data)) {
      return 'Expected number, got NaN';
    }
    for (const r of internalRefinements) {
      if (!r.check(data)) {
        return r.message;
      }
    }
    return 'Number validation failed';
  };

  const validator: Validator<number> = {
    validate: validateFn,
    error: errorFn,
    refine(predicate: (value: number) => boolean, message: string): Validator<number> {
      return number(...refinements, {
        _kind: 'number-refinement',
        check: predicate,
        message,
      });
    },
    transform<U>(fn: (value: number) => U): Validator<U> {
      // Use createNumberValidator directly to avoid pulling in v namespace
      const transformedValidator = createNumberValidator().transform(fn);
      return transformedValidator;
    },
    optional(): Validator<number | undefined> {
      // Use createValidator directly to avoid pulling in v namespace
      return createValidator(
        (data): data is number | undefined => data === undefined || this.validate(data),
        (data) => this.error(data)
      );
    },
    nullable(): Validator<number | null> {
      // Use createValidator directly to avoid pulling in v namespace
      return createValidator(
        (data): data is number | null => data === null || this.validate(data),
        (data) => this.error(data)
      );
    },
    nullish(): Validator<number | undefined | null> {
      const base = this;
      return {
        validate: (data): data is number | undefined | null =>
          data === undefined || data === null || base.validate(data),
        error: (data) => base.error(data),
        refine: (pred, msg) => base.refine(pred as any, msg) as any,
        transform: (fn) => base.transform(fn as any) as any,
        optional: () => base.optional() as any,
        nullable: () => base.nullable() as any,
        nullish: () => base.nullish() as any,
        default: (val) => base.default(val as any) as any,
      };
    },
    default(value: number | (() => number)): Validator<number> {
      // Use createNumberValidator directly to avoid pulling in v namespace
      const defaultValidator = createNumberValidator().default(value);
      return defaultValidator;
    },
  };

  validator._type = 'number';

  // Enable JIT bypass for fast path
  if (internalRefinements.length === 0) {
    validator._compiled = (data: unknown) => typeof data === 'number' && !Number.isNaN(data);
  }

  return validator;
}

// ============================================================================
// Named Validator Exports (v0.9.2 - Tree-Shakeable)
// These are standalone implementations that don't reference the v namespace,
// enabling bundlers to tree-shake unused validators.
// ============================================================================

/**
 * Boolean validator - standalone implementation for tree-shaking
 */
export function boolean(): Validator<boolean> {
  const validator = createValidator(validateBoolean, booleanError);
  validator._type = 'boolean';
  validator._compiled = validateBoolean;
  return validator;
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

        // OPTIMIZATION: Fast-path for plain primitive validators
        const isPlainPrimitive = itemValidator._type && !itemValidator._transform && !itemValidator._default && !itemValidator._hasRefinements;

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
          return Array.isArray(data) && compiledValidate(data);
        };
      }
    }

    // Expose item validator for JSON Schema introspection
    (validator as any)._itemValidator = itemValidator;

    return validator;
  };

  return createArrayValidator();
}

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

/**
 * Optional validator - standalone implementation for tree-shaking
 */
export function optional<T>(validator: Validator<T>): Validator<T | undefined> {
  return createValidator(
    (data): data is T | undefined => data === undefined || validator.validate(data),
    (data) => validator.error(data)
  );
}

/**
 * Nullable validator - standalone implementation for tree-shaking
 */
export function nullable<T>(validator: Validator<T>): Validator<T | null> {
  return createValidator(
    (data): data is T | null => data === null || validator.validate(data),
    (data) => validator.error(data)
  );
}

/**
 * Union validator - standalone implementation for tree-shaking
 * Validates if data matches any of the provided schemas
 */
export function union<T extends readonly Validator<any>[]>(
  validators: T
): Validator<UnionType<T>> {
  const noneHaveRefinements = validators.every((v) => !v._hasRefinements);

  // v0.8.5 OPTIMIZATION: Try JIT compilation first (generates inline OR expression)
  // This eliminates loop overhead: `typeof data === 'string' || typeof data === 'number'`
  const jitCompiled = noneHaveRefinements ? compileUnionValidator(validators) : null;

  // Create compiled validation function
  let compiledValidate: (data: unknown) => boolean;

  if (jitCompiled !== null) {
    // Best path: JIT-compiled inline checks (no loop, no function calls for primitives)
    compiledValidate = jitCompiled;
  } else {
    // v0.8.0 fallback: Check if all child validators have _compiled for loop-based bypass
    const allHaveCompiled = validators.every((v) => v._compiled !== undefined);

    compiledValidate = allHaveCompiled && noneHaveRefinements
      ? (data: unknown): boolean => {
          // Fast path: use _compiled for each child validator
          for (const childValidator of validators) {
            if (childValidator._compiled!(data)) return true;
          }
          return false;
        }
      : (data: unknown): boolean => {
          // Fallback: use .validate() method
          for (const childValidator of validators) {
            if (childValidator.validate(data)) return true;
          }
          return false;
        };
  }

  const validator = createValidator(
    (data): data is UnionType<T> => compiledValidate(data),
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

  // v0.8.0 OPTIMIZATION: Expose _compiled for validateFast() bypass
  // Only when no child validators have refinements
  if (noneHaveRefinements) {
    validator._compiled = compiledValidate;
  }

  // Expose validators for JSON Schema introspection
  (validator as any)._validators = validators;

  return validator;
}

/**
 * Discriminated union validator - efficient tagged union validation (v0.11.0)
 *
 * Validates a union of object types that share a common discriminator field.
 * More efficient than regular union because it checks the discriminator first
 * to determine which variant to validate against (O(1) dispatch).
 *
 * @param discriminator - The property name used to distinguish between variants
 * @param validators - Array of object validators, each with a literal discriminator value
 * @returns Validator for the discriminated union type
 *
 * @example
 * const Shape = v.discriminatedUnion('type', [
 *   v.object({ type: v.literal('circle'), radius: v.number() }),
 *   v.object({ type: v.literal('square'), side: v.number() }),
 * ]);
 *
 * Shape.validate({ type: 'circle', radius: 5 }); // true
 * Shape.validate({ type: 'square', side: 10 }); // true
 * Shape.validate({ type: 'triangle', base: 5 }); // false
 */
export function discriminatedUnion<
  TDiscriminator extends string,
  T extends readonly Validator<Record<string, unknown>>[]
>(
  discriminator: TDiscriminator,
  validators: T
): Validator<UnionType<T>> {
  // Build lookup map from discriminator values to validators
  // This enables O(1) dispatch based on the discriminator value
  const variantMap = new Map<string | number | boolean, Validator<unknown>>();
  const discriminatorValues: Array<string | number | boolean> = [];

  for (const validator of validators) {
    // Extract the discriminator value from each variant's shape
    // We need to inspect the validator to find the literal value
    const shape = (validator as any)._shape;
    if (!shape || typeof shape !== 'object') {
      throw new Error(
        `discriminatedUnion: Each validator must be an object validator with a shape. ` +
        `Got validator type: ${(validator as any)._type || 'unknown'}`
      );
    }

    const discriminatorValidator = shape[discriminator];
    if (!discriminatorValidator) {
      throw new Error(
        `discriminatedUnion: Each variant must have a '${discriminator}' property. ` +
        `Missing in one of the provided validators.`
      );
    }

    // Extract the literal value from the discriminator validator
    const literalValue = (discriminatorValidator as any)._literalValue;
    if (literalValue === undefined) {
      throw new Error(
        `discriminatedUnion: The '${discriminator}' property must be a literal validator (v.literal()). ` +
        `Got validator type: ${(discriminatorValidator as any)._type || 'unknown'}`
      );
    }

    if (variantMap.has(literalValue)) {
      throw new Error(
        `discriminatedUnion: Duplicate discriminator value '${String(literalValue)}' found. ` +
        `Each variant must have a unique discriminator value.`
      );
    }

    variantMap.set(literalValue, validator);
    discriminatorValues.push(literalValue);
  }

  // Check if all validators have no refinements for JIT optimization
  const noneHaveRefinements = validators.every((v) => !v._hasRefinements);

  // Build JIT-compiled switch-based validation if possible
  let compiledValidate: ((data: unknown) => boolean) | null = null;

  if (noneHaveRefinements) {
    // Generate switch-based validation for O(1) dispatch
    // This is much faster than iterating through all validators
    compiledValidate = (data: unknown): boolean => {
      // Fast path checks
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return false;
      }

      const obj = data as Record<string, unknown>;
      const discriminatorValue = obj[discriminator];

      // Look up the variant by discriminator value
      const variant = variantMap.get(discriminatorValue as string | number | boolean);
      if (!variant) {
        return false;
      }

      // Use the variant's compiled validation if available
      if (variant._compiled) {
        return variant._compiled(data);
      }

      return variant.validate(data);
    };
  }

  const validator = createValidator(
    (data): data is UnionType<T> => {
      if (compiledValidate) {
        return compiledValidate(data);
      }

      // Fallback validation path
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return false;
      }

      const obj = data as Record<string, unknown>;
      const discriminatorValue = obj[discriminator];
      const variant = variantMap.get(discriminatorValue as string | number | boolean);

      if (!variant) {
        return false;
      }

      return variant.validate(data);
    },
    (data) => {
      // Generate helpful error messages
      if (typeof data !== 'object' || data === null) {
        return `Expected object with '${discriminator}' property, got ${getTypeName(data)}`;
      }
      if (Array.isArray(data)) {
        return `Expected object with '${discriminator}' property, got array`;
      }

      const obj = data as Record<string, unknown>;
      const discriminatorValue = obj[discriminator];

      // Check if discriminator property exists
      if (!(discriminator in obj)) {
        return `Missing discriminator property '${discriminator}'. Expected one of: ${discriminatorValues.map(v => JSON.stringify(v)).join(', ')}`;
      }

      // Check if discriminator value is valid
      const variant = variantMap.get(discriminatorValue as string | number | boolean);
      if (!variant) {
        return `Invalid discriminator value '${String(discriminatorValue)}' for property '${discriminator}'. Expected one of: ${discriminatorValues.map(v => JSON.stringify(v)).join(', ')}`;
      }

      // Discriminator matched, but rest of object failed validation
      // Delegate to the variant's error function for detailed message
      return variant.error(data);
    }
  );

  // Store metadata for debugging and introspection
  validator._type = 'discriminatedUnion';

  // Expose _compiled for JIT bypass if available
  if (compiledValidate) {
    validator._compiled = compiledValidate;
  }

  // Add path-aware validation
  validator._validateWithPath = (
    data: unknown,
    path: readonly PathSegment[] | PathSegment[],
    seen: WeakSet<object>,
    depth: number,
    options: ValidationOptions
  ): Result<UnionType<T>> => {
    // Basic type checks
    if (typeof data !== 'object' || data === null) {
      return {
        ok: false,
        error: `Expected object with '${discriminator}' property, got ${getTypeName(data)}`,
        details: new ValidationError({
          message: `Expected object with '${discriminator}' property, got ${getTypeName(data)}`,
          path: path as PathSegment[],
          value: data,
          expected: 'object',
          code: 'TYPE_ERROR',
        }),
      };
    }

    if (Array.isArray(data)) {
      return {
        ok: false,
        error: `Expected object with '${discriminator}' property, got array`,
        details: new ValidationError({
          message: `Expected object with '${discriminator}' property, got array`,
          path: path as PathSegment[],
          value: data,
          expected: 'object',
          code: 'TYPE_ERROR',
        }),
      };
    }

    const obj = data as Record<string, unknown>;
    const discriminatorValue = obj[discriminator];

    // Check if discriminator property exists
    if (!(discriminator in obj)) {
      const expectedValues = discriminatorValues.map(v => JSON.stringify(v)).join(', ');
      return {
        ok: false,
        error: `Missing discriminator property '${discriminator}'`,
        details: new ValidationError({
          message: `Missing discriminator property '${discriminator}'. Expected one of: ${expectedValues}`,
          path: [...(path as PathSegment[]), discriminator],
          value: undefined,
          expected: `one of: ${expectedValues}`,
          code: 'MISSING_DISCRIMINATOR',
        }),
      };
    }

    // Check if discriminator value is valid
    const variant = variantMap.get(discriminatorValue as string | number | boolean);
    if (!variant) {
      const expectedValues = discriminatorValues.map(v => JSON.stringify(v)).join(', ');
      return {
        ok: false,
        error: `Invalid discriminator value '${String(discriminatorValue)}'`,
        details: new ValidationError({
          message: `Invalid discriminator value '${String(discriminatorValue)}' for property '${discriminator}'. Expected one of: ${expectedValues}`,
          path: [...(path as PathSegment[]), discriminator],
          value: discriminatorValue,
          expected: `one of: ${expectedValues}`,
          code: 'INVALID_DISCRIMINATOR',
        }),
      };
    }

    // Delegate to the variant's path-aware validation
    if (variant._validateWithPath) {
      return variant._validateWithPath(data, path, seen, depth, options) as Result<UnionType<T>>;
    }

    // Fallback to basic validation
    return validateWithPath(variant, data, path, seen, depth, options) as Result<UnionType<T>>;
  };

  // Expose discriminator and variant map for JSON Schema introspection
  (validator as any)._discriminator = discriminator;
  (validator as any)._variantMap = variantMap;

  return validator;
}

/**
 * Literal validator - standalone implementation for tree-shaking
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

/**
 * Lazy validator - standalone implementation for tree-shaking
 * Defers validator creation for recursive schemas
 */
export function lazy<T>(fn: () => Validator<T>): Validator<T> {
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
  lazyValidator._validateWithPath = (data: unknown, path: readonly PathSegment[] | PathSegment[], seen: WeakSet<object>, depth: number, options: ValidationOptions): Result<T> => {
    const validator = getValidator();
    return validateWithPath(validator, data, path, seen, depth, options);
  };

  return lazyValidator;
}

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

// ============================================================================
// Tree-Shakeable Refinement Functions (v0.9.1)
// ============================================================================

// Re-export all refinement functions for tree-shaking
export {
  // String refinements
  minLength,
  maxLength,
  length,
  nonempty,
  email,
  url,
  uuid,
  pattern,
  startsWith,
  endsWith,
  includes,
  datetime,
  date,
  time,
  ip,
  ipv4,
  ipv6,
  // ID format refinements (v0.9.5)
  cuid,
  cuid2,
  ulid,
  nanoid,
  // Encoding refinements (v0.9.5)
  base64,
  hex,
  jwt,
  // Number refinements
  int,
  safeInt,
  positive,
  negative,
  nonnegative,
  nonpositive,
  min,
  max,
  range,
  finite,
  multipleOf,
  // Extended number refinements (v0.9.5)
  port,
  latitude,
  longitude,
  percentage,
  // Array refinements
  minItems,
  maxItems,
  itemCount,
  nonemptyArray,
} from './refinements/index.js';
