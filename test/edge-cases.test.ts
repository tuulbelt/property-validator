import { test } from 'node:test';
import assert from 'node:assert/strict';
import { v } from '../src/v.js';
import { validate } from '../src/index.js';

test('edge cases - string validator', async (t) => {
  await t.test('accepts empty string', () => {
    const result = validate(v.string(), '');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, '');
    }
  });

  await t.test('accepts string with whitespace', () => {
    const result = validate(v.string(), '   ');
    assert.strictEqual(result.ok, true);
  });

  await t.test('accepts string with special characters', () => {
    const result = validate(v.string(), 'Hello\nWorld\t!');
    assert.strictEqual(result.ok, true);
  });

  await t.test('accepts unicode string', () => {
    const result = validate(v.string(), '你好世界🌍');
    assert.strictEqual(result.ok, true);
  });
});

test('edge cases - number validator', async (t) => {
  await t.test('accepts zero', () => {
    const result = validate(v.number(), 0);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 0);
    }
  });

  await t.test('accepts negative zero', () => {
    const result = validate(v.number(), -0);
    assert.strictEqual(result.ok, true);
  });

  await t.test('accepts negative numbers', () => {
    const result = validate(v.number(), -42);
    assert.strictEqual(result.ok, true);
  });

  await t.test('accepts decimals', () => {
    const result = validate(v.number(), 3.14159);
    assert.strictEqual(result.ok, true);
  });

  await t.test('accepts Infinity', () => {
    const result = validate(v.number(), Infinity);
    assert.strictEqual(result.ok, true);
  });

  await t.test('accepts negative Infinity', () => {
    const result = validate(v.number(), -Infinity);
    assert.strictEqual(result.ok, true);
  });

  await t.test('accepts very large numbers', () => {
    const result = validate(v.number(), Number.MAX_SAFE_INTEGER);
    assert.strictEqual(result.ok, true);
  });

  await t.test('accepts very small numbers', () => {
    const result = validate(v.number(), Number.MIN_SAFE_INTEGER);
    assert.strictEqual(result.ok, true);
  });
});

test('edge cases - array validator', async (t) => {
  await t.test('accepts empty array', () => {
    const result = validate(v.array(v.string()), []);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.deepStrictEqual(result.value, []);
    }
  });

  await t.test('accepts single-item array', () => {
    const result = validate(v.array(v.number()), [42]);
    assert.strictEqual(result.ok, true);
  });

  await t.test('accepts large array', () => {
    const largeArray = Array.from({ length: 1000 }, (_, i) => i);
    const result = validate(v.array(v.number()), largeArray);
    assert.strictEqual(result.ok, true);
  });
});

test('edge cases - object validator', async (t) => {
  await t.test('accepts object with extra properties', () => {
    const validator = v.object({
      name: v.string(),
    });

    const result = validate(validator, {
      name: 'Alice',
      age: 30,
      email: 'alice@example.com',
    });

    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value.name, 'Alice');
      // Extra properties are preserved
      assert.strictEqual((result.value as any).age, 30);
    }
  });

  await t.test('accepts empty object when no properties required', () => {
    const validator = v.object({});
    const result = validate(validator, {});
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects object with missing required property', () => {
    const validator = v.object({
      name: v.string(),
      age: v.number(),
    });

    const result = validate(validator, { name: 'Alice' });
    assert.strictEqual(result.ok, false);
  });
});

test('edge cases - optional validator', async (t) => {
  await t.test('accepts missing property in object', () => {
    const validator = v.object({
      name: v.string(),
      age: v.optional(v.number()),
    });

    const result = validate(validator, { name: 'Alice' });
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects null for optional field', () => {
    const validator = v.optional(v.string());
    const result = validate(validator, null);
    assert.strictEqual(result.ok, false);
  });
});

test('edge cases - nullable validator', async (t) => {
  await t.test('rejects undefined for nullable field', () => {
    const validator = v.nullable(v.string());
    const result = validate(validator, undefined);
    assert.strictEqual(result.ok, false);
  });

  await t.test('accepts null in object property', () => {
    const validator = v.object({
      name: v.string(),
      email: v.nullable(v.string()),
    });

    const result = validate(validator, { name: 'Alice', email: null });
    assert.strictEqual(result.ok, true);
  });
});

test('edge cases - complex combinations', async (t) => {
  await t.test('optional nullable field accepts both undefined and null', () => {
    const validator = v.object({
      name: v.string(),
      email: v.optional(v.nullable(v.string())),
    });

    const result1 = validate(validator, { name: 'Alice', email: undefined });
    assert.strictEqual(result1.ok, true);

    const result2 = validate(validator, { name: 'Alice', email: null });
    assert.strictEqual(result2.ok, true);

    const result3 = validate(validator, { name: 'Alice' });
    assert.strictEqual(result3.ok, true);
  });

  await t.test('nullable array accepts null', () => {
    const validator = v.nullable(v.array(v.number()));
    const result = validate(validator, null);
    assert.strictEqual(result.ok, true);
  });

  await t.test('array of optional items', () => {
    const validator = v.array(v.optional(v.string()));
    const result = validate(validator, ['hello', undefined, 'world']);
    assert.strictEqual(result.ok, true);
  });

  await t.test('array of nullable items', () => {
    const validator = v.array(v.nullable(v.number()));
    const result = validate(validator, [1, null, 3]);
    assert.strictEqual(result.ok, true);
  });
});

// ============================================================================
// Phase 6: Special JavaScript Values (20 tests)
// ============================================================================

test('edge cases - Symbol values', async (t) => {
  await t.test('rejects Symbol for string validator', () => {
    const sym = Symbol('test');
    const result = validate(v.string(), sym);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /string/i);
    }
  });

  await t.test('rejects Symbol for number validator', () => {
    const sym = Symbol('test');
    const result = validate(v.number(), sym);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /number/i);
    }
  });

  await t.test('rejects Symbol for boolean validator', () => {
    const sym = Symbol('test');
    const result = validate(v.boolean(), sym);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /boolean/i);
    }
  });

  await t.test('rejects Symbol in object properties', () => {
    const validator = v.object({
      name: v.string(),
    });
    const sym = Symbol('name');
    const result = validate(validator, { name: sym });
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /string/i);
    }
  });
});

test('edge cases - NaN values', async (t) => {
  await t.test('rejects NaN for number validator', () => {
    const result = validate(v.number(), NaN);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /number/i);
    }
  });

  await t.test('rejects NaN in array of numbers', () => {
    const result = validate(v.array(v.number()), [1, NaN, 3]);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid item/i);
    }
  });

  await t.test('rejects NaN in object number property', () => {
    const validator = v.object({
      age: v.number(),
    });
    const result = validate(validator, { age: NaN });
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /number/i);
    }
  });

  await t.test('base validator rejects NaN before refinement', () => {
    const NonNaNNumber = v.number().refine(
      n => !Number.isNaN(n),
      'Must not be NaN'
    );
    const result1 = validate(NonNaNNumber, 42);
    assert.strictEqual(result1.ok, true);

    const result2 = validate(NonNaNNumber, NaN);
    assert.strictEqual(result2.ok, false);
    if (!result2.ok) {
      // Base validator rejects NaN before refinement runs
      assert.match(result2.error, /number/i);
    }
  });
});

test('edge cases - Infinity and -Infinity', async (t) => {
  await t.test('number validator accepts Infinity by default', () => {
    const result = validate(v.number(), Infinity);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, Infinity);
    }
  });

  await t.test('refinement can reject Infinity', () => {
    const FiniteNumber = v.number().refine(
      n => Number.isFinite(n),
      'Must be finite'
    );
    const result1 = validate(FiniteNumber, 42);
    assert.strictEqual(result1.ok, true);

    const result2 = validate(FiniteNumber, Infinity);
    assert.strictEqual(result2.ok, false);
    if (!result2.ok) {
      assert.match(result2.error, /finite/i);
    }
  });

  await t.test('array can contain Infinity values', () => {
    const result = validate(v.array(v.number()), [1, Infinity, -Infinity, 2]);
    assert.strictEqual(result.ok, true);
  });

  await t.test('object properties can be Infinity', () => {
    const validator = v.object({
      max: v.number(),
      min: v.number(),
    });
    const result = validate(validator, { max: Infinity, min: -Infinity });
    assert.strictEqual(result.ok, true);
  });
});

test('edge cases - BigInt values', async (t) => {
  await t.test('rejects BigInt for number validator', () => {
    const result = validate(v.number(), 42n);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /number/i);
    }
  });

  await t.test('rejects BigInt for string validator', () => {
    const result = validate(v.string(), 42n);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /string/i);
    }
  });

  await t.test('rejects BigInt in array', () => {
    const result = validate(v.array(v.number()), [1, 2n, 3]);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /number/i);
    }
  });

  await t.test('rejects BigInt in object property', () => {
    const validator = v.object({
      count: v.number(),
    });
    const result = validate(validator, { count: 100n });
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /number/i);
    }
  });
});

test('edge cases - Functions and special types', async (t) => {
  await t.test('rejects function for string validator', () => {
    const fn = () => 'hello';
    const result = validate(v.string(), fn);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /string/i);
    }
  });

  await t.test('rejects function for object validator', () => {
    const validator = v.object({
      name: v.string(),
    });
    const fn = () => ({ name: 'test' });
    const result = validate(validator, fn);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /object/i);
    }
  });

  await t.test('handles sparse arrays correctly', () => {
    // Create sparse array: [1, <empty>, 3]
    const sparse = [1, , 3];
    const result = validate(v.array(v.number()), sparse);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      // Validator skips holes during validation and returns array as-is
      assert.strictEqual(result.value.length, 3);
      assert.strictEqual(result.value[0], 1);
      assert.strictEqual(result.value[2], 3);
      assert.strictEqual(1 in result.value, false); // Index 1 is a hole
    }
  });

  await t.test('handles Date objects (rejects as non-primitive)', () => {
    const date = new Date();
    const result = validate(v.string(), date);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /string/i);
    }
  });
});
