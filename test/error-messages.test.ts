import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, v } from '../src/index.js';

test('error messages - string validator', async (t) => {
  await t.test('provides clear error for number', () => {
    const result = validate(v.string(), 123);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Expected string, got number');
    }
  });

  await t.test('provides clear error for boolean', () => {
    const result = validate(v.string(), true);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Expected string, got boolean');
    }
  });

  await t.test('provides clear error for object', () => {
    const result = validate(v.string(), {});
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Expected string, got object');
    }
  });

  await t.test('provides clear error for null', () => {
    const result = validate(v.string(), null);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Expected string, got null');
    }
  });

  await t.test('provides clear error for undefined', () => {
    const result = validate(v.string(), undefined);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Expected string, got undefined');
    }
  });
});

test('error messages - number validator', async (t) => {
  await t.test('provides clear error for string', () => {
    const result = validate(v.number(), '123');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Expected number, got string');
    }
  });

  await t.test('provides clear error for NaN', () => {
    const result = validate(v.number(), NaN);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Expected number, got NaN');
    }
  });
});

test('error messages - boolean validator', async (t) => {
  await t.test('provides clear error for number 1', () => {
    const result = validate(v.boolean(), 1);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Expected boolean, got number');
    }
  });

  await t.test('provides clear error for string "true"', () => {
    const result = validate(v.boolean(), 'true');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Expected boolean, got string');
    }
  });
});

test('error messages - array validator', async (t) => {
  await t.test('provides clear error for non-array', () => {
    const result = validate(v.array(v.number()), 'not an array');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Expected array, got string');
    }
  });

  await t.test('provides clear error with index for invalid item', () => {
    const result = validate(v.array(v.number()), [1, 'two', 3]);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /index 1.*Expected number.*got string/);
    }
  });
});

test('error messages - object validator', async (t) => {
  await t.test('provides clear error for non-object', () => {
    const validator = v.object({ name: v.string() });
    const result = validate(validator, 'not an object');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Expected object, got string');
    }
  });

  await t.test('provides clear error with property name', () => {
    const validator = v.object({
      name: v.string(),
      age: v.number(),
    });

    const result = validate(validator, { name: 'Alice', age: 'thirty' });
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /property 'age'.*Expected number.*got string/);
    }
  });

  await t.test('provides clear error for missing required property', () => {
    const validator = v.object({
      name: v.string(),
      age: v.number(),
    });

    const result = validate(validator, { name: 'Alice' });
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /property 'age'/);
      assert.match(result.error, /Expected number, got undefined/);
    }
  });
});

test('error messages - nested validators', async (t) => {
  await t.test('provides full path for nested object error', () => {
    const validator = v.object({
      user: v.object({
        profile: v.object({
          email: v.string(),
        }),
      }),
    });

    const result = validate(validator, {
      user: {
        profile: {
          email: 123,
        },
      },
    });

    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      // Verify error shows chain of properties
      assert.match(result.error, /property 'user'/);
      assert.match(result.error, /property 'profile'/);
      assert.match(result.error, /property 'email'/);
      assert.match(result.error, /Expected string, got number/);
    }
  });

  await t.test('provides full path for array of objects error', () => {
    const validator = v.array(
      v.object({
        name: v.string(),
        age: v.number(),
      })
    );

    const result = validate(validator, [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 'twenty' },
    ]);

    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /index 1.*property 'age'.*Expected number.*got string/);
    }
  });
});
