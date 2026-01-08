/**
 * Property Validator - Number Validators
 *
 * Contains both chainable NumberValidator and functional number() API.
 */

import type { NumberValidator, NumberRefinement, Validator } from '../types.js';
import {
  createValidator,
  getTypeName,
  validateNumber,
  numberError,
} from '../internal/core.js';

/**
 * Create a NumberValidator with chainable constraint methods
 * @internal
 */
export function createNumberValidator(
  refinements: Array<{ check: (n: number) => boolean; message: string; jsonSchema?: { type: string; value?: unknown } }> = []
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
    // Expose refinements for JSON Schema introspection
    validator._refinements = refinements as any;
  }

  // Add chainable methods
  validator.int = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => Number.isInteger(n),
      message: 'Number must be an integer'
      // No standard JSON Schema keyword for integer type (would need "type": "integer")
    }]);
  };

  validator.positive = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n > 0,
      message: 'Number must be positive',
      jsonSchema: { type: 'exclusiveMinimum', value: 0 }
    }]);
  };

  validator.negative = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n < 0,
      message: 'Number must be negative',
      jsonSchema: { type: 'exclusiveMaximum', value: 0 }
    }]);
  };

  validator.nonnegative = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n >= 0,
      message: 'Number must be non-negative',
      jsonSchema: { type: 'minimum', value: 0 }
    }]);
  };

  validator.nonpositive = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n <= 0,
      message: 'Number must be non-positive',
      jsonSchema: { type: 'maximum', value: 0 }
    }]);
  };

  validator.min = (minVal: number): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n >= minVal,
      message: `Number must be at least ${minVal}`,
      jsonSchema: { type: 'minimum', value: minVal }
    }]);
  };

  validator.max = (maxVal: number): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n <= maxVal,
      message: `Number must be at most ${maxVal}`,
      jsonSchema: { type: 'maximum', value: maxVal }
    }]);
  };

  validator.range = (minVal: number, maxVal: number): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n >= minVal && n <= maxVal,
      message: `Number must be between ${minVal} and ${maxVal}`,
      jsonSchema: { type: 'minimum', value: minVal }
    }, {
      check: () => true,  // No-op check, just adds maximum
      message: '',
      jsonSchema: { type: 'maximum', value: maxVal }
    }]);
  };

  validator.finite = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => Number.isFinite(n),
      message: 'Number must be finite'
      // No standard JSON Schema keyword for finite
    }]);
  };

  validator.safeInt = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => Number.isSafeInteger(n),
      message: 'Number must be a safe integer'
      // No standard JSON Schema keyword for safe integer
    }]);
  };

  validator.multipleOf = (divisor: number): NumberValidator => {
    return createNumberValidator([...refinements, {
      // Handle floating point precision: check if remainder is close to 0 or divisor
      check: (n) => {
        const remainder = Math.abs(n % divisor);
        return remainder < 1e-10 || Math.abs(remainder - Math.abs(divisor)) < 1e-10;
      },
      message: `Number must be a multiple of ${divisor}`,
      jsonSchema: { type: 'multipleOf', value: divisor }
    }]);
  };

  // v0.9.5: Extended number validators
  validator.port = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => Number.isInteger(n) && n >= 0 && n <= 65535,
      message: 'Must be a valid port number (0-65535)',
      jsonSchema: { type: 'minimum', value: 0 }
    }, {
      check: () => true,
      message: '',
      jsonSchema: { type: 'maximum', value: 65535 }
    }]);
  };

  validator.latitude = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n >= -90 && n <= 90,
      message: 'Must be a valid latitude (-90 to 90)',
      jsonSchema: { type: 'minimum', value: -90 }
    }, {
      check: () => true,
      message: '',
      jsonSchema: { type: 'maximum', value: 90 }
    }]);
  };

  validator.longitude = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n >= -180 && n <= 180,
      message: 'Must be a valid longitude (-180 to 180)',
      jsonSchema: { type: 'minimum', value: -180 }
    }, {
      check: () => true,
      message: '',
      jsonSchema: { type: 'maximum', value: 180 }
    }]);
  };

  validator.percentage = (): NumberValidator => {
    return createNumberValidator([...refinements, {
      check: (n) => n >= 0 && n <= 100,
      message: 'Must be a valid percentage (0-100)',
      jsonSchema: { type: 'minimum', value: 0 }
    }, {
      check: () => true,
      message: '',
      jsonSchema: { type: 'maximum', value: 100 }
    }]);
  };

  return validator;
}

/**
 * Number validator - accepts optional refinements for tree-shaking
 *
 * @example
 * // Without refinements (backwards compatible, has chainable methods)
 * const n = number();
 * const posInt = number().int().positive();
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
      const transformedValidator = createNumberValidator().transform(fn);
      return transformedValidator;
    },
    optional(): Validator<number | undefined> {
      return createValidator(
        (data): data is number | undefined => data === undefined || this.validate(data),
        (data) => this.error(data)
      );
    },
    nullable(): Validator<number | null> {
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
      const defaultValidator = createNumberValidator().default(value);
      return defaultValidator;
    },
  };

  validator._type = 'number';

  // Expose refinements for JSON Schema introspection
  if (refinements.length > 0) {
    validator._refinements = refinements;
  }

  // Enable JIT bypass for fast path
  if (internalRefinements.length === 0) {
    validator._compiled = (data: unknown) => typeof data === 'number' && !Number.isNaN(data);
  }

  return validator;
}
