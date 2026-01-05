/**
 * Array Refinement Functions (Tree-Shakeable)
 *
 * Each function is a separate export, enabling bundlers to eliminate unused refinements.
 * Import only what you need:
 *
 * @example
 * import { array, string, minItems, maxItems } from 'property-validator';
 * const TagsSchema = array(string(), minItems(1), maxItems(10));
 */

import type { ArrayRefinement } from '../types.js';

// ============================================================================
// Length Refinements
// ============================================================================

/**
 * Minimum array length
 * @example array(string(), minItems(1)) // At least 1 item
 */
export function minItems<T>(n: number): ArrayRefinement<T> {
  return {
    _kind: 'array-refinement',
    check: (arr) => arr.length >= n,
    message: `Array must have at least ${n} item(s)`,
  };
}

/**
 * Maximum array length
 * @example array(string(), maxItems(100)) // At most 100 items
 */
export function maxItems<T>(n: number): ArrayRefinement<T> {
  return {
    _kind: 'array-refinement',
    check: (arr) => arr.length <= n,
    message: `Array must have at most ${n} item(s)`,
  };
}

/**
 * Exact array length
 * @example array(string(), itemCount(3)) // Exactly 3 items
 */
export function itemCount<T>(n: number): ArrayRefinement<T> {
  return {
    _kind: 'array-refinement',
    check: (arr) => arr.length === n,
    message: `Array must have exactly ${n} item(s)`,
  };
}

/**
 * Non-empty array (at least 1 item)
 * @example array(string(), nonemptyArray())
 */
export function nonemptyArray<T>(): ArrayRefinement<T> {
  return {
    _kind: 'array-refinement',
    check: (arr) => arr.length > 0,
    message: 'Array cannot be empty',
  };
}
