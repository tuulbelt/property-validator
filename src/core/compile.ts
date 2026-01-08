/**
 * Property Validator - Compilation API
 *
 * Functions to compile validators into optimized validation functions.
 */

import type {
  Result,
  Validator,
  CompiledValidator,
  CompiledCheck,
} from '../types.js';

import { getTypeName } from '../internal/core.js';
import { validate } from './validate.js';

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
 * const validateUser = compile(userValidator);
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
 * const checkUser = compileCheck(userValidator);
 *
 * // Maximum speed validation in hot loops
 * for (const user of users) {
 *   if (checkUser(user)) {
 *     processUser(user);
 *   }
 * }
 *
 * // Compare to check() which has function call overhead:
 * // check(userValidator, user)  // ~5% slower due to validator lookup
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
