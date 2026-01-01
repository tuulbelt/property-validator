import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, v } from '../src/index.js';

test('validate - string validator', async (t) => {
  await t.test('accepts valid string', () => {
    const result = validate(v.string(), 'hello');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'hello');
    }
  });

  await t.test('rejects non-string', () => {
    const result = validate(v.string(), 123);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Expected string/);
    }
  });
});

test('validate - number validator', async (t) => {
  await t.test('accepts valid number', () => {
    const result = validate(v.number(), 42);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 42);
    }
  });

  await t.test('rejects non-number', () => {
    const result = validate(v.number(), 'not a number');
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects NaN', () => {
    const result = validate(v.number(), NaN);
    assert.strictEqual(result.ok, false);
  });
});

test('validate - boolean validator', async (t) => {
  await t.test('accepts true', () => {
    const result = validate(v.boolean(), true);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, true);
    }
  });

  await t.test('accepts false', () => {
    const result = validate(v.boolean(), false);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, false);
    }
  });

  await t.test('rejects non-boolean', () => {
    const result = validate(v.boolean(), 'true');
    assert.strictEqual(result.ok, false);
  });
});

test('validate - array validator', async (t) => {
  await t.test('accepts valid array', () => {
    const result = validate(v.array(v.number()), [1, 2, 3]);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.deepStrictEqual(result.value, [1, 2, 3]);
    }
  });

  await t.test('rejects non-array', () => {
    const result = validate(v.array(v.number()), 'not an array');
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects array with invalid items', () => {
    const result = validate(v.array(v.number()), [1, 'two', 3]);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /index 1/);
    }
  });

  await t.test('accepts empty array', () => {
    const result = validate(v.array(v.string()), []);
    assert.strictEqual(result.ok, true);
  });
});

test('validate - object validator', async (t) => {
  await t.test('accepts valid object', () => {
    const userValidator = v.object({
      name: v.string(),
      age: v.number(),
    });

    const result = validate(userValidator, { name: 'Alice', age: 30 });
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value.name, 'Alice');
      assert.strictEqual(result.value.age, 30);
    }
  });

  await t.test('rejects non-object', () => {
    const validator = v.object({ name: v.string() });
    const result = validate(validator, 'not an object');
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects null', () => {
    const validator = v.object({ name: v.string() });
    const result = validate(validator, null);
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects object with invalid property', () => {
    const validator = v.object({
      name: v.string(),
      age: v.number(),
    });

    const result = validate(validator, { name: 'Alice', age: 'thirty' });
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /age/);
    }
  });
});

test('validate - optional validator', async (t) => {
  await t.test('accepts undefined', () => {
    const result = validate(v.optional(v.string()), undefined);
    assert.strictEqual(result.ok, true);
  });

  await t.test('accepts valid value', () => {
    const result = validate(v.optional(v.string()), 'hello');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'hello');
    }
  });

  await t.test('rejects invalid value', () => {
    const result = validate(v.optional(v.string()), 123);
    assert.strictEqual(result.ok, false);
  });
});

test('validate - nullable validator', async (t) => {
  await t.test('accepts null', () => {
    const result = validate(v.nullable(v.string()), null);
    assert.strictEqual(result.ok, true);
  });

  await t.test('accepts valid value', () => {
    const result = validate(v.nullable(v.string()), 'hello');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'hello');
    }
  });

  await t.test('rejects invalid value', () => {
    const result = validate(v.nullable(v.string()), 123);
    assert.strictEqual(result.ok, false);
  });
});

test('validate - nested validators', async (t) => {
  await t.test('validates nested object', () => {
    const validator = v.object({
      user: v.object({
        name: v.string(),
        email: v.string(),
      }),
      active: v.boolean(),
    });

    const result = validate(validator, {
      user: { name: 'Alice', email: 'alice@example.com' },
      active: true,
    });

    assert.strictEqual(result.ok, true);
  });

  await t.test('validates array of objects', () => {
    const validator = v.array(
      v.object({
        id: v.number(),
        name: v.string(),
      })
    );

    const result = validate(validator, [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    assert.strictEqual(result.ok, true);
  });
});
