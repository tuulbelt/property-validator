/**
 * Property Validator - v namespace entry point (v0.9.2)
 *
 * Import the full v namespace object for fluent API usage:
 *
 * @example
 * ```typescript
 * import { v, validate } from '@tuulbelt/property-validator/v';
 *
 * const UserSchema = v.object({
 *   name: v.string().min(1),
 *   age: v.number().positive()
 * });
 * ```
 *
 * Note: This import includes the full v namespace.
 * For smaller bundle sizes with tree-shaking, use named imports from the main entry point:
 *
 * ```typescript
 * import { string, number, object, validate } from '@tuulbelt/property-validator';
 * ```
 */

// Import named validators to build v namespace
import {
  string,
  number,
  boolean,
  array,
  tuple,
  object,
  optional,
  nullable,
  union,
  literal,
  lazy,
  enum_,
  validate,
  check,
  compile,
  compileCheck,
} from './index.js';

// Import types
import type {
  Validator,
  StringValidator,
  NumberValidator,
  ArrayValidator,
} from './types.js';

// Type helper for union
type UnionType<T extends readonly Validator<any>[]> = {
  [K in keyof T]: T[K] extends Validator<infer U> ? U : never;
}[number];

// Type helper for tuple
type TupleType<T extends readonly Validator<any>[]> = {
  [K in keyof T]: T[K] extends Validator<infer U> ? U : never;
};

/**
 * The v namespace provides a fluent API for building validators.
 * Use this when you prefer method chaining: v.string().email().min(1)
 */
export const v = {
  /**
   * String validator with built-in constraints
   * @example
   * v.string().email()
   * v.string().url()
   * v.string().min(1).max(100)
   */
  string(): StringValidator {
    return string() as StringValidator;
  },

  /**
   * Number validator with built-in constraints
   * @example
   * v.number().int()
   * v.number().positive()
   * v.number().range(0, 100)
   */
  number(): NumberValidator {
    return number() as NumberValidator;
  },

  /**
   * Boolean validator
   */
  boolean(): Validator<boolean> {
    return boolean();
  },

  /**
   * Array validator with optional length constraints
   */
  array<T>(itemValidator: Validator<T>): ArrayValidator<T> {
    return array(itemValidator);
  },

  /**
   * Tuple validator - fixed-length array with per-index types
   */
  tuple<T extends readonly Validator<any>[]>(
    validators: T
  ): Validator<TupleType<T>> {
    return tuple(validators);
  },

  /**
   * Object validator
   */
  object<T extends Record<string, unknown>>(
    shape: { [K in keyof T]: Validator<T[K]> }
  ): Validator<T> {
    return object(shape);
  },

  /**
   * Optional validator
   */
  optional<T>(validator: Validator<T>): Validator<T | undefined> {
    return optional(validator);
  },

  /**
   * Nullable validator
   */
  nullable<T>(validator: Validator<T>): Validator<T | null> {
    return nullable(validator);
  },

  /**
   * Union validator - validates if data matches any of the provided schemas
   */
  union<T extends readonly Validator<any>[]>(
    validators: T
  ): Validator<UnionType<T>> {
    return union(validators);
  },

  /**
   * Literal validator
   */
  literal<T extends string | number | boolean | null | undefined>(
    value: T
  ): Validator<T> {
    return literal(value);
  },

  /**
   * Lazy validator - for recursive schemas
   */
  lazy<T>(fn: () => Validator<T>): Validator<T> {
    return lazy(fn);
  },

  /**
   * Enum validator
   */
  enum<T extends readonly (string | number)[]>(
    values: T
  ): Validator<T[number]> {
    return enum_(values);
  },
};

// Re-export common functions for convenience
export { validate, check, compile, compileCheck };

// Re-export types for convenience
export type {
  Validator,
  Result,
  ValidationError,
  StringValidator,
  NumberValidator,
  ArrayValidator,
  PathSegment,
  ValidationOptions,
  CompiledValidator,
  CompiledCheck,
} from './types.js';
