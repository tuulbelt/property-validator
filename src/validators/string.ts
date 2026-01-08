/**
 * Property Validator - String Validators
 *
 * Contains both chainable StringValidator and functional string() API.
 */

import type { StringValidator, StringRefinement, Validator } from '../types.js';
import {
  createValidator,
  getTypeName,
  validateString,
} from '../internal/core.js';

import {
  EMAIL_PATTERN,
  URL_PATTERN,
  UUID_PATTERN,
  DATETIME_PATTERN,
  DATE_PATTERN,
  TIME_PATTERN,
  IPV4_PATTERN,
  IPV6_PATTERN,
  CUID_PATTERN,
  CUID2_PATTERN,
  ULID_PATTERN,
  NANOID_PATTERN,
  BASE64_PATTERN,
  HEX_PATTERN,
  JWT_PATTERN,
  FORMAT_LIMITS,
} from '../patterns.js';

// Helper to escape regex special characters for pattern generation
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a StringValidator with chainable constraint methods
 * @internal
 */
export function createStringValidator(
  refinements: Array<{ check: (s: string) => boolean; message: string; jsonSchema?: { type: string; value?: unknown; format?: string } }> = []
): StringValidator {
  // Base validation: typeof + all refinements
  const validateFn = (data: unknown): data is string => {
    if (typeof data !== 'string') return false;
    return refinements.every(r => r.check(data));
  };

  // Error message: first failing refinement or type error
  const errorFn = (data: unknown): string => {
    if (typeof data !== 'string') {
      return `Expected string, got ${getTypeName(data)}`;
    }
    for (const r of refinements) {
      if (!r.check(data)) {
        return r.message;
      }
    }
    return 'String validation failed';
  };

  const validator = createValidator(validateFn, errorFn) as StringValidator;
  validator._type = 'string';

  // Preserve JIT optimization when possible (no refinements)
  if (refinements.length === 0) {
    validator._compiled = validateString;
  } else {
    validator._hasRefinements = true;
    // Expose refinements for JSON Schema introspection
    validator._refinements = refinements as any;
  }

  // Add chainable methods
  validator.min = (length: number): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length >= length,
      message: `String must be at least ${length} character(s)`,
      jsonSchema: { type: 'minLength', value: length }
    }]);
  };

  validator.max = (length: number): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length <= length,
      message: `String must be at most ${length} character(s)`,
      jsonSchema: { type: 'maxLength', value: length }
    }]);
  };

  validator.length = (length: number): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length === length,
      message: `String must be exactly ${length} character(s)`,
      jsonSchema: { type: 'minLength', value: length }
    }, {
      check: () => true,
      message: '',
      jsonSchema: { type: 'maxLength', value: length }
    }]);
  };

  validator.nonempty = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length > 0,
      message: 'String cannot be empty',
      jsonSchema: { type: 'minLength', value: 1 }
    }]);
  };

  validator.email = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length <= FORMAT_LIMITS.EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(s),
      message: 'Must be a valid email address',
      jsonSchema: { type: 'format', format: 'email' }
    }]);
  };

  validator.url = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length <= FORMAT_LIMITS.URL_MAX_LENGTH && URL_PATTERN.test(s),
      message: 'Must be a valid URL',
      jsonSchema: { type: 'format', format: 'uri' }
    }]);
  };

  validator.uuid = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => UUID_PATTERN.test(s),
      message: 'Must be a valid UUID',
      jsonSchema: { type: 'format', format: 'uuid' }
    }]);
  };

  validator.pattern = (regex: RegExp, message?: string): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => regex.test(s),
      message: message ? `Must be a valid ${message}` : `String must match pattern ${regex}`,
      jsonSchema: { type: 'pattern', value: regex.source }
    }]);
  };

  validator.startsWith = (prefix: string): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.startsWith(prefix),
      message: `String must start with "${prefix}"`,
      jsonSchema: { type: 'pattern', value: `^${escapeRegex(prefix)}` }
    }]);
  };

  validator.endsWith = (suffix: string): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.endsWith(suffix),
      message: `String must end with "${suffix}"`,
      jsonSchema: { type: 'pattern', value: `${escapeRegex(suffix)}$` }
    }]);
  };

  validator.includes = (substring: string): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.includes(substring),
      message: `String must contain "${substring}"`,
      jsonSchema: { type: 'pattern', value: escapeRegex(substring) }
    }]);
  };

  validator.datetime = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => DATETIME_PATTERN.test(s),
      message: 'Must be a valid ISO 8601 datetime (YYYY-MM-DDTHH:MM:SS)',
      jsonSchema: { type: 'format', format: 'date-time' }
    }]);
  };

  validator.date = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => DATE_PATTERN.test(s),
      message: 'Must be a valid ISO 8601 date (YYYY-MM-DD)',
      jsonSchema: { type: 'format', format: 'date' }
    }]);
  };

  validator.time = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => TIME_PATTERN.test(s),
      message: 'Must be a valid ISO 8601 time (HH:MM:SS)',
      jsonSchema: { type: 'format', format: 'time' }
    }]);
  };

  validator.ip = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length <= FORMAT_LIMITS.IPV6_MAX_LENGTH && (IPV4_PATTERN.test(s) || IPV6_PATTERN.test(s)),
      message: 'Must be a valid IP address (IPv4 or IPv6)'
    }]);
  };

  validator.ipv4 = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length <= FORMAT_LIMITS.IPV4_MAX_LENGTH && IPV4_PATTERN.test(s),
      message: 'Must be a valid IPv4 address',
      jsonSchema: { type: 'format', format: 'ipv4' }
    }]);
  };

  validator.ipv6 = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length <= FORMAT_LIMITS.IPV6_MAX_LENGTH && IPV6_PATTERN.test(s),
      message: 'Must be a valid IPv6 address',
      jsonSchema: { type: 'format', format: 'ipv6' }
    }]);
  };

  // v0.9.5: ID format validators
  validator.cuid = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length <= FORMAT_LIMITS.CUID_MAX_LENGTH && CUID_PATTERN.test(s),
      message: 'Must be a valid CUID'
    }]);
  };

  validator.cuid2 = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length > 0 && s.length <= FORMAT_LIMITS.CUID2_MAX_LENGTH && CUID2_PATTERN.test(s),
      message: 'Must be a valid CUID2'
    }]);
  };

  validator.ulid = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => ULID_PATTERN.test(s),
      message: 'Must be a valid ULID'
    }]);
  };

  validator.nanoid = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => NANOID_PATTERN.test(s),
      message: 'Must be a valid NanoID'
    }]);
  };

  // v0.9.5: Encoding validators
  validator.base64 = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length === 0 || (s.length <= FORMAT_LIMITS.BASE64_MAX_LENGTH && BASE64_PATTERN.test(s)),
      message: 'Must be a valid Base64 string'
    }]);
  };

  validator.hex = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length > 0 && HEX_PATTERN.test(s),
      message: 'Must be a valid hexadecimal string'
    }]);
  };

  validator.jwt = (): StringValidator => {
    return createStringValidator([...refinements, {
      check: (s) => s.length <= FORMAT_LIMITS.JWT_MAX_LENGTH && JWT_PATTERN.test(s),
      message: 'Must be a valid JWT'
    }]);
  };

  return validator;
}

/**
 * String validator - accepts optional refinements for tree-shaking
 *
 * @example
 * // Without refinements (backwards compatible, has chainable methods)
 * const s = string();
 * const email = string().email();
 *
 * @example
 * // With refinements (tree-shakeable, no chainable methods)
 * import { string, email, minLength } from 'property-validator';
 * const emailSchema = string(email(), minLength(5));
 */
export function string(...refinements: StringRefinement[]): StringValidator | Validator<string> {
  if (refinements.length === 0) {
    // No refinements: return chainable StringValidator (backwards compatible)
    return createStringValidator();
  }

  // With refinements: create optimized validator without chainable methods
  const internalRefinements = refinements.map(r => ({
    check: r.check,
    message: r.message,
  }));

  const validateFn = (data: unknown): data is string => {
    if (typeof data !== 'string') return false;
    return internalRefinements.every(r => r.check(data));
  };

  const errorFn = (data: unknown): string => {
    if (typeof data !== 'string') {
      return `Expected string, got ${data === null ? 'null' : data === undefined ? 'undefined' : typeof data}`;
    }
    for (const r of internalRefinements) {
      if (!r.check(data)) {
        return r.message;
      }
    }
    return 'String validation failed';
  };

  const validator: Validator<string> = {
    validate: validateFn,
    error: errorFn,
    refine(predicate: (value: string) => boolean, message: string): Validator<string> {
      return string(...refinements, {
        _kind: 'string-refinement',
        check: predicate,
        message,
      });
    },
    transform<U>(fn: (value: string) => U): Validator<U> {
      const transformedValidator = createStringValidator().transform(fn);
      return transformedValidator;
    },
    optional(): Validator<string | undefined> {
      return createValidator(
        (data): data is string | undefined => data === undefined || this.validate(data),
        (data) => this.error(data)
      );
    },
    nullable(): Validator<string | null> {
      return createValidator(
        (data): data is string | null => data === null || this.validate(data),
        (data) => this.error(data)
      );
    },
    nullish(): Validator<string | undefined | null> {
      const base = this;
      return {
        validate: (data): data is string | undefined | null =>
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
    default(value: string | (() => string)): Validator<string> {
      const defaultValidator = createStringValidator().default(value);
      return defaultValidator;
    },
  };

  validator._type = 'string';

  if (refinements.length > 0) {
    validator._refinements = refinements;
  }

  if (internalRefinements.length === 0) {
    validator._compiled = (data: unknown) => typeof data === 'string';
  }

  return validator;
}
