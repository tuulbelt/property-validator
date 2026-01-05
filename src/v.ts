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
 * Note: This import includes the full v namespace (~30KB).
 * For smaller bundle sizes, use named imports from the main entry point:
 *
 * ```typescript
 * import { string, number, object, validate } from '@tuulbelt/property-validator';
 * ```
 */

// Re-export v namespace and common functions
export { v, validate, check, compile, compileCheck } from './index.js';

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
