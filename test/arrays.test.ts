/**
 * Array Validator Tests
 *
 * Comprehensive tests for v.array() with length constraints
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { v } from '../src/index.js';
import { validate } from '../src/index.js';

// ============================================================================
// Phase 1: Core Array Support (40 tests)
// ============================================================================

test('array: basic arrays', async (t) => {
  await t.test('validates empty array', () => {
    const result = validate(v.array(v.string()), []);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.deepStrictEqual(result.value, []);
    }
  });

  await t.test('validates array of strings', () => {
    const result = validate(v.array(v.string()), ['a', 'b', 'c']);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.deepStrictEqual(result.value, ['a', 'b', 'c']);
    }
  });

  await t.test('validates array of numbers', () => {
    const result = validate(v.array(v.number()), [1, 2, 3]);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.deepStrictEqual(result.value, [1, 2, 3]);
    }
  });

  await t.test('validates array of booleans', () => {
    const result = validate(v.array(v.boolean()), [true, false, true]);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.deepStrictEqual(result.value, [true, false, true]);
    }
  });

  await t.test('validates single-element array', () => {
    const result = validate(v.array(v.string()), ['hello']);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.deepStrictEqual(result.value, ['hello']);
    }
  });
});

test('array: invalid inputs', async (t) => {
  await t.test('rejects non-array', () => {
    const result = validate(v.array(v.string()), 'not an array');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Expected array/);
    }
  });

  await t.test('rejects null', () => {
    const result = validate(v.array(v.string()), null);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Expected array/);
    }
  });

  await t.test('rejects undefined', () => {
    const result = validate(v.array(v.string()), undefined);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Expected array/);
    }
  });

  await t.test('rejects object', () => {
    const result = validate(v.array(v.string()), { 0: 'a', 1: 'b' });
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Expected array/);
    }
  });

  await t.test('rejects number', () => {
    const result = validate(v.array(v.string()), 42);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Expected array/);
    }
  });
});

test('array: element validation', async (t) => {
  await t.test('rejects array with wrong element type at index 0', () => {
    const result = validate(v.array(v.string()), [42, 'b', 'c']);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid item at index 0/);
      assert.match(result.error, /Expected string/);
    }
  });

  await t.test('rejects array with wrong element type at index 1', () => {
    const result = validate(v.array(v.string()), ['a', 42, 'c']);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid item at index 1/);
      assert.match(result.error, /Expected string/);
    }
  });

  await t.test('rejects array with wrong element type at last index', () => {
    const result = validate(v.array(v.string()), ['a', 'b', 42]);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid item at index 2/);
      assert.match(result.error, /Expected string/);
    }
  });

  await t.test('rejects array with multiple invalid elements (reports first)', () => {
    const result = validate(v.array(v.string()), [42, true, null]);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid item at index 0/);
    }
  });

  await t.test('rejects array with null element', () => {
    const result = validate(v.array(v.string()), ['a', null, 'c']);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid item at index 1/);
    }
  });

  await t.test('rejects array with undefined element', () => {
    const result = validate(v.array(v.string()), ['a', undefined, 'c']);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid item at index 1/);
    }
  });
});

test('array: arrays of objects', async (t) => {
  const userValidator = v.object({
    name: v.string(),
    age: v.number(),
  });

  await t.test('validates array of objects', () => {
    const result = validate(v.array(userValidator), [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]);
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects array with invalid object at index 0', () => {
    const result = validate(v.array(userValidator), [
      { name: 'Alice', age: 'thirty' }, // age should be number
      { name: 'Bob', age: 25 },
    ]);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid item at index 0/);
      assert.match(result.error, /Invalid property 'age'/);
    }
  });

  await t.test('rejects array with invalid object at index 1', () => {
    const result = validate(v.array(userValidator), [
      { name: 'Alice', age: 30 },
      { name: 123, age: 25 }, // name should be string
    ]);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid item at index 1/);
      assert.match(result.error, /Invalid property 'name'/);
    }
  });

  await t.test('validates empty array of objects', () => {
    const result = validate(v.array(userValidator), []);
    assert.strictEqual(result.ok, true);
  });
});

test('array: large arrays', async (t) => {
  await t.test('validates large array (1000 elements)', () => {
    const largeArray = Array.from({ length: 1000 }, (_, i) => i);
    const result = validate(v.array(v.number()), largeArray);
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects large array with one invalid element', () => {
    const largeArray = Array.from({ length: 1000 }, (_, i) => i);
    largeArray[500] = 'invalid' as any;
    const result = validate(v.array(v.number()), largeArray);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Invalid item at index 500/);
    }
  });

  await t.test('validates large array (10,000 elements)', () => {
    const largeArray = Array.from({ length: 10000 }, (_, i) => i);
    const result = validate(v.array(v.number()), largeArray);
    assert.strictEqual(result.ok, true);
  });
});

test('array: edge cases', async (t) => {
  await t.test('validates array with NaN (when using number validator)', () => {
    const result = validate(v.array(v.number()), [1, 2, NaN, 4]);
    // NaN is not a valid number according to v.number()
    assert.strictEqual(result.ok, false);
  });

  await t.test('validates array-like object (should fail)', () => {
    const arrayLike = { length: 3, 0: 'a', 1: 'b', 2: 'c' };
    const result = validate(v.array(v.string()), arrayLike);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Expected array/);
    }
  });

  await t.test('validates sparse array (holes are skipped)', () => {
    const sparse = [1, , 3]; // sparse array with hole at index 1
    const result = validate(v.array(v.number()), sparse);
    // JavaScript array methods skip holes, so sparse arrays with valid elements pass
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates array with mixed valid types (homogeneous validator)', () => {
    const result = validate(v.array(v.string()), ['a', 'b', 'c', 'd']);
    assert.strictEqual(result.ok, true);
  });
});

// ============================================================================
// Phase 2: Length Constraints (20 tests)
// ============================================================================

test('array.min: minimum length constraint', async (t) => {
  await t.test('validates array meeting minimum length', () => {
    const result = validate(v.array(v.string()).min(2), ['a', 'b']);
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates array exceeding minimum length', () => {
    const result = validate(v.array(v.string()).min(2), ['a', 'b', 'c']);
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects array below minimum length', () => {
    const result = validate(v.array(v.string()).min(3), ['a', 'b']);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /must have at least 3 element/);
      assert.match(result.error, /got 2/);
    }
  });

  await t.test('rejects empty array when minimum is 1', () => {
    const result = validate(v.array(v.string()).min(1), []);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /must have at least 1 element/);
    }
  });

  await t.test('validates empty array when minimum is 0', () => {
    const result = validate(v.array(v.string()).min(0), []);
    assert.strictEqual(result.ok, true);
  });
});

test('array.max: maximum length constraint', async (t) => {
  await t.test('validates array meeting maximum length', () => {
    const result = validate(v.array(v.string()).max(3), ['a', 'b', 'c']);
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates array below maximum length', () => {
    const result = validate(v.array(v.string()).max(3), ['a', 'b']);
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects array exceeding maximum length', () => {
    const result = validate(v.array(v.string()).max(2), ['a', 'b', 'c']);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /must have at most 2 element/);
      assert.match(result.error, /got 3/);
    }
  });

  await t.test('validates empty array when maximum is 0', () => {
    const result = validate(v.array(v.string()).max(0), []);
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects non-empty array when maximum is 0', () => {
    const result = validate(v.array(v.string()).max(0), ['a']);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /must have at most 0 element/);
    }
  });
});

test('array.length: exact length constraint', async (t) => {
  await t.test('validates array with exact length', () => {
    const result = validate(v.array(v.string()).length(3), ['a', 'b', 'c']);
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects array with length too short', () => {
    const result = validate(v.array(v.string()).length(3), ['a', 'b']);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /must have exactly 3 element/);
      assert.match(result.error, /got 2/);
    }
  });

  await t.test('rejects array with length too long', () => {
    const result = validate(v.array(v.string()).length(3), ['a', 'b', 'c', 'd']);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /must have exactly 3 element/);
      assert.match(result.error, /got 4/);
    }
  });

  await t.test('validates empty array with length(0)', () => {
    const result = validate(v.array(v.string()).length(0), []);
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates single-element array with length(1)', () => {
    const result = validate(v.array(v.string()).length(1), ['a']);
    assert.strictEqual(result.ok, true);
  });
});

test('array.nonempty: non-empty constraint', async (t) => {
  await t.test('validates non-empty array', () => {
    const result = validate(v.array(v.string()).nonempty(), ['a']);
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates non-empty array with multiple elements', () => {
    const result = validate(v.array(v.string()).nonempty(), ['a', 'b', 'c']);
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects empty array', () => {
    const result = validate(v.array(v.string()).nonempty(), []);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /must have at least 1 element/);
    }
  });
});

test('array: chaining constraints', async (t) => {
  await t.test('validates array with min and max constraints', () => {
    const result = validate(v.array(v.string()).min(2).max(4), ['a', 'b', 'c']);
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects array below min when chained', () => {
    const result = validate(v.array(v.string()).min(2).max(4), ['a']);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /must have at least 2 element/);
    }
  });

  await t.test('rejects array above max when chained', () => {
    const result = validate(v.array(v.string()).min(2).max(4), ['a', 'b', 'c', 'd', 'e']);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /must have at most 4 element/);
    }
  });
});
