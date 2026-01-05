/**
 * Default Values Tests
 * Comprehensive test coverage for .default() method
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { v } from '../src/index.js';
import { validate } from '../src/index.ts';

// Static defaults (8 tests)
test('default: static defaults', async (t) => {
  await t.test('applies default when value is undefined', () => {
    const WithDefault = v.string().default('default-value');
    const result = validate(WithDefault, undefined);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'default-value');
    }
  });

  await t.test('uses provided value when not undefined', () => {
    const WithDefault = v.string().default('default-value');
    const result = validate(WithDefault, 'custom-value');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'custom-value');
    }
  });

  await t.test('works with number defaults', () => {
    const WithDefault = v.number().default(42);
    const result1 = validate(WithDefault, undefined);
    assert.strictEqual(result1.ok, true);
    if (result1.ok) {
      assert.strictEqual(result1.value, 42);
    }

    const result2 = validate(WithDefault, 100);
    assert.strictEqual(result2.ok, true);
    if (result2.ok) {
      assert.strictEqual(result2.value, 100);
    }
  });

  await t.test('works with boolean defaults', () => {
    const WithDefault = v.boolean().default(true);
    const result1 = validate(WithDefault, undefined);
    assert.strictEqual(result1.ok, true);
    if (result1.ok) {
      assert.strictEqual(result1.value, true);
    }

    const result2 = validate(WithDefault, false);
    assert.strictEqual(result2.ok, true);
    if (result2.ok) {
      assert.strictEqual(result2.value, false);
    }
  });

  await t.test('works with array defaults', () => {
    const WithDefault = v.array(v.string()).default(['a', 'b']);
    const result1 = validate(WithDefault, undefined);
    assert.strictEqual(result1.ok, true);
    if (result1.ok) {
      assert.deepEqual(result1.value, ['a', 'b']);
    }

    const result2 = validate(WithDefault, ['x', 'y', 'z']);
    assert.strictEqual(result2.ok, true);
    if (result2.ok) {
      assert.deepEqual(result2.value, ['x', 'y', 'z']);
    }
  });

  await t.test('works with object defaults', () => {
    const WithDefault = v.object({ name: v.string() }).default({ name: 'John' });
    const result1 = validate(WithDefault, undefined);
    assert.strictEqual(result1.ok, true);
    if (result1.ok) {
      assert.deepEqual(result1.value, { name: 'John' });
    }

    const result2 = validate(WithDefault, { name: 'Alice' });
    assert.strictEqual(result2.ok, true);
    if (result2.ok) {
      assert.deepEqual(result2.value, { name: 'Alice' });
    }
  });

  await t.test('default value can be empty string', () => {
    const WithDefault = v.string().default('');
    const result = validate(WithDefault, undefined);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, '');
    }
  });

  await t.test('default value can be zero', () => {
    const WithDefault = v.number().default(0);
    const result = validate(WithDefault, undefined);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 0);
    }
  });
});

// Lazy defaults (8 tests)
test('default: lazy defaults (functions)', async (t) => {
  await t.test('applies lazy default when value is undefined', () => {
    const WithDefault = v.string().default(() => 'lazy-value');
    const result = validate(WithDefault, undefined);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'lazy-value');
    }
  });

  await t.test('lazy default is called each time', () => {
    let counter = 0;
    const WithDefault = v.number().default(() => {
      counter++;
      return counter;
    });

    const result1 = validate(WithDefault, undefined);
    assert.strictEqual(result1.ok, true);
    if (result1.ok) {
      assert.strictEqual(result1.value, 1);
    }

    const result2 = validate(WithDefault, undefined);
    assert.strictEqual(result2.ok, true);
    if (result2.ok) {
      assert.strictEqual(result2.value, 2);
    }
  });

  await t.test('lazy default generates timestamp', () => {
    const WithDefault = v.number().default(() => Date.now());
    const result1 = validate(WithDefault, undefined);
    const result2 = validate(WithDefault, undefined);

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, true);
    if (result1.ok && result2.ok) {
      // Timestamps should be close but not identical
      assert(result2.value >= result1.value);
    }
  });

  await t.test('lazy default generates new array each time', () => {
    const WithDefault = v.array(v.string()).default(() => ['a', 'b']);
    const result1 = validate(WithDefault, undefined);
    const result2 = validate(WithDefault, undefined);

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, true);
    if (result1.ok && result2.ok) {
      // Different array instances
      assert.notStrictEqual(result1.value, result2.value);
      assert.deepEqual(result1.value, result2.value);
    }
  });

  await t.test('lazy default generates new object each time', () => {
    const WithDefault = v.object({ id: v.number() }).default(() => ({ id: Math.random() }));
    const result1 = validate(WithDefault, undefined);
    const result2 = validate(WithDefault, undefined);

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, true);
    if (result1.ok && result2.ok) {
      // Different object instances and values
      assert.notStrictEqual(result1.value, result2.value);
      assert.notStrictEqual(result1.value.id, result2.value.id);
    }
  });

  await t.test('uses provided value instead of calling lazy default', () => {
    let called = false;
    const WithDefault = v.string().default(() => {
      called = true;
      return 'default';
    });

    const result = validate(WithDefault, 'provided');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'provided');
      assert.strictEqual(called, false); // Function should not be called
    }
  });

  await t.test('lazy default can return empty array', () => {
    const WithDefault = v.array(v.string()).default(() => []);
    const result = validate(WithDefault, undefined);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value, []);
    }
  });

  await t.test('lazy default can compute based on context', () => {
    let contextValue = 'initial';
    const WithDefault = v.string().default(() => contextValue);

    const result1 = validate(WithDefault, undefined);
    assert.strictEqual(result1.ok, true);
    if (result1.ok) {
      assert.strictEqual(result1.value, 'initial');
    }

    contextValue = 'updated';
    const result2 = validate(WithDefault, undefined);
    assert.strictEqual(result2.ok, true);
    if (result2.ok) {
      assert.strictEqual(result2.value, 'updated');
    }
  });
});

// Edge cases: undefined vs null (4 tests)
test('default: edge cases (undefined vs null)', async (t) => {
  await t.test('applies default for undefined, not for null', () => {
    const WithDefault = v.string().nullable().default('default');

    const result1 = validate(WithDefault, undefined);
    assert.strictEqual(result1.ok, true);
    if (result1.ok) {
      assert.strictEqual(result1.value, 'default');
    }

    const result2 = validate(WithDefault, null);
    assert.strictEqual(result2.ok, true);
    if (result2.ok) {
      assert.strictEqual(result2.value, null);
    }
  });

  await t.test('rejects null when not nullable', () => {
    const WithDefault = v.string().default('default');
    const result = validate(WithDefault, null);
    assert.strictEqual(result.ok, false);
  });

  await t.test('combines with optional correctly', () => {
    const WithDefault = v.string().optional().default('default');

    const result1 = validate(WithDefault, undefined);
    assert.strictEqual(result1.ok, true);
    if (result1.ok) {
      assert.strictEqual(result1.value, 'default');
    }

    const result2 = validate(WithDefault, 'custom');
    assert.strictEqual(result2.ok, true);
    if (result2.ok) {
      assert.strictEqual(result2.value, 'custom');
    }
  });

  await t.test('combines with refinements correctly', () => {
    const WithDefault = v.number()
      .refine(n => n > 0, 'Must be positive')
      .default(10);

    const result1 = validate(WithDefault, undefined);
    assert.strictEqual(result1.ok, true);
    if (result1.ok) {
      assert.strictEqual(result1.value, 10);
    }

    const result2 = validate(WithDefault, 5);
    assert.strictEqual(result2.ok, true);
    if (result2.ok) {
      assert.strictEqual(result2.value, 5);
    }

    const result3 = validate(WithDefault, -5);
    assert.strictEqual(result3.ok, false);
  });
});
