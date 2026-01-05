/**
 * Number Refinement Functions (Tree-Shakeable)
 *
 * Each function is a separate export, enabling bundlers to eliminate unused refinements.
 * Import only what you need:
 *
 * @example
 * import { number, int, positive, min } from 'property-validator';
 * const AgeSchema = number(int(), positive());
 * const PriceSchema = number(min(0));
 */

import type { NumberRefinement } from '../types.js';

// ============================================================================
// Integer Refinements
// ============================================================================

/**
 * Must be an integer (no decimals)
 * @example number(int())
 */
export function int(): NumberRefinement {
  return {
    _kind: 'number-refinement',
    check: (n) => Number.isInteger(n),
    message: 'Number must be an integer',
  };
}

/**
 * Must be a safe integer (within JavaScript's precise range)
 * Safe integers: -(2^53 - 1) to (2^53 - 1)
 * @example number(safeInt())
 */
export function safeInt(): NumberRefinement {
  return {
    _kind: 'number-refinement',
    check: (n) => Number.isSafeInteger(n),
    message: 'Number must be a safe integer',
  };
}

// ============================================================================
// Sign Refinements
// ============================================================================

/**
 * Must be positive (> 0)
 * @example number(positive())
 */
export function positive(): NumberRefinement {
  return {
    _kind: 'number-refinement',
    check: (n) => n > 0,
    message: 'Number must be positive',
  };
}

/**
 * Must be negative (< 0)
 * @example number(negative())
 */
export function negative(): NumberRefinement {
  return {
    _kind: 'number-refinement',
    check: (n) => n < 0,
    message: 'Number must be negative',
  };
}

/**
 * Must be non-negative (>= 0)
 * @example number(nonnegative())
 */
export function nonnegative(): NumberRefinement {
  return {
    _kind: 'number-refinement',
    check: (n) => n >= 0,
    message: 'Number must be non-negative',
  };
}

/**
 * Must be non-positive (<= 0)
 * @example number(nonpositive())
 */
export function nonpositive(): NumberRefinement {
  return {
    _kind: 'number-refinement',
    check: (n) => n <= 0,
    message: 'Number must be non-positive',
  };
}

// ============================================================================
// Range Refinements
// ============================================================================

/**
 * Minimum value (inclusive)
 * @example number(min(0))
 */
export function min(n: number): NumberRefinement {
  return {
    _kind: 'number-refinement',
    check: (x) => x >= n,
    message: `Number must be at least ${n}`,
  };
}

/**
 * Maximum value (inclusive)
 * @example number(max(100))
 */
export function max(n: number): NumberRefinement {
  return {
    _kind: 'number-refinement',
    check: (x) => x <= n,
    message: `Number must be at most ${n}`,
  };
}

/**
 * Must be within range [min, max] (inclusive)
 * @example number(range(0, 100))
 */
export function range(minVal: number, maxVal: number): NumberRefinement {
  return {
    _kind: 'number-refinement',
    check: (n) => n >= minVal && n <= maxVal,
    message: `Number must be between ${minVal} and ${maxVal}`,
  };
}

// ============================================================================
// Special Refinements
// ============================================================================

/**
 * Must be finite (not Infinity or -Infinity)
 * @example number(finite())
 */
export function finite(): NumberRefinement {
  return {
    _kind: 'number-refinement',
    check: (n) => Number.isFinite(n),
    message: 'Number must be finite',
  };
}

/**
 * Must be a multiple of n (useful for currency, steps)
 * @example number(multipleOf(0.01)) // Currency with 2 decimals
 * @example number(multipleOf(5)) // Multiples of 5
 */
export function multipleOf(n: number): NumberRefinement {
  return {
    _kind: 'number-refinement',
    check: (x) => {
      // Handle floating point precision issues
      const remainder = x % n;
      return Math.abs(remainder) < Number.EPSILON || Math.abs(n - Math.abs(remainder)) < Number.EPSILON;
    },
    message: `Number must be a multiple of ${n}`,
  };
}

// ============================================================================
// v0.9.5: Extended Number Validators
// ============================================================================

/**
 * Must be a valid network port number (0-65535)
 * @example number(port())
 * @example number(int(), port()) // Integer port
 */
export function port(): NumberRefinement {
  return {
    _kind: 'number-refinement',
    check: (n) => Number.isInteger(n) && n >= 0 && n <= 65535,
    message: 'Must be a valid port number (0-65535)',
  };
}

/**
 * Must be a valid latitude (-90 to 90)
 * @example number(latitude())
 */
export function latitude(): NumberRefinement {
  return {
    _kind: 'number-refinement',
    check: (n) => n >= -90 && n <= 90,
    message: 'Must be a valid latitude (-90 to 90)',
  };
}

/**
 * Must be a valid longitude (-180 to 180)
 * @example number(longitude())
 */
export function longitude(): NumberRefinement {
  return {
    _kind: 'number-refinement',
    check: (n) => n >= -180 && n <= 180,
    message: 'Must be a valid longitude (-180 to 180)',
  };
}

/**
 * Must be a percentage value (0 to 100)
 * @example number(percentage())
 */
export function percentage(): NumberRefinement {
  return {
    _kind: 'number-refinement',
    check: (n) => n >= 0 && n <= 100,
    message: 'Must be a valid percentage (0-100)',
  };
}
