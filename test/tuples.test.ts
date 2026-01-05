/**
 * Tuple Validator Tests
 *
 * Comprehensive tests for v.tuple() with fixed-length and per-index validation
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { v } from '../src/v.js';
import { validate } from '../src/index.js';

// ============================================================================
// Phase 3: Tuple Validator (30 tests)
// ============================================================================

test('tuple: basic tuples', async (t) => {
  await t.test('validates empty tuple', () => {
    const result = validate(v.tuple([]), []);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.deepStrictEqual(result.value, []);
    }
  });

  await t.test('validates single-element tuple', () => {
    const result = validate(v.tuple([v.string()]), ['hello']);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.deepStrictEqual(result.value, ['hello']);
    }
  });

  await t.test('validates two-element tuple', () => {
    const result = validate(v.tuple([v.string(), v.number()]), ['hello', 42]);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.deepStrictEqual(result.value, ['hello', 42]);
    }
  });

  await t.test('validates three-element tuple', () => {
    const result = validate(
      v.tuple([v.string(), v.number(), v.boolean()]),
      ['hello', 42, true]
    );
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.deepStrictEqual(result.value, ['hello', 42, true]);
    }
  });

  await t.test('validates five-element tuple', () => {
    const result = validate(
      v.tuple([v.string(), v.number(), v.boolean(), v.string(), v.number()]),
      ['a', 1, true, 'b', 2]
    );
    assert.strictEqual(result.ok, true);
  });
});

test('tuple: type enforcement', async (t) => {
  await t.test('validates correct types at each index', () => {
    const result = validate(
      v.tuple([v.string(), v.number(), v.boolean()]),
      ['test', 123, false]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects wrong type at index 0', () => {
    const result = validate(
      v.tuple([v.string(), v.number(), v.boolean()]),
      [123, 456, true]
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid element at index 0/);
      assert.match(result.error, /Expected string/);
    }
  });

  await t.test('rejects wrong type at index 1', () => {
    const result = validate(
      v.tuple([v.string(), v.number(), v.boolean()]),
      ['test', 'not a number', true]
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid element at index 1/);
      assert.match(result.error, /Expected number/);
    }
  });

  await t.test('rejects wrong type at last index', () => {
    const result = validate(
      v.tuple([v.string(), v.number(), v.boolean()]),
      ['test', 123, 'not a boolean']
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid element at index 2/);
      assert.match(result.error, /Expected boolean/);
    }
  });

  await t.test('validates mixed primitive types', () => {
    const result = validate(
      v.tuple([v.boolean(), v.string(), v.number()]),
      [true, 'hello', 42]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates complex types (object, array)', () => {
    const result = validate(
      v.tuple([v.object({ name: v.string() }), v.array(v.number())]),
      [{ name: 'Alice' }, [1, 2, 3]]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects null at specific index', () => {
    const result = validate(
      v.tuple([v.string(), v.number()]),
      ['hello', null]
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid element at index 1/);
    }
  });

  await t.test('rejects undefined at specific index', () => {
    const result = validate(
      v.tuple([v.string(), v.number()]),
      ['hello', undefined]
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid element at index 1/);
    }
  });
});

test('tuple: length validation', async (t) => {
  await t.test('rejects array too short', () => {
    const result = validate(
      v.tuple([v.string(), v.number(), v.boolean()]),
      ['hello', 42]
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /must have exactly 3 element/);
      assert.match(result.error, /got 2/);
    }
  });

  await t.test('rejects array too long', () => {
    const result = validate(
      v.tuple([v.string(), v.number()]),
      ['hello', 42, true, 'extra']
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /must have exactly 2 element/);
      assert.match(result.error, /got 4/);
    }
  });

  await t.test('requires exact length', () => {
    const result = validate(
      v.tuple([v.string()]),
      ['hello', 'extra']
    );
    assert.strictEqual(result.ok, false);
  });

  await t.test('empty array matches empty tuple', () => {
    const result = validate(v.tuple([]), []);
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects non-empty array for empty tuple', () => {
    const result = validate(v.tuple([]), ['not', 'empty']);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /must have exactly 0 element/);
    }
  });
});

test('tuple: error messages', async (t) => {
  await t.test('provides clear error for non-array', () => {
    const result = validate(v.tuple([v.string()]), 'not an array');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Expected tuple \(array\)/);
    }
  });

  await t.test('shows exact length required', () => {
    const result = validate(
      v.tuple([v.string(), v.number(), v.boolean()]),
      ['a', 1]
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /must have exactly 3 element/);
    }
  });

  await t.test('shows index of invalid element', () => {
    const result = validate(
      v.tuple([v.string(), v.number()]),
      ['hello', 'not a number']
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid element at index 1/);
    }
  });

  await t.test('shows nested error message', () => {
    const result = validate(
      v.tuple([v.object({ name: v.string() })]),
      [{ name: 123 }]
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid element at index 0/);
      assert.match(result.error, /Invalid property 'name'/);
    }
  });
});

test('tuple: nested tuples', async (t) => {
  await t.test('validates tuple of tuples', () => {
    const result = validate(
      v.tuple([
        v.tuple([v.string(), v.number()]),
        v.tuple([v.boolean(), v.string()]),
      ]),
      [
        ['hello', 42],
        [true, 'world'],
      ]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates tuple containing array', () => {
    const result = validate(
      v.tuple([v.string(), v.array(v.number())]),
      ['tags', [1, 2, 3, 4]]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates tuple containing object', () => {
    const result = validate(
      v.tuple([
        v.number(),
        v.object({ name: v.string(), age: v.number() }),
      ]),
      [1, { name: 'Alice', age: 30 }]
    );
    assert.strictEqual(result.ok, true);
  });
});

test('tuple: edge cases', async (t) => {
  await t.test('validates tuple with optional validators', () => {
    const result = validate(
      v.tuple([v.string(), v.optional(v.number())]),
      ['hello', undefined]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates tuple with nullable validators', () => {
    const result = validate(
      v.tuple([v.string(), v.nullable(v.number())]),
      ['hello', null]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates large tuple (10 elements)', () => {
    const result = validate(
      v.tuple([
        v.string(),
        v.number(),
        v.boolean(),
        v.string(),
        v.number(),
        v.boolean(),
        v.string(),
        v.number(),
        v.boolean(),
        v.string(),
      ]),
      ['a', 1, true, 'b', 2, false, 'c', 3, true, 'd']
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects sparse array', () => {
    const sparse = ['a', , 'c']; // Sparse array with hole at index 1
    const result = validate(v.tuple([v.string(), v.string(), v.string()]), sparse);
    // Sparse arrays have undefined at holes
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects array-like object', () => {
    const arrayLike = { 0: 'a', 1: 'b', length: 2 };
    const result = validate(v.tuple([v.string(), v.string()]), arrayLike);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Expected tuple \(array\)/);
    }
  });
});
