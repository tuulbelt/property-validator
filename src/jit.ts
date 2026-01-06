/**
 * Property Validator - JIT Compilation Module
 *
 * Just-In-Time compilation for maximum performance validation.
 * Uses new Function() for code generation with CSP fallback.
 *
 * Extracted from index.ts for better code organization (v0.12.0).
 */

import type { Validator } from './types.js';

// ============================================================================
// CSP Detection
// ============================================================================

/**
 * Check if code generation (new Function) is available.
 * Returns false in CSP-restricted environments.
 */
let codeGenerationAvailable: boolean | null = null;

export function canUseCodeGeneration(): boolean {
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

// ============================================================================
// Property Compilation
// ============================================================================

/**
 * Compile a single property validator for inline validation.
 * Returns a function that validates without allocating Result objects.
 *
 * @param validator - Property validator
 * @returns Compiled validator function: (data: unknown) => boolean
 * @internal
 */
export function compilePropertyValidator<T>(validator: Validator<T>): (data: unknown) => boolean {
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

  // v0.8.0 OPTIMIZATION: Use _compiled for nested validators if available
  // This chains JIT-compiled validators for recursive speedup (nested objects, arrays)
  if (validator._compiled && !validator._hasRefinements) {
    return validator._compiled;
  }

  // Fallback: Use validate() method (still faster than validateFast - no Result allocation)
  return (data: unknown): boolean => validator.validate(data);
}

// ============================================================================
// Inline Type Check Generation
// ============================================================================

/**
 * Generate inline type check code for a validator.
 * Used by JIT union compilation to generate fast inline checks.
 *
 * @param validator - The validator to generate code for
 * @param valueExpr - The expression representing the value (e.g., 'data')
 * @returns Inline check code string, or null if cannot be inlined
 * @internal
 */
export function generateInlineTypeCheck(validator: Validator<any>, valueExpr: string): string | null {
  const validatorType = validator._type;
  const hasRefinements = validator._hasRefinements;
  const hasTransform = validator._transform !== undefined;
  const hasDefault = validator._default !== undefined;

  // Only inline plain validators (no refinements, transforms, or defaults)
  if (hasRefinements || hasTransform || hasDefault) {
    return null;
  }

  // Primitives - inline type checks
  if (validatorType === 'string') {
    return `typeof ${valueExpr} === 'string'`;
  } else if (validatorType === 'number') {
    return `(typeof ${valueExpr} === 'number' && !Number.isNaN(${valueExpr}))`;
  } else if (validatorType === 'boolean') {
    return `typeof ${valueExpr} === 'boolean'`;
  }

  // Literals - inline equality check
  const literalValue = (validator as any)._literalValue;
  if (literalValue !== undefined) {
    if (typeof literalValue === 'string') {
      return `${valueExpr} === '${literalValue.replace(/'/g, "\\'")}'`;
    } else {
      return `${valueExpr} === ${JSON.stringify(literalValue)}`;
    }
  }

  // Objects with shape - inline property checks
  // PHASE 3: Array JIT for objects - generate inline object validation
  // Note: Object validators may not have _type set, so check _shape directly
  const shape = (validator as any)._shape;
  if (shape && typeof shape === 'object') {
    const checks: string[] = [];

    // Object null/type check
    checks.push(`typeof ${valueExpr} === 'object'`);
    checks.push(`${valueExpr} !== null`);

    // Generate inline checks for each property
    for (const [key, propValidator] of Object.entries(shape)) {
      // Escape property key for safe access
      const propExpr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
        ? `${valueExpr}.${key}`
        : `${valueExpr}[${JSON.stringify(key)}]`;

      const propCheck = generateInlineTypeCheck(propValidator as Validator<any>, propExpr);

      if (propCheck === null) {
        // Cannot inline this property - fall back to closure
        return null;
      }

      checks.push(propCheck);
    }

    // Combine all checks with &&
    return `(${checks.join(' && ')})`;
  }

  // Cannot inline this validator type
  return null;
}

// ============================================================================
// Object Validator Compilation
// ============================================================================

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

/**
 * Compile an object validator for inline validation.
 * Pre-compiles all property validators at construction time.
 * Returns a function that validates without allocating Result objects or WeakSets.
 *
 * @param shape - Object schema (e.g., { name: v.string(), age: v.number() })
 * @returns Compiled validator function: (data: unknown) => boolean
 * @internal
 */
export function compileObjectValidator<T extends Record<string, unknown>>(
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

// ============================================================================
// Union Validator Compilation
// ============================================================================

/**
 * Compile a union validator using new Function() for maximum speed.
 *
 * Generates code like: `return (typeof data === 'string') || (typeof data === 'number');`
 * This eliminates loop overhead and function call overhead per validator.
 *
 * @param validators - Array of validators in the union
 * @returns Compiled union check function, or null if cannot compile
 * @internal
 */
export function compileUnionValidator(validators: readonly Validator<any>[]): ((data: unknown) => boolean) | null {
  // Check if code generation is available (CSP check)
  if (!canUseCodeGeneration()) {
    return null;
  }

  const checks: string[] = [];
  const closures: Record<string, (value: unknown) => boolean> = {};
  let closureIndex = 0;

  for (const validator of validators) {
    // Try to generate inline code first
    const inlineCode = generateInlineTypeCheck(validator, 'data');

    if (inlineCode !== null) {
      checks.push(`(${inlineCode})`);
    } else if (validator._compiled && !validator._hasRefinements) {
      // Use closure for complex validators that have _compiled
      const closureName = `c${closureIndex++}`;
      closures[closureName] = validator._compiled;
      checks.push(`closures.${closureName}(data)`);
    } else {
      // Cannot compile this union - fall back to loop-based approach
      return null;
    }
  }

  // Generate the union check function
  const code = `return ${checks.join(' || ')};`;

  try {
    const fn = new Function('closures', `
      return function(data) {
        ${code}
      }
    `)(closures) as (data: unknown) => boolean;

    return fn;
  } catch {
    // Fallback if code generation fails
    return null;
  }
}

// ============================================================================
// Array Validator Compilation
// ============================================================================

/**
 * PHASE 4: JIT compile complete array validator using new Function() for maximum speed.
 *
 * Generates a COMPLETE validator function that includes Array.isArray check:
 * ```
 * if (!Array.isArray(data)) return false;
 * for (let i = 0; i < data.length; i++) {
 *   if (typeof data[i] !== 'string') return false;
 * }
 * return true;
 * ```
 *
 * This eliminates the wrapper function overhead and allows V8 to optimize the entire
 * validation as a single function (no intermediate function calls).
 *
 * @param itemValidator - Validator for array items
 * @returns JIT-compiled complete validator (includes Array.isArray), or null if cannot compile
 * @internal
 */
export function compileArrayValidatorJIT<T>(itemValidator: Validator<T>): ((data: unknown) => boolean) | null {
  // Check if code generation is available (CSP check)
  if (!canUseCodeGeneration()) {
    return null;
  }

  // Try to generate inline code for item validation (primitives, literals, objects)
  // PHASE 3: generateInlineTypeCheck now supports objects with _shape
  const inlineCheck = generateInlineTypeCheck(itemValidator, 'data[i]');

  if (inlineCheck !== null) {
    // Generate COMPLETE JIT function with Array.isArray + inline type check loop
    // OPTIMIZATION: Cache data.length in local variable to avoid repeated property access
    const fnBody = `
      if (!Array.isArray(data)) return false;
      const len = data.length;
      for (let i = 0; i < len; i++) {
        if (!(${inlineCheck})) return false;
      }
      return true;
    `;

    try {
      return new Function('data', fnBody) as (data: unknown) => boolean;
    } catch {
      return null;
    }
  }

  // Check if item validator has _compiled (for objects, unions, etc.)
  if (itemValidator._compiled && !itemValidator._hasRefinements) {
    // Generate COMPLETE JIT function with closure reference
    // OPTIMIZATION: Cache data.length in local variable
    const fnBody = `
      if (!Array.isArray(data)) return false;
      const len = data.length;
      for (let i = 0; i < len; i++) {
        if (!itemCheck(data[i])) return false;
      }
      return true;
    `;

    try {
      return new Function('itemCheck', 'data', fnBody).bind(null, itemValidator._compiled) as (data: unknown) => boolean;
    } catch {
      return null;
    }
  }

  // Cannot JIT compile - fall back to closure-based
  return null;
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
export function compileArrayValidator<T>(itemValidator: Validator<T>): (data: unknown[]) => boolean {
  // PHASE 4: Try JIT compilation first for maximum performance
  const jitValidator = compileArrayValidatorJIT(itemValidator);
  if (jitValidator !== null) {
    return jitValidator;
  }

  // Fallback: closure-based validation (CSP-safe)
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

// ============================================================================
// Discriminated Union Compilation
// ============================================================================

/**
 * JIT compile discriminated union validator for maximum performance.
 *
 * Generates code that:
 * 1. Checks if data is an object with the discriminator key
 * 2. Uses switch statement for O(1) branch selection
 * 3. Delegates to variant-specific compiled validators
 *
 * @param discriminator - Property key used to distinguish variants
 * @param variantMap - Map from discriminator values to validators
 * @returns JIT-compiled validator, or null if cannot compile
 * @internal
 */
export function compileDiscriminatedUnionValidator<T>(
  discriminator: string,
  variantMap: Map<unknown, Validator<any>>
): ((data: unknown) => boolean) | null {
  // Check if code generation is available (CSP check)
  if (!canUseCodeGeneration()) {
    return null;
  }

  // Build switch cases
  const cases: string[] = [];
  const closures: Record<string, (value: unknown) => boolean> = {};
  let closureIndex = 0;

  for (const [discriminatorValue, validator] of variantMap) {
    // Generate case label
    const caseLabel = typeof discriminatorValue === 'string'
      ? `case '${discriminatorValue.replace(/'/g, "\\'")}':`
      : `case ${JSON.stringify(discriminatorValue)}:`;

    // Try to use _compiled for the variant validator
    if (validator._compiled && !validator._hasRefinements) {
      const closureName = `v${closureIndex++}`;
      closures[closureName] = validator._compiled;
      cases.push(`${caseLabel} return closures.${closureName}(data);`);
    } else {
      // Fall back to validate method
      const closureName = `v${closureIndex++}`;
      closures[closureName] = (d: unknown) => validator.validate(d);
      cases.push(`${caseLabel} return closures.${closureName}(data);`);
    }
  }

  // Generate the switch statement
  const code = `
    if (typeof data !== 'object' || data === null) return false;
    const discriminatorValue = data['${discriminator.replace(/'/g, "\\'")}'];
    switch (discriminatorValue) {
      ${cases.join('\n      ')}
      default: return false;
    }
  `;

  try {
    const fn = new Function('closures', `
      return function(data) {
        ${code}
      }
    `)(closures) as (data: unknown) => boolean;

    return fn;
  } catch {
    // Fallback if code generation fails
    return null;
  }
}
