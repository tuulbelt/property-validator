/**
 * Property Validator - Lazy Validator
 */

import type { PathSegment, Result, ValidationOptions, Validator } from '../types.js';
import { createValidator, validateWithPath } from '../internal/core.js';

/**
 * Lazy validator - standalone implementation for tree-shaking
 *
 * Defers validator creation for recursive schemas. The validator function
 * is only called once on first use, then cached.
 *
 * @example
 * ```typescript
 * // Recursive type: a node that can contain other nodes
 * interface TreeNode {
 *   value: string;
 *   children?: TreeNode[];
 * }
 *
 * const TreeNode: Validator<TreeNode> = object({
 *   value: string(),
 *   children: optional(array(lazy(() => TreeNode)))
 * });
 *
 * validate(TreeNode, {
 *   value: 'root',
 *   children: [
 *     { value: 'child1' },
 *     { value: 'child2', children: [{ value: 'grandchild' }] }
 *   ]
 * });
 * ```
 */
export function lazy<T>(fn: () => Validator<T>): Validator<T> {
  // Cache the validator once it's created
  let cachedValidator: Validator<T> | null = null;

  const getValidator = (): Validator<T> => {
    if (cachedValidator === null) {
      cachedValidator = fn();
    }
    return cachedValidator;
  };

  const lazyValidator = createValidator(
    (data): data is T => {
      const validator = getValidator();
      return validator.validate(data);
    },
    (data) => {
      const validator = getValidator();
      return validator.error(data);
    }
  );

  // Delegate path-aware validation to the wrapped validator
  lazyValidator._validateWithPath = (data: unknown, path: readonly PathSegment[] | PathSegment[], seen: WeakSet<object>, depth: number, options: ValidationOptions): Result<T> => {
    const validator = getValidator();
    return validateWithPath(validator, data, path, seen, depth, options);
  };

  return lazyValidator;
}
