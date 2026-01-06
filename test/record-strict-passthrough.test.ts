/**
 * Tests for v.record(), .strict(), and .passthrough() (v0.11.0)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as v from '../src/index.js';
import { validate } from '../src/index.js';

// ============================================================================
// v.record() Tests
// ============================================================================

describe('v.record() - Record validator', () => {
  test('validates empty object', () => {
    const schema = v.record(v.string(), v.number());
    assert.strictEqual(schema.validate({}), true);
  });

  test('validates simple string-to-number record', () => {
    const schema = v.record(v.string(), v.number());
    assert.strictEqual(schema.validate({ a: 1, b: 2, c: 3 }), true);
  });

  test('rejects invalid value type', () => {
    const schema = v.record(v.string(), v.number());
    assert.strictEqual(schema.validate({ a: 1, b: 'two' }), false);
  });

  test('rejects non-object inputs', () => {
    const schema = v.record(v.string(), v.number());
    assert.strictEqual(schema.validate(null), false);
    assert.strictEqual(schema.validate(undefined), false);
    assert.strictEqual(schema.validate('string'), false);
    assert.strictEqual(schema.validate(123), false);
    assert.strictEqual(schema.validate([]), false);
  });

  test('validates with enum keys using union of literals', () => {
    const StatusEnum = v.union([v.literal('active'), v.literal('inactive'), v.literal('pending')]);
    const schema = v.record(StatusEnum, v.number());
    // Note: record doesn't enforce that all enum values exist, just that present keys are valid
    assert.strictEqual(schema.validate({ active: 1, inactive: 2 }), true);
    assert.strictEqual(schema.validate({ unknown: 1 }), false);
  });

  test('validates nested objects as values', () => {
    const schema = v.record(v.string(), v.object({ name: v.string(), age: v.number() }));
    assert.strictEqual(schema.validate({
      user1: { name: 'Alice', age: 30 },
      user2: { name: 'Bob', age: 25 }
    }), true);
  });

  test('rejects invalid nested objects', () => {
    const schema = v.record(v.string(), v.object({ name: v.string(), age: v.number() }));
    assert.strictEqual(schema.validate({
      user1: { name: 'Alice', age: 30 },
      user2: { name: 'Bob', age: 'twenty-five' } // invalid
    }), false);
  });

  test('validates with array values', () => {
    const schema = v.record(v.string(), v.array(v.number()));
    assert.strictEqual(schema.validate({ nums: [1, 2, 3], more: [4, 5] }), true);
  });

  test('provides correct error message for invalid value', () => {
    const schema = v.record(v.string(), v.number());
    const error = schema.error({ a: 1, b: 'invalid' });
    assert.ok(error.includes("Invalid value for key 'b'"));
  });

  test('provides correct error message for invalid key', () => {
    const StatusEnum = v.union([v.literal('active'), v.literal('inactive')]);
    const schema = v.record(StatusEnum, v.number());
    const error = schema.error({ invalid: 1 });
    assert.ok(error.includes("Invalid key 'invalid'"));
  });

  test('works with validate() function', () => {
    const schema = v.record(v.string(), v.number());
    const result = validate(schema, { a: 1, b: 2 });
    assert.strictEqual(result.ok, true);
  });

  test('provides ValidationError details for invalid data', () => {
    const schema = v.record(v.string(), v.number());
    const result = validate(schema, { a: 1, b: 'invalid' });
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.ok(result.details);
      assert.strictEqual(result.details.code, 'VALIDATION_ERROR');
    }
  });

  test('handles deeply nested record values', () => {
    const schema = v.record(
      v.string(),
      v.record(v.string(), v.number())
    );
    assert.strictEqual(schema.validate({
      level1: { a: 1, b: 2 },
      level2: { c: 3, d: 4 }
    }), true);
  });

  test('record type is set correctly', () => {
    const schema = v.record(v.string(), v.number());
    assert.strictEqual((schema as any)._type, 'record');
  });
});

// ============================================================================
// .strict() Tests
// ============================================================================

describe('.strict() - Strict mode for objects', () => {
  test('allows objects with only known keys', () => {
    const schema = v.object({ name: v.string(), age: v.number() }).strict();
    assert.strictEqual(schema.validate({ name: 'Alice', age: 30 }), true);
  });

  test('rejects objects with unknown keys', () => {
    const schema = v.object({ name: v.string() }).strict();
    assert.strictEqual(schema.validate({ name: 'Alice', extra: true }), false);
  });

  test('provides clear error message for unknown keys', () => {
    const schema = v.object({ name: v.string() }).strict();
    const error = schema.error({ name: 'Alice', extra: true });
    assert.ok(error.includes("Unknown key 'extra' in strict mode"));
  });

  test('validates nested strict objects', () => {
    const schema = v.object({
      user: v.object({ name: v.string() }).strict()
    });
    // Note: outer object is not strict, so extra keys at root level are allowed
    assert.strictEqual(schema.validate({
      user: { name: 'Alice' }
    }), true);
  });

  test('rejects unknown keys in nested strict objects', () => {
    const schema = v.object({
      user: v.object({ name: v.string() }).strict()
    });
    assert.strictEqual(schema.validate({
      user: { name: 'Alice', extra: true }
    }), false);
  });

  test('strict mode is set on the validator', () => {
    const schema = v.object({ name: v.string() }).strict();
    assert.strictEqual((schema as any)._strict, true);
  });

  test('calling .strict() returns new validator', () => {
    const base = v.object({ name: v.string() });
    const strict = base.strict();
    assert.notStrictEqual(base, strict);
    assert.strictEqual((base as any)._strict, false);
    assert.strictEqual((strict as any)._strict, true);
  });

  test('strict mode works with optional fields', () => {
    const schema = v.object({
      name: v.string(),
      age: v.optional(v.number())
    }).strict();
    assert.strictEqual(schema.validate({ name: 'Alice' }), true);
    assert.strictEqual(schema.validate({ name: 'Alice', age: 30 }), true);
    assert.strictEqual(schema.validate({ name: 'Alice', extra: 'nope' }), false);
  });

  test('strict mode works with nullable fields', () => {
    const schema = v.object({
      name: v.string(),
      bio: v.nullable(v.string())
    }).strict();
    assert.strictEqual(schema.validate({ name: 'Alice', bio: null }), true);
    assert.strictEqual(schema.validate({ name: 'Alice', bio: 'Hello' }), true);
    assert.strictEqual(schema.validate({ name: 'Alice', bio: null, extra: 1 }), false);
  });

  test('strict mode provides path-aware errors', () => {
    const schema = v.object({ name: v.string() }).strict();
    const result = validate(schema, { name: 'Alice', extra: true });
    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      assert.deepStrictEqual(result.details.path, ['extra']);
      assert.strictEqual(result.details.code, 'UNKNOWN_KEY');
    }
  });
});

// ============================================================================
// .passthrough() Tests
// ============================================================================

describe('.passthrough() - Passthrough mode for objects', () => {
  test('allows objects with extra keys', () => {
    const schema = v.object({ name: v.string() }).passthrough();
    assert.strictEqual(schema.validate({ name: 'Alice', extra: true }), true);
  });

  test('still validates required fields', () => {
    const schema = v.object({ name: v.string(), age: v.number() }).passthrough();
    assert.strictEqual(schema.validate({ extra: true }), false); // missing required
  });

  test('passthrough mode is set on the validator', () => {
    const schema = v.object({ name: v.string() }).passthrough();
    assert.strictEqual((schema as any)._passthrough, true);
    assert.strictEqual((schema as any)._strict, false);
  });

  test('calling .passthrough() returns new validator', () => {
    const base = v.object({ name: v.string() });
    const passthrough = base.passthrough();
    assert.notStrictEqual(base, passthrough);
    assert.strictEqual((base as any)._passthrough, false);
    assert.strictEqual((passthrough as any)._passthrough, true);
  });

  test('passthrough mode preserves extra properties in result', () => {
    const schema = v.object({ name: v.string() }).passthrough();
    const result = validate(schema, { name: 'Alice', extra: 'preserved' });
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      // Extra properties should pass through
      assert.strictEqual((result.value as any).extra, 'preserved');
    }
  });

  test('passthrough works with nested objects', () => {
    const schema = v.object({
      user: v.object({ name: v.string() }).passthrough()
    }).passthrough();
    assert.strictEqual(schema.validate({
      user: { name: 'Alice', extra: 1 },
      anotherExtra: true
    }), true);
  });

  test('default behavior (neither strict nor passthrough) ignores extra keys', () => {
    const schema = v.object({ name: v.string() });
    // Default is neither strict (allows extra) nor passthrough (doesn't care about preserving)
    assert.strictEqual(schema.validate({ name: 'Alice', extra: true }), true);
  });
});

// ============================================================================
// Method Chaining Tests
// ============================================================================

describe('Method chaining with .strict() and .passthrough()', () => {
  test('.refine() chains after .strict() (correct order)', () => {
    // NOTE: .strict() and .passthrough() must be called BEFORE .refine()
    // because they create new validators that don't preserve refinements
    const schema = v.object({ name: v.string() })
      .strict()
      .refine((obj) => obj.name.length > 0, 'Name cannot be empty');
    assert.strictEqual(schema.validate({ name: 'Alice' }), true);
    assert.strictEqual(schema.validate({ name: '' }), false);
    assert.strictEqual(schema.validate({ name: 'Alice', extra: 1 }), false);
  });

  test('.refine() chains after .passthrough() (correct order)', () => {
    // NOTE: .strict() and .passthrough() must be called BEFORE .refine()
    const schema = v.object({ name: v.string() })
      .passthrough()
      .refine((obj) => obj.name.length > 0, 'Name cannot be empty');
    assert.strictEqual(schema.validate({ name: 'Alice', extra: 1 }), true);
    assert.strictEqual(schema.validate({ name: '', extra: 1 }), false);
  });

  test('.strict() overrides .passthrough()', () => {
    const schema = v.object({ name: v.string() }).passthrough().strict();
    assert.strictEqual((schema as any)._strict, true);
    assert.strictEqual((schema as any)._passthrough, false);
    assert.strictEqual(schema.validate({ name: 'Alice', extra: 1 }), false);
  });

  test('.passthrough() overrides .strict()', () => {
    const schema = v.object({ name: v.string() }).strict().passthrough();
    assert.strictEqual((schema as any)._strict, false);
    assert.strictEqual((schema as any)._passthrough, true);
    assert.strictEqual(schema.validate({ name: 'Alice', extra: 1 }), true);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration: record + strict + passthrough', () => {
  test('record of strict objects', () => {
    const schema = v.record(
      v.string(),
      v.object({ name: v.string() }).strict()
    );
    assert.strictEqual(schema.validate({
      user1: { name: 'Alice' },
      user2: { name: 'Bob' }
    }), true);
    assert.strictEqual(schema.validate({
      user1: { name: 'Alice', extra: true }
    }), false);
  });

  test('strict object containing record', () => {
    const schema = v.object({
      users: v.record(v.string(), v.number())
    }).strict();
    assert.strictEqual(schema.validate({
      users: { alice: 30, bob: 25 }
    }), true);
    assert.strictEqual(schema.validate({
      users: { alice: 30 },
      extra: true
    }), false);
  });

  test('complex nested structure', () => {
    const schema = v.object({
      config: v.record(v.string(), v.object({
        enabled: v.boolean(),
        value: v.optional(v.number())
      }).strict())
    }).passthrough();

    assert.strictEqual(schema.validate({
      config: {
        feature1: { enabled: true, value: 10 },
        feature2: { enabled: false }
      },
      metadata: 'extra allowed at root'
    }), true);

    assert.strictEqual(schema.validate({
      config: {
        feature1: { enabled: true, extra: 'not allowed' }
      }
    }), false);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge cases', () => {
  test('record with empty string key', () => {
    const schema = v.record(v.string(), v.number());
    assert.strictEqual(schema.validate({ '': 1 }), true);
  });

  test('strict object with empty shape', () => {
    const schema = v.object({}).strict();
    assert.strictEqual(schema.validate({}), true);
    assert.strictEqual(schema.validate({ any: 'key' }), false);
  });

  test('passthrough object with empty shape', () => {
    const schema = v.object({}).passthrough();
    assert.strictEqual(schema.validate({}), true);
    assert.strictEqual(schema.validate({ any: 'key' }), true);
  });

  test('record handles prototype properties correctly', () => {
    const schema = v.record(v.string(), v.number());
    const obj = { a: 1 };
    // Should only check own properties, not prototype
    assert.strictEqual(schema.validate(obj), true);
  });

  test('strict mode with numeric-like keys', () => {
    const schema = v.object({ '0': v.string(), '1': v.string() }).strict();
    assert.strictEqual(schema.validate({ '0': 'a', '1': 'b' }), true);
    assert.strictEqual(schema.validate({ '0': 'a', '1': 'b', '2': 'c' }), false);
  });

  test('record with union values', () => {
    const schema = v.record(v.string(), v.union([v.string(), v.number()]));
    assert.strictEqual(schema.validate({ a: 1, b: 'two', c: 3 }), true);
    assert.strictEqual(schema.validate({ a: true }), false);
  });
});
