/**
 * Property Validator - Union Validators
 *
 * Contains union() and discriminatedUnion() validators.
 */

import type { PathSegment, Result, UnionType, ValidationOptions, Validator } from '../types.js';
import { ValidationError } from '../types.js';
import {
  createValidator,
  getTypeName,
  validateWithPath,
} from '../internal/core.js';
import { compileUnionValidator } from '../jit.js';

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
