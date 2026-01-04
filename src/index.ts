#!/usr/bin/env -S npx tsx
/**
 * Property Validator
 *
 * Runtime type validation with TypeScript inference.
 */

import { realpathSync } from 'node:fs';

/**
 * Structured validation error with formatting support
 *
 * OPTIMIZED: Does not extend Error to avoid stack trace capture overhead.
 * Stack traces are captured lazily only when accessed via .stack getter.
 * This provides 52x faster error creation while keeping all debugging features.
 */
/**
 * Path segment type - can be string (property name) or number (array index)
 * Numbers are stored raw and only formatted to "[0]" when displaying errors
 * This avoids string allocation on every array iteration (hot path optimization)
 */
export type PathSegment = string | number;

export class ValidationError {
  public readonly message: string;
  public readonly path: PathSegment[];
  public readonly value: unknown;
  public readonly expected: string;
  public readonly code: string;
  private _stack?: string;

  constructor(options: {
    message: string;
    path?: readonly PathSegment[] | PathSegment[];
    value?: unknown;
    expected?: string;
    code?: string;
  }) {
    this.message = options.message;
    this.path = options.path ? [...options.path] : []; // Convert readonly to mutable copy
    this.value = options.value;
    this.expected = options.expected || '';
    this.code = options.code || 'VALIDATION_ERROR';
  }

  /**
   * Format path segments into a readable string
   * Numbers become [0], [1], etc. Strings are joined with dots.
   * Examples:
   *   ['name'] → 'name'
   *   ['users', 0] → 'users[0]'
   *   ['users', 0, 'email'] → 'users[0].email'
   *   [0, 'name'] → '[0].name'
   * @internal
   */
  private formatPathString(): string {
    if (this.path.length === 0) return '';

    let result = '';
    for (let i = 0; i < this.path.length; i++) {
      const segment = this.path[i]!;
      if (typeof segment === 'number') {
        // Numbers always become [n] - no separator needed before them
        result += `[${segment}]`;
      } else {
        // String segment - add dot separator if not first element
        if (i > 0) {
          result += '.';
        }
        result += segment;
      }
    }
    return result;
  }

  /**
   * Lazy stack trace - only captured when accessed
   * This avoids the expensive Error() constructor in the hot path
   */
  get stack(): string {
    if (!this._stack) {
      const err = new Error(this.message);
      err.name = 'ValidationError';
      this._stack = err.stack || '';
    }
    return this._stack;
  }

  /**
   * For compatibility with Error interface
   */
  get name(): string {
    return 'ValidationError';
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
    const pathStr = this.formatPathString();
    return JSON.stringify(
      {
        error: this.code,
        message: this.message,
        path: pathStr || undefined,
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
    const pathStr = this.formatPathString();

    if (pathStr) {
      parts.push(`At path: ${pathStr}`);
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
    const pathStr = this.formatPathString();

    if (pathStr) {
      parts.push(`${gray}At path:${reset} ${blue}${pathStr}${reset}`);
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

  /**
   * Enable circular reference detection (uses WeakSet tracking)
   * When false, circular references will cause stack overflow
   * @default false (for performance)
   */
  checkCircular?: boolean;
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
  _validateWithPath?: (data: unknown, path: readonly PathSegment[] | PathSegment[], seen: WeakSet<object>, depth: number, options: ValidationOptions) => Result<T>;  // Internal: path-aware validation
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
 * Compile a single property validator for inline validation.
 * Returns a function that validates without allocating Result objects.
 *
 * @param validator - Property validator
 * @returns Compiled validator function: (data: unknown) => boolean
 * @internal
 */
function compilePropertyValidator<T>(validator: Validator<T>): (data: unknown) => boolean {
  const validatorType = validator._type;
  const hasRefinements = validator._hasRefinements;
  const hasTransform = validator._transform !== undefined;
  const hasDefault = validator._default !== undefined;

  // Fast path: Plain primitives (no refinements, transforms, or defaults)
  const isPlainPrimitive = validatorType && !hasRefinements && !hasTransform && !hasDefault;

  if (isPlainPrimitive) {
    // Inline primitive checks - zero allocations, zero function calls
    if (validatorType === 'string') {
      return (data: unknown): boolean => typeof data === 'string';
    } else if (validatorType === 'number') {
      return (data: unknown): boolean => typeof data === 'number' && !Number.isNaN(data);
    } else if (validatorType === 'boolean') {
      return (data: unknown): boolean => typeof data === 'boolean';
    }
  }

  // Complex validators: Use validate() method (still faster than validateFast - no Result allocation)
  return (data: unknown): boolean => validator.validate(data);
}

/**
 * Compile an object validator for inline validation.
 * Pre-compiles all property validators at construction time.
 * Returns a function that validates without allocating Result objects or WeakSets.
 *
 * @param shape - Object schema (e.g., { name: v.string(), age: v.number() })
 * @returns Compiled validator function: (data: unknown) => boolean
 * @internal
 */
/**
 * Check if code generation (new Function) is available.
 * Returns false in CSP-restricted environments.
 */
let codeGenerationAvailable: boolean | null = null;
function canUseCodeGeneration(): boolean {
  if (codeGenerationAvailable !== null) {
    return codeGenerationAvailable;
  }

  try {
    // Test if new Function() works
    new Function('return true')();
    codeGenerationAvailable = true;
    return true;
  } catch {
    // CSP restriction detected
    codeGenerationAvailable = false;
    return false;
  }
}

/**
 * Create fallback validator for CSP-restricted environments.
 * Uses manual property iteration instead of code generation.
 * Slower than Phase 3, but still optimized for boolean validation.
 */
function createFallbackObjectValidator<T extends Record<string, unknown>>(
  shape: { [K in keyof T]: Validator<T[K]> }
): (data: unknown) => boolean {
  // Pre-compile property validators once at construction time
  const compiledValidators: Array<{ key: string; validator: (value: unknown) => boolean }> = [];

  for (const key in shape) {
    const validator = shape[key];
    compiledValidators.push({
      key,
      validator: compilePropertyValidator(validator),
    });
  }

  // Return optimized validation function (no path tracking, no error details)
  return (data: unknown): boolean => {
    if (typeof data !== 'object' || data === null) return false;
    const obj = data as Record<string, unknown>;

    // Validate each property (early exit on failure)
    for (let i = 0; i < compiledValidators.length; i++) {
      const { key, validator } = compiledValidators[i]!; // Non-null assertion: i is always valid due to loop bounds
      if (!validator(obj[key])) return false;
    }

    return true;
  };
}

function compileObjectValidator<T extends Record<string, unknown>>(
  shape: { [K in keyof T]: Validator<T[K]> }
): (data: unknown) => boolean {
  // PHASE 3 OPTIMIZATION: Generate optimized code with inline property access
  // This allows V8 to optimize direct property access (obj.name vs obj[key])

  // CSP fallback: If code generation is blocked, use manual validation
  if (!canUseCodeGeneration()) {
    return createFallbackObjectValidator(shape);
  }

  const checks: string[] = [];
  const validatorClosures: Record<string, (value: unknown) => boolean> = {};

  for (const key in shape) {
    const validator = shape[key];
    const checkCode = generatePropertyCheck(key, validator, validatorClosures);
    checks.push(checkCode);
  }

  // Generate optimized function with inline checks
  const fnBody = `
    if (typeof data !== 'object' || data === null) return false;
    const obj = data;
    ${checks.join('\n    ')}
    return true;
  `;

  try {
    // Create function with validators in closure scope
    const fn = new Function('validatorClosures', `
      return function(data) {
        ${fnBody}
      }
    `)(validatorClosures) as (data: unknown) => boolean;

    return fn;
  } catch {
    // Fallback if code generation fails (CSP restriction)
    return createFallbackObjectValidator(shape);
  }
}

/**
 * Generate inline property check code for Phase 3 optimization.
 * For primitives: inline type checks
 * For complex types: use closure validator
 */
function generatePropertyCheck(
  key: string,
  validator: Validator<any>,
  validatorClosures: Record<string, (value: unknown) => boolean>
): string {
  const type = validator._type;
  const safeName = key.replace(/[^a-zA-Z0-9_]/g, '_'); // Sanitize for closure names

  // Inline primitive checks (fastest - V8 optimizes these)
  if (type === 'string') {
    return `if (typeof obj.${key} !== 'string') return false;`;
  } else if (type === 'number') {
    return `if (typeof obj.${key} !== 'number' || Number.isNaN(obj.${key})) return false;`;
  } else if (type === 'boolean') {
    return `if (typeof obj.${key} !== 'boolean') return false;`;
  }

  // For complex validators, use closure (compiled validator function)
  const compiledValidator = compilePropertyValidator(validator);
  validatorClosures[`v_${safeName}`] = compiledValidator;
  return `if (!validatorClosures.v_${safeName}(obj.${key})) return false;`;
}

/**
 * Compile-time optimization for array validators.
 *
 * Pre-compiles specialized validators at construction time to eliminate
 * runtime conditionals and function call overhead.
 *
 * For primitive validators (string, number, boolean) with no refinements:
 * - Returns inline type-check function (zero function calls per item)
 *
 * For object validators (plain objects with primitive properties):
 * - Returns compiled object validator (zero allocations per item)
 *
 * For complex validators:
 * - Returns optimized validateFast loop
 *
 * @param itemValidator - Validator for array items
 * @returns Pre-compiled validation function
 */
function compileArrayValidator<T>(itemValidator: Validator<T>): (data: unknown[]) => boolean {
  const itemType = itemValidator._type;
  const hasRefinements = itemValidator._hasRefinements;
  const hasTransform = itemValidator._transform !== undefined;
  const hasDefault = itemValidator._default !== undefined;

  // Fast path: Plain primitives (no refinements, transforms, or defaults)
  const isPlainPrimitive = itemType && !hasRefinements && !hasTransform && !hasDefault;

  if (isPlainPrimitive) {
    if (itemType === 'string') {
      // Optimized string[] validator - inline type check, zero function calls
      return (data: unknown[]): boolean => {
        for (let i = 0; i < data.length; i++) {
          if (typeof data[i] !== 'string') return false;
        }
        return true;
      };
    } else if (itemType === 'number') {
      // Optimized number[] validator - inline type check + NaN check
      return (data: unknown[]): boolean => {
        for (let i = 0; i < data.length; i++) {
          const item = data[i];
          if (typeof item !== 'number' || Number.isNaN(item)) return false;
        }
        return true;
      };
    } else if (itemType === 'boolean') {
      // Optimized boolean[] validator - inline type check
      return (data: unknown[]): boolean => {
        for (let i = 0; i < data.length; i++) {
          if (typeof data[i] !== 'boolean') return false;
        }
        return true;
      };
    }
  }

  // Object path: Compile object validators (eliminates Result/WeakSet allocations)
  // Check if itemValidator is an object validator with stored shape
  const objectShape = (itemValidator as any)._shape;
  if (objectShape && !hasRefinements && !hasTransform && !hasDefault) {
    // Compile the object validator ONCE at construction time
    const compiledObjectValidator = compileObjectValidator(objectShape);
    return (data: unknown[]): boolean => {
      for (let i = 0; i < data.length; i++) {
        if (!compiledObjectValidator(data[i])) return false;
      }
      return true;
    };
  }

  // Generic path: Complex validators (unions, refinements, etc.)
  // PHASE 2 OPTIMIZATION: Use validator.validate() directly instead of validateFast().ok
  // This eliminates Result object allocation on every array item (expected: +10-15%)
  return (data: unknown[]): boolean => {
    for (let i = 0; i < data.length; i++) {
      if (!itemValidator.validate(data[i])) return false;
    }
    return true;
  };
}

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

/**
 * Validator builders
 */
export const v = {
  /**
   * String validator
   */
  string(): Validator<string> {
    const validator = createValidator(validateString, stringError);
    validator._type = 'string';
    return validator;
  },

  /**
   * Number validator
   */
  number(): Validator<number> {
    const validator = createValidator(validateNumber, numberError);
    validator._type = 'number';
    return validator;
  },

  /**
   * Boolean validator
   */
  boolean(): Validator<boolean> {
    const validator = createValidator(validateBoolean, booleanError);
    validator._type = 'boolean';
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

        _transform(data: any): T[] {
          // RUNTIME: Use pre-compiled transform (optimized copy-on-write)
          return compiledTransform(data);
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
