#!/usr/bin/env -S npx tsx
/**
 * Property Validator
 *
 * Runtime type validation with TypeScript inference.
 */

import { realpathSync } from 'node:fs';

/**
 * Validation result
 */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/**
 * Validator interface
 */
export interface Validator<T> {
  validate(data: unknown): data is T;
  error(data: unknown): string;
}

/**
 * Array validator with length constraints
 */
export interface ArrayValidator<T> extends Validator<T[]> {
  min(n: number): ArrayValidator<T>;
  max(n: number): ArrayValidator<T>;
  length(n: number): ArrayValidator<T>;
  nonempty(): ArrayValidator<T>;
}

/**
 * Tuple type inference helper
 */
type TupleType<T extends readonly Validator<any>[]> = {
  [K in keyof T]: T[K] extends Validator<infer U> ? U : never;
};

/**
 * Get a clear type name for error messages
 */
function getTypeName(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Number.isNaN(value)) return 'NaN';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Validate data against a validator
 *
 * @param validator - Validator instance
 * @param data - Unknown data to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validate(v.string(), "hello");
 * if (result.ok) {
 *   console.log(result.value); // Type: string
 * }
 * ```
 */
export function validate<T>(validator: Validator<T>, data: unknown): Result<T> {
  if (validator.validate(data)) {
    return { ok: true, value: data };
  }
  return { ok: false, error: validator.error(data) };
}

/**
 * Validator builders
 */
export const v = {
  /**
   * String validator
   */
  string(): Validator<string> {
    return {
      validate(data: unknown): data is string {
        return typeof data === 'string';
      },
      error(data: unknown): string {
        return `Expected string, got ${getTypeName(data)}`;
      },
    };
  },

  /**
   * Number validator
   */
  number(): Validator<number> {
    return {
      validate(data: unknown): data is number {
        return typeof data === 'number' && !Number.isNaN(data);
      },
      error(data: unknown): string {
        return `Expected number, got ${getTypeName(data)}`;
      },
    };
  },

  /**
   * Boolean validator
   */
  boolean(): Validator<boolean> {
    return {
      validate(data: unknown): data is boolean {
        return typeof data === 'boolean';
      },
      error(data: unknown): string {
        return `Expected boolean, got ${getTypeName(data)}`;
      },
    };
  },

  /**
   * Array validator with optional length constraints
   */
  array<T>(itemValidator: Validator<T>): ArrayValidator<T> {
    const createArrayValidator = (
      minLength?: number,
      maxLength?: number,
      exactLength?: number
    ): ArrayValidator<T> => {
      return {
        validate(data: unknown): data is T[] {
          if (!Array.isArray(data)) return false;

          // Check length constraints
          if (minLength !== undefined && data.length < minLength) return false;
          if (maxLength !== undefined && data.length > maxLength) return false;
          if (exactLength !== undefined && data.length !== exactLength) return false;

          // Validate each item
          return data.every((item) => itemValidator.validate(item));
        },

        error(data: unknown): string {
          if (!Array.isArray(data)) {
            return `Expected array, got ${getTypeName(data)}`;
          }

          // Check length constraints first
          if (minLength !== undefined && data.length < minLength) {
            return `Array must have at least ${minLength} element(s), got ${data.length}`;
          }
          if (maxLength !== undefined && data.length > maxLength) {
            return `Array must have at most ${maxLength} element(s), got ${data.length}`;
          }
          if (exactLength !== undefined && data.length !== exactLength) {
            return `Array must have exactly ${exactLength} element(s), got ${data.length}`;
          }

          // Find first invalid item
          const invalidIndex = data.findIndex((item) => !itemValidator.validate(item));
          if (invalidIndex !== -1) {
            return `Invalid item at index ${invalidIndex}: ${itemValidator.error(data[invalidIndex])}`;
          }

          return 'Array validation failed';
        },

        min(n: number): ArrayValidator<T> {
          return createArrayValidator(n, maxLength, exactLength);
        },

        max(n: number): ArrayValidator<T> {
          return createArrayValidator(minLength, n, exactLength);
        },

        length(n: number): ArrayValidator<T> {
          return createArrayValidator(undefined, undefined, n);
        },

        nonempty(): ArrayValidator<T> {
          return createArrayValidator(1, maxLength, exactLength);
        },
      };
    };

    return createArrayValidator();
  },

  /**
   * Tuple validator - fixed-length array with per-index types
   */
  tuple<T extends readonly Validator<any>[]>(
    validators: T
  ): Validator<TupleType<T>> {
    return {
      validate(data: unknown): data is TupleType<T> {
        if (!Array.isArray(data)) return false;

        // Must have exact length
        if (data.length !== validators.length) return false;

        // Validate each element at its index
        return validators.every((validator, index) =>
          validator.validate(data[index])
        );
      },

      error(data: unknown): string {
        if (!Array.isArray(data)) {
          return `Expected tuple (array), got ${getTypeName(data)}`;
        }

        // Check length first
        if (data.length !== validators.length) {
          return `Tuple must have exactly ${validators.length} element(s), got ${data.length}`;
        }

        // Find first invalid element
        const invalidIndex = validators.findIndex(
          (validator, index) => !validator.validate(data[index])
        );

        if (invalidIndex !== -1) {
          const validator = validators[invalidIndex];
          return `Invalid element at index ${invalidIndex}: ${validator!.error(data[invalidIndex])}`;
        }

        return 'Tuple validation failed';
      },
    };
  },

  /**
   * Object validator
   */
  object<T extends Record<string, unknown>>(
    shape: { [K in keyof T]: Validator<T[K]> }
  ): Validator<T> {
    return {
      validate(data: unknown): data is T {
        if (typeof data !== 'object' || data === null) {
          return false;
        }
        const obj = data as Record<string, unknown>;
        return Object.entries(shape).every(([key, validator]) =>
          validator.validate(obj[key])
        );
      },
      error(data: unknown): string {
        if (typeof data !== 'object' || data === null) {
          return `Expected object, got ${getTypeName(data)}`;
        }
        const obj = data as Record<string, unknown>;
        for (const [key, validator] of Object.entries(shape)) {
          if (!validator.validate(obj[key])) {
            return `Invalid property '${key}': ${validator.error(obj[key])}`;
          }
        }
        return 'Unknown validation error';
      },
    };
  },

  /**
   * Optional validator
   */
  optional<T>(validator: Validator<T>): Validator<T | undefined> {
    return {
      validate(data: unknown): data is T | undefined {
        return data === undefined || validator.validate(data);
      },
      error(data: unknown): string {
        return validator.error(data);
      },
    };
  },

  /**
   * Nullable validator
   */
  nullable<T>(validator: Validator<T>): Validator<T | null> {
    return {
      validate(data: unknown): data is T | null {
        return data === null || validator.validate(data);
      },
      error(data: unknown): string {
        return validator.error(data);
      },
    };
  },
};

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): { input: string; verbose: boolean } {
  let input = '';
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: propval [options] <json-data>

Runtime type validation with TypeScript inference.

Options:
  -v, --verbose  Enable verbose output
  -h, --help     Show this help message

Examples:
  propval '{"name":"Alice","age":30}'
  propval --verbose '{"email":"test@example.com"}'`);
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      input = arg;
    }
  }

  return { input, verbose };
}

// CLI entry point - only runs when executed directly
function main(): void {
  const args = globalThis.process?.argv?.slice(2) ?? [];
  const { input, verbose } = parseArgs(args);

  if (!input) {
    console.error('Error: No input provided');
    console.error('Usage: propval [options] <json-data>');
    globalThis.process?.exit(1);
    return;
  }

  try {
    const data = JSON.parse(input);

    // Example: validate a simple object
    const userValidator = v.object({
      name: v.string(),
      age: v.number(),
      email: v.string(),
    });

    const result = validate(userValidator, data);

    if (result.ok) {
      if (verbose) {
        console.error('[INFO] Validation successful');
      }
      console.log(JSON.stringify(result.value, null, 2));
    } else {
      console.error(`Validation error: ${result.error}`);
      globalThis.process?.exit(1);
    }
  } catch (error) {
    console.error(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
    globalThis.process?.exit(1);
  }
}

// Check if this module is being run directly
// Must resolve symlinks for npm link support (argv1 may be symlink path)
const argv1 = globalThis.process?.argv?.[1];
if (argv1) {
  try {
    const realPath = realpathSync(argv1);
    if (import.meta.url === `file://${realPath}`) {
      main();
    }
  } catch {
    // Fallback for non-existent paths
    if (import.meta.url === `file://${argv1}`) {
      main();
    }
  }
}
