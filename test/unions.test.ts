/**
 * Union Validator Tests
 * Comprehensive test coverage for v.union() validator
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { v } from '../src/index.js';
import { validate } from '../src/index.ts';

// Valid unions - primitive types (10 tests)
test('union: valid primitive unions', async (t) => {
  await t.test('validates string in string|number union', () => {
    const result = validate(v.union([v.string(), v.number()]), 'hello');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'hello');
    }
  });

  await t.test('validates number in string|number union', () => {
    const result = validate(v.union([v.string(), v.number()]), 42);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 42);
    }
  });

  await t.test('validates boolean in string|boolean union', () => {
    const result = validate(v.union([v.string(), v.boolean()]), true);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, true);
    }
  });

  await t.test('validates first matching type in union', () => {
    const result = validate(v.union([v.number(), v.string()]), 123);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 123);
    }
  });

  await t.test('validates second type when first fails', () => {
    const result = validate(v.union([v.number(), v.string()]), 'test');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'test');
    }
  });

  await t.test('validates third type in three-way union', () => {
    const result = validate(
      v.union([v.number(), v.string(), v.boolean()]),
      false
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates zero in number|string union', () => {
    const result = validate(v.union([v.number(), v.string()]), 0);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 0);
    }
  });

  await t.test('validates empty string in number|string union', () => {
    const result = validate(v.union([v.number(), v.string()]), '');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, '');
    }
  });

  await t.test('validates negative number in union', () => {
    const result = validate(v.union([v.number(), v.string()]), -42);
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates large union (5 types)', () => {
    const result = validate(
      v.union([
        v.string(),
        v.number(),
        v.boolean(),
        v.array(v.string()),
        v.object({ name: v.string() }),
      ]),
      ['a', 'b', 'c']
    );
    assert.strictEqual(result.ok, true);
  });
});

// Valid unions - complex types (10 tests)
test('union: valid complex unions', async (t) => {
  await t.test('validates array in array|object union', () => {
    const result = validate(
      v.union([v.array(v.string()), v.object({ name: v.string() })]),
      ['hello', 'world']
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates object in array|object union', () => {
    const result = validate(
      v.union([v.array(v.string()), v.object({ name: v.string() })]),
      { name: 'Alice' }
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates nested union (union of unions)', () => {
    const stringOrNumber = v.union([v.string(), v.number()]);
    const result = validate(
      v.union([stringOrNumber, v.boolean()]),
      'test'
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates array of different types in union', () => {
    const result = validate(
      v.union([v.array(v.number()), v.array(v.string())]),
      [1, 2, 3]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates object with different shapes', () => {
    const result = validate(
      v.union([
        v.object({ id: v.number() }),
        v.object({ uuid: v.string() }),
      ]),
      { id: 123 }
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates tuple in union', () => {
    const result = validate(
      v.union([v.tuple([v.number(), v.number()]), v.string()]),
      [10, 20]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates empty array in union', () => {
    const result = validate(
      v.union([v.array(v.number()), v.string()]),
      []
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates empty object in union', () => {
    const result = validate(
      v.union([v.object({}), v.string()]),
      {}
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates optional fields in union objects', () => {
    const result = validate(
      v.union([
        v.object({ name: v.string(), age: v.optional(v.number()) }),
        v.string(),
      ]),
      { name: 'Alice' }
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates nullable fields in union objects', () => {
    const result = validate(
      v.union([
        v.object({ name: v.string(), email: v.nullable(v.string()) }),
        v.number(),
      ]),
      { name: 'Bob', email: null }
    );
    assert.strictEqual(result.ok, true);
  });
});

// Invalid unions - all schemas fail (10 tests)
test('union: invalid unions (all fail)', async (t) => {
  await t.test('rejects value not matching any schema', () => {
    const result = validate(v.union([v.string(), v.number()]), true);
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects null when not in union', () => {
    const result = validate(v.union([v.string(), v.number()]), null);
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects undefined when not in union', () => {
    const result = validate(v.union([v.string(), v.number()]), undefined);
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects object when union expects primitives', () => {
    const result = validate(
      v.union([v.string(), v.number(), v.boolean()]),
      { key: 'value' }
    );
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects array when union expects primitives', () => {
    const result = validate(
      v.union([v.string(), v.number()]),
      [1, 2, 3]
    );
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects wrong object shape', () => {
    const result = validate(
      v.union([
        v.object({ id: v.number() }),
        v.object({ uuid: v.string() }),
      ]),
      { name: 'Alice' }
    );
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects array with wrong element type', () => {
    const result = validate(
      v.union([v.array(v.number()), v.array(v.string())]),
      [1, 'two', 3]
    );
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects tuple with wrong length', () => {
    const result = validate(
      v.union([v.tuple([v.number(), v.number()]), v.string()]),
      [10, 20, 30]
    );
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects when all nested unions fail', () => {
    const result = validate(
      v.union([
        v.union([v.string(), v.number()]),
        v.union([v.boolean(), v.array(v.string())]),
      ]),
      { invalid: 'object' }
    );
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects NaN in number|string union', () => {
    const result = validate(v.union([v.number(), v.string()]), NaN);
    assert.strictEqual(result.ok, false);
  });
});

// Error aggregation (5 tests)
test('union: error aggregation', async (t) => {
  await t.test('provides clear error for simple union failure', () => {
    const result = validate(v.union([v.string(), v.number()]), true);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.includes('Expected one of'));
      assert(result.error.includes('string'));
      assert(result.error.includes('number'));
    }
  });

  await t.test('aggregates errors from multiple validators', () => {
    const result = validate(
      v.union([v.string(), v.number(), v.boolean()]),
      null
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.includes('Expected one of'));
    }
  });

  await t.test('shows single error for single-option union', () => {
    const result = validate(v.union([v.string()]), 123);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      // Single-option union shows direct error, not "Expected one of"
      assert(result.error.includes('Expected string'));
    }
  });

  await t.test('provides detailed error for complex union failure', () => {
    const result = validate(
      v.union([
        v.object({ name: v.string() }),
        v.array(v.number()),
      ]),
      'invalid'
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.includes('Expected one of'));
    }
  });

  await t.test('error includes information about each failed validator', () => {
    const result = validate(
      v.union([
        v.string(),
        v.number(),
        v.object({ id: v.number() }),
      ]),
      { id: 'not-a-number' }
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.length > 20); // Detailed error message
    }
  });
});
