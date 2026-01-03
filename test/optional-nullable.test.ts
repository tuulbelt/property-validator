/**
 * Optional/Nullable Validator Tests
 * Comprehensive test coverage for optional(), nullable(), and nullish() methods
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { v, validate } from '../src/index.ts';

// Optional validation (8 tests)
test('optional: basic validation', async (t) => {
  await t.test('accepts valid value with chained optional()', () => {
    const OptionalString = v.string().optional();
    const result = validate(OptionalString, 'hello');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'hello');
    }
  });

  await t.test('accepts undefined with chained optional()', () => {
    const OptionalString = v.string().optional();
    const result = validate(OptionalString, undefined);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, undefined);
    }
  });

  await t.test('rejects null with chained optional()', () => {
    const OptionalString = v.string().optional();
    const result = validate(OptionalString, null);
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects wrong type with chained optional()', () => {
    const OptionalString = v.string().optional();
    const result = validate(OptionalString, 123);
    assert.strictEqual(result.ok, false);
  });

  await t.test('works with number validator', () => {
    const OptionalNumber = v.number().optional();
    const result1 = validate(OptionalNumber, 42);
    assert.strictEqual(result1.ok, true);

    const result2 = validate(OptionalNumber, undefined);
    assert.strictEqual(result2.ok, true);
  });

  await t.test('works with array validator', () => {
    const OptionalArray = v.array(v.string()).optional();
    const result1 = validate(OptionalArray, ['a', 'b']);
    assert.strictEqual(result1.ok, true);

    const result2 = validate(OptionalArray, undefined);
    assert.strictEqual(result2.ok, true);
  });

  await t.test('works with object validator', () => {
    const OptionalObject = v.object({ name: v.string() }).optional();
    const result1 = validate(OptionalObject, { name: 'Alice' });
    assert.strictEqual(result1.ok, true);

    const result2 = validate(OptionalObject, undefined);
    assert.strictEqual(result2.ok, true);
  });

  await t.test('combines with refinements', () => {
    const OptionalPositive = v.number().refine(n => n > 0, 'Must be positive').optional();
    const result1 = validate(OptionalPositive, 5);
    assert.strictEqual(result1.ok, true);

    const result2 = validate(OptionalPositive, undefined);
    assert.strictEqual(result2.ok, true);

    const result3 = validate(OptionalPositive, -5);
    assert.strictEqual(result3.ok, false);
  });
});

// Nullable validation (8 tests)
test('nullable: basic validation', async (t) => {
  await t.test('accepts valid value with chained nullable()', () => {
    const NullableString = v.string().nullable();
    const result = validate(NullableString, 'hello');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'hello');
    }
  });

  await t.test('accepts null with chained nullable()', () => {
    const NullableString = v.string().nullable();
    const result = validate(NullableString, null);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, null);
    }
  });

  await t.test('rejects undefined with chained nullable()', () => {
    const NullableString = v.string().nullable();
    const result = validate(NullableString, undefined);
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects wrong type with chained nullable()', () => {
    const NullableString = v.string().nullable();
    const result = validate(NullableString, 123);
    assert.strictEqual(result.ok, false);
  });

  await t.test('works with number validator', () => {
    const NullableNumber = v.number().nullable();
    const result1 = validate(NullableNumber, 42);
    assert.strictEqual(result1.ok, true);

    const result2 = validate(NullableNumber, null);
    assert.strictEqual(result2.ok, true);
  });

  await t.test('works with array validator', () => {
    const NullableArray = v.array(v.string()).nullable();
    const result1 = validate(NullableArray, ['a', 'b']);
    assert.strictEqual(result1.ok, true);

    const result2 = validate(NullableArray, null);
    assert.strictEqual(result2.ok, true);
  });

  await t.test('works with object validator', () => {
    const NullableObject = v.object({ name: v.string() }).nullable();
    const result1 = validate(NullableObject, { name: 'Alice' });
    assert.strictEqual(result1.ok, true);

    const result2 = validate(NullableObject, null);
    assert.strictEqual(result2.ok, true);
  });

  await t.test('combines with refinements', () => {
    const NullablePositive = v.number().refine(n => n > 0, 'Must be positive').nullable();
    const result1 = validate(NullablePositive, 5);
    assert.strictEqual(result1.ok, true);

    const result2 = validate(NullablePositive, null);
    assert.strictEqual(result2.ok, true);

    const result3 = validate(NullablePositive, -5);
    assert.strictEqual(result3.ok, false);
  });
});

// Nullish validation (5 tests)
test('nullish: basic validation', async (t) => {
  await t.test('accepts valid value with chained nullish()', () => {
    const NullishString = v.string().nullish();
    const result = validate(NullishString, 'hello');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'hello');
    }
  });

  await t.test('accepts undefined with chained nullish()', () => {
    const NullishString = v.string().nullish();
    const result = validate(NullishString, undefined);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, undefined);
    }
  });

  await t.test('accepts null with chained nullish()', () => {
    const NullishString = v.string().nullish();
    const result = validate(NullishString, null);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, null);
    }
  });

  await t.test('rejects wrong type with chained nullish()', () => {
    const NullishString = v.string().nullish();
    const result = validate(NullishString, 123);
    assert.strictEqual(result.ok, false);
  });

  await t.test('combines with refinements', () => {
    const NullishPositive = v.number().refine(n => n > 0, 'Must be positive').nullish();
    const result1 = validate(NullishPositive, 5);
    assert.strictEqual(result1.ok, true);

    const result2 = validate(NullishPositive, null);
    assert.strictEqual(result2.ok, true);

    const result3 = validate(NullishPositive, undefined);
    assert.strictEqual(result3.ok, true);

    const result4 = validate(NullishPositive, -5);
    assert.strictEqual(result4.ok, false);
  });
});

// Type inference (4 tests)
test('optional/nullable: type inference', async (t) => {
  await t.test('infers optional type correctly', () => {
    const OptionalString = v.string().optional();
    const result = validate(OptionalString, 'hello');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      // TypeScript should infer result.value as string | undefined
      const _typeCheck: string | undefined = result.value;
      assert.strictEqual(typeof result.value, 'string');
    }
  });

  await t.test('infers nullable type correctly', () => {
    const NullableNumber = v.number().nullable();
    const result = validate(NullableNumber, 42);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      // TypeScript should infer result.value as number | null
      const _typeCheck: number | null = result.value;
      assert.strictEqual(typeof result.value, 'number');
    }
  });

  await t.test('infers nullish type correctly', () => {
    const NullishBoolean = v.boolean().nullish();
    const result = validate(NullishBoolean, true);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      // TypeScript should infer result.value as boolean | undefined | null
      const _typeCheck: boolean | undefined | null = result.value;
      assert.strictEqual(typeof result.value, 'boolean');
    }
  });

  await t.test('infers complex optional type correctly', () => {
    const OptionalUser = v.object({
      name: v.string(),
      age: v.number()
    }).optional();
    const result = validate(OptionalUser, { name: 'Alice', age: 30 });
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      // TypeScript should infer result.value as { name: string; age: number } | undefined
      const _typeCheck: { name: string; age: number } | undefined = result.value;
      assert(result.value !== undefined);
      assert.strictEqual(result.value.name, 'Alice');
    }
  });
});
