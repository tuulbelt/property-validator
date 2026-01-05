/**
 * Nested Array Tests (Phase 4)
 *
 * Tests for nested array structures:
 * - 2D arrays (matrices)
 * - Arrays of tuples
 * - Deep nesting (4+ levels)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { v } from '../src/v.js';
import { validate } from '../src/index.js';

// ============================================================================
// 2D Arrays (Matrices) - 8 tests
// ============================================================================

test('matrices: basic 2D arrays', async (t) => {
  await t.test('validates 2×2 number matrix', () => {
    const result = validate(
      v.array(v.array(v.number())),
      [[1, 2], [3, 4]]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates 3×3 string matrix', () => {
    const result = validate(
      v.array(v.array(v.string())),
      [
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
        ['g', 'h', 'i'],
      ]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates jagged array (variable row lengths)', () => {
    const result = validate(
      v.array(v.array(v.number())),
      [[1, 2], [3, 4, 5], [6]]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates empty matrix', () => {
    const result = validate(v.array(v.array(v.number())), []);
    assert.strictEqual(result.ok, true);
  });
});

test('matrices: error handling', async (t) => {
  await t.test('reports error in first row', () => {
    const result = validate(
      v.array(v.array(v.number())),
      [['not a number', 2], [3, 4]]
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid item at index 0/);
      assert.match(result.error, /Invalid item at index 0/);
    }
  });

  await t.test('reports error in second row', () => {
    const result = validate(
      v.array(v.array(v.number())),
      [[1, 2], [3, 'not a number']]
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid item at index 1/);
    }
  });

  await t.test('rejects non-array element', () => {
    const result = validate(
      v.array(v.array(v.number())),
      [[1, 2], 'not an array']
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid item at index 1/);
      assert.match(result.error, /Expected array/);
    }
  });

  await t.test('validates large matrix (100×100)', () => {
    const matrix = Array.from({ length: 100 }, (_, i) =>
      Array.from({ length: 100 }, (_, j) => i * 100 + j)
    );
    const result = validate(v.array(v.array(v.number())), matrix);
    assert.strictEqual(result.ok, true);
  });
});

// ============================================================================
// Arrays of Tuples - 5 tests
// ============================================================================

test('arrays of tuples', async (t) => {
  await t.test('validates array of coordinate tuples', () => {
    const result = validate(
      v.array(v.tuple([v.number(), v.number()])),
      [
        [0, 0],
        [1, 2],
        [3, 4],
      ]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates array of mixed-type tuples', () => {
    const result = validate(
      v.array(v.tuple([v.string(), v.number(), v.boolean()])),
      [
        ['Alice', 30, true],
        ['Bob', 25, false],
        ['Charlie', 35, true],
      ]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects invalid tuple in array', () => {
    const result = validate(
      v.array(v.tuple([v.string(), v.number()])),
      [
        ['Alice', 30],
        ['Bob', 'not a number'], // Invalid
        ['Charlie', 35],
      ]
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid item at index 1/);
      assert.match(result.error, /Invalid element at index 1/);
    }
  });

  await t.test('rejects wrong-length tuple in array', () => {
    const result = validate(
      v.array(v.tuple([v.string(), v.number()])),
      [
        ['Alice', 30],
        ['Bob', 25, 'extra'], // Too long
      ]
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid item at index 1/);
      assert.match(result.error, /must have exactly 2 element/);
    }
  });

  await t.test('validates empty array of tuples', () => {
    const result = validate(
      v.array(v.tuple([v.string(), v.number()])),
      []
    );
    assert.strictEqual(result.ok, true);
  });
});

// ============================================================================
// Deep Nesting (4+ levels) - 4 tests
// ============================================================================

test('deep nesting: 4+ levels', async (t) => {
  await t.test('validates 4-level deep array nesting', () => {
    const result = validate(
      v.array(v.array(v.array(v.array(v.number())))),
      [[[[1, 2], [3, 4]], [[5, 6], [7, 8]]]]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates 5-level deep array nesting', () => {
    const result = validate(
      v.array(v.array(v.array(v.array(v.array(v.string()))))),
      [[[[[' a', 'b']]]], [[[[' c', 'd']]]]]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('reports error at 4th level', () => {
    const result = validate(
      v.array(v.array(v.array(v.array(v.number())))),
      [[[[1, 2], [3, 'invalid']], [[5, 6], [7, 8]]]]
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      // Error should mention multiple indices
      assert.match(result.error, /Invalid item at index/);
    }
  });

  await t.test('validates mixed deep nesting (arrays, objects, tuples)', () => {
    const result = validate(
      v.array(
        v.object({
          coords: v.array(v.tuple([v.number(), v.number()])),
          metadata: v.object({ name: v.string() }),
        })
      ),
      [
        {
          coords: [[0, 0], [1, 1]],
          metadata: { name: 'Point A' },
        },
        {
          coords: [[2, 2], [3, 3]],
          metadata: { name: 'Point B' },
        },
      ]
    );
    assert.strictEqual(result.ok, true);
  });
});

// ============================================================================
// Additional Nested Array Edge Cases - 8 tests
// ============================================================================

test('nested arrays: edge cases', async (t) => {
  await t.test('validates nested arrays with length constraints', () => {
    const result = validate(
      v.array(v.array(v.number()).min(2).max(3)),
      [[1, 2], [3, 4, 5], [6, 7]]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects nested array violating inner length constraint', () => {
    const result = validate(
      v.array(v.array(v.number()).min(2)),
      [[1, 2], [3]] // Second array too short
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid item at index 1/);
      assert.match(result.error, /must have at least 2 element/);
    }
  });

  await t.test('validates array of arrays with nonempty constraint', () => {
    const result = validate(
      v.array(v.array(v.string()).nonempty()),
      [['a'], ['b', 'c'], ['d', 'e', 'f']]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects array containing empty array when nonempty required', () => {
    const result = validate(
      v.array(v.array(v.string()).nonempty()),
      [['a'], [], ['c']]
    );
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid item at index 1/);
      assert.match(result.error, /must have at least 1 element/);
    }
  });

  await t.test('validates nested optional arrays', () => {
    const result = validate(
      v.array(v.optional(v.array(v.number()))),
      [[1, 2], undefined, [3, 4]]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates nested nullable arrays', () => {
    const result = validate(
      v.array(v.nullable(v.array(v.number()))),
      [[1, 2], null, [3, 4]]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates array of tuples with nested arrays', () => {
    const result = validate(
      v.array(v.tuple([v.string(), v.array(v.number())])),
      [
        ['tag1', [1, 2, 3]],
        ['tag2', [4, 5]],
        ['tag3', []],
      ]
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates array of arrays of tuples', () => {
    const result = validate(
      v.array(v.array(v.tuple([v.number(), v.number()]))),
      [
        [[0, 0], [1, 1]],
        [[2, 2], [3, 3], [4, 4]],
      ]
    );
    assert.strictEqual(result.ok, true);
  });
});
