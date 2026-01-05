/**
 * Property Validator - Type Definitions
 *
 * All type definitions and the ValidationError class.
 * Extracted for modularization (v0.9.0).
 */

/**
 * Path segment type - can be string (property name) or number (array index)
 * Numbers are stored raw and only formatted to "[0]" when displaying errors
 * This avoids string allocation on every array iteration (hot path optimization)
 */
export type PathSegment = string | number;

/**
 * Structured validation error with formatting support
 *
 * OPTIMIZED: Does not extend Error to avoid stack trace capture overhead.
 * Stack traces are captured lazily only when accessed via .stack getter.
 * This provides 52x faster error creation while keeping all debugging features.
 */
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

  /**
   * Safe JSON serialization (no stack traces in production)
   */
  toSafeJSON(): object {
    return {
      name: this.name,
      message: this.message,
      path: this.path,
      expected: this.expected,
      code: this.code,
    };
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
  _compiled?: (data: unknown) => boolean;  // Internal: JIT-compiled validator for fast path (v0.8.0)
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
 * String validator with built-in constraints (v0.8.5)
 */
export interface StringValidator extends Validator<string> {
  /** Minimum string length */
  min(length: number): StringValidator;
  /** Maximum string length */
  max(length: number): StringValidator;
  /** Exact string length */
  length(length: number): StringValidator;
  /** Non-empty string (min length 1) */
  nonempty(): StringValidator;
  /** Must be valid email format */
  email(): StringValidator;
  /** Must be valid URL format */
  url(): StringValidator;
  /** Must be valid UUID format (v1-v5) */
  uuid(): StringValidator;
  /** Must match custom regex pattern */
  pattern(regex: RegExp, message?: string): StringValidator;
  /** Must start with prefix */
  startsWith(prefix: string): StringValidator;
  /** Must end with suffix */
  endsWith(suffix: string): StringValidator;
  /** Must contain substring */
  includes(substring: string): StringValidator;
  /** Must be valid ISO 8601 datetime (YYYY-MM-DDTHH:MM:SS) */
  datetime(): StringValidator;
  /** Must be valid ISO 8601 date (YYYY-MM-DD) */
  date(): StringValidator;
  /** Must be valid ISO 8601 time (HH:MM:SS) */
  time(): StringValidator;
  /** Must be valid IP address (IPv4 or IPv6) */
  ip(): StringValidator;
  /** Must be valid IPv4 address */
  ipv4(): StringValidator;
  /** Must be valid IPv6 address */
  ipv6(): StringValidator;
}

/**
 * Number validator with built-in constraints (v0.8.5)
 */
export interface NumberValidator extends Validator<number> {
  /** Must be an integer */
  int(): NumberValidator;
  /** Must be positive (> 0) */
  positive(): NumberValidator;
  /** Must be negative (< 0) */
  negative(): NumberValidator;
  /** Must be non-negative (>= 0) */
  nonnegative(): NumberValidator;
  /** Must be non-positive (<= 0) */
  nonpositive(): NumberValidator;
  /** Minimum value (inclusive) */
  min(n: number): NumberValidator;
  /** Maximum value (inclusive) */
  max(n: number): NumberValidator;
  /** Must be within range [min, max] (inclusive) */
  range(min: number, max: number): NumberValidator;
  /** Must be a finite number */
  finite(): NumberValidator;
  /** Must be a safe integer (within Number.MIN_SAFE_INTEGER to MAX) */
  safeInt(): NumberValidator;
  /** Must be a multiple of n (useful for currency, steps) */
  multipleOf(n: number): NumberValidator;
}

/**
 * Tuple type inference helper
 */
export type TupleType<T extends readonly Validator<any>[]> = {
  [K in keyof T]: T[K] extends Validator<infer U> ? U : never;
};

/**
 * Union type inference helper
 */
export type UnionType<T extends readonly Validator<any>[]> = T extends readonly [
  Validator<infer U>,
  ...infer Rest
]
  ? Rest extends readonly Validator<any>[]
    ? U | UnionType<Rest>
    : U
  : never;

/**
 * Compiled validator type - pre-compiled for repeated validation
 */
export type CompiledValidator<T> = (data: unknown) => Result<T>;

/**
 * Compiled check type - boolean-only validation
 */
export type CompiledCheck = (data: unknown) => boolean;

// ============================================================================
// Tree-Shakeable Refinement Types (v0.9.1)
// ============================================================================

/**
 * String refinement - a constraint that can be applied to string validators
 * Each refinement is a separate export, enabling tree-shaking
 */
export interface StringRefinement {
  readonly _kind: 'string-refinement';
  readonly check: (value: string) => boolean;
  readonly message: string;
}

/**
 * Number refinement - a constraint that can be applied to number validators
 * Each refinement is a separate export, enabling tree-shaking
 */
export interface NumberRefinement {
  readonly _kind: 'number-refinement';
  readonly check: (value: number) => boolean;
  readonly message: string;
}

/**
 * Array refinement - a constraint that can be applied to array validators
 * Each refinement is a separate export, enabling tree-shaking
 */
export interface ArrayRefinement<T = unknown> {
  readonly _kind: 'array-refinement';
  readonly check: (value: T[]) => boolean;
  readonly message: string;
}
