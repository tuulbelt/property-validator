#!/usr/bin/env -S npx tsx
/**
 * Property Validator
 *
 * Runtime type validation with TypeScript inference.
 *
 * v0.10.0: Full modular architecture - validators extracted to individual modules
 *
 * Import options:
 * - Full v namespace: import { v, validate } from 'property-validator'
 * - Tree-shakeable: import { string, number, validate } from 'property-validator'
 * - Fluent only: import { v, validate } from 'property-validator/v'
 */

// Version constant - update here when releasing
export const VERSION = '0.10.0';

// ============================================================================
// Type Exports (from types.ts)
// ============================================================================

// Re-export ValidationError class (runtime value)
export { ValidationError } from './types.js';

// Re-export all types for backwards compatibility
export type {
  PathSegment,
  Result,
  ValidationOptions,
  Validator,
  ArrayValidator,
  ObjectValidator,
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

// ============================================================================
// Core API (from core/)
// ============================================================================

export { validate, check, compile, compileCheck } from './core/index.js';

// ============================================================================
// Validators (from validators/)
// ============================================================================

export {
  // Simple validators
  boolean,
  literal,
  lazy,
  optional,
  nullable,
  // String validators
  string,
  createStringValidator,
  // Number validators
  number,
  createNumberValidator,
  // Collection validators
  array,
  tuple,
  object,
  record,
  // Union validators
  union,
  discriminatedUnion,
  // Enum validator
  enum_,
} from './validators/index.js';

// ============================================================================
// v Namespace (fluent API)
// ============================================================================

export { v } from './v.js';

// ============================================================================
// Tree-Shakeable Refinement Functions
// ============================================================================

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

// ============================================================================
// Internal Exports (for advanced usage)
// ============================================================================

// Export validateWithPath for advanced use cases (custom validators)
export { validateWithPath } from './internal/core.js';

// Export createValidator for building custom validators
export { createValidator } from './internal/core.js';

// ============================================================================
// JSON Schema Export (v0.13.0)
// ============================================================================

export { toJsonSchema } from './json-schema.js';
export type { JsonSchema, JsonSchemaType, ToJsonSchemaOptions } from './json-schema.js';
