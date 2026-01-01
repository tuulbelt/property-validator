import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, v } from '../src/index.js';

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
