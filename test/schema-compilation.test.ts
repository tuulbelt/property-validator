/**
 * Schema Compilation Tests
 * Tests for the compile() function and cached validators
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { v } from '../src/v.ts';
import { compile, type CompiledValidator } from '../src/index.ts';

// Compiled validators for primitives (8 tests)
test('compilation: primitives', async (t) => {
  await t.test('compiles string validator', () => {
    const validateString = compile(v.string());
    const result1 = validateString('hello');
    const result2 = validateString(123);

    assert.strictEqual(result1.ok, true);
    if (result1.ok) {
      assert.strictEqual(result1.value, 'hello');
    }

    assert.strictEqual(result2.ok, false);
  });

  await t.test('compiles number validator', () => {
    const validateNumber = compile(v.number());
    const result1 = validateNumber(42);
    const result2 = validateNumber('42');

    assert.strictEqual(result1.ok, true);
    if (result1.ok) {
      assert.strictEqual(result1.value, 42);
    }

    assert.strictEqual(result2.ok, false);
  });

  await t.test('compiles boolean validator', () => {
    const validateBoolean = compile(v.boolean());
    const result1 = validateBoolean(true);
    const result2 = validateBoolean('true');

    assert.strictEqual(result1.ok, true);
    if (result1.ok) {
      assert.strictEqual(result1.value, true);
    }

    assert.strictEqual(result2.ok, false);
  });

  await t.test('compiled validator can be called multiple times', () => {
    const validateString = compile(v.string());

    const result1 = validateString('first');
    const result2 = validateString('second');
    const result3 = validateString(123);

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, true);
    assert.strictEqual(result3.ok, false);
  });

  await t.test('compiles refined validator', () => {
    const PositiveNumber = v.number().refine(n => n > 0, 'Must be positive');
    const validatePositive = compile(PositiveNumber);

    const result1 = validatePositive(5);
    const result2 = validatePositive(-5);
    const result3 = validatePositive('not a number');

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, false);
    assert.strictEqual(result3.ok, false);
  });

  await t.test('compiles transformed validator', () => {
    const ParsedInt = v.string().transform(s => parseInt(s, 10));
    const validateParsed = compile(ParsedInt);

    const result1 = validateParsed('42');
    const result2 = validateParsed(42);

    assert.strictEqual(result1.ok, true);
    if (result1.ok) {
      assert.strictEqual(result1.value, 42);
      assert.strictEqual(typeof result1.value, 'number');
    }

    assert.strictEqual(result2.ok, false);
  });

  await t.test('compiles optional validator', () => {
    const OptionalString = v.string().optional();
    const validateOptional = compile(OptionalString);

    const result1 = validateOptional('hello');
    const result2 = validateOptional(undefined);
    const result3 = validateOptional(null);

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, true);
    assert.strictEqual(result3.ok, false);
  });

  await t.test('compiles validator with default', () => {
    const WithDefault = v.string().default('default-value');
    const validateWithDefault = compile(WithDefault);

    const result1 = validateWithDefault('custom');
    const result2 = validateWithDefault(undefined);

    assert.strictEqual(result1.ok, true);
    if (result1.ok) {
      assert.strictEqual(result1.value, 'custom');
    }

    assert.strictEqual(result2.ok, true);
    if (result2.ok) {
      assert.strictEqual(result2.value, 'default-value');
    }
  });
});

// Compiled validators for objects (10 tests)
test('compilation: objects', async (t) => {
  await t.test('compiles simple object validator', () => {
    const UserValidator = v.object({
      name: v.string(),
      age: v.number()
    });
    const validateUser = compile(UserValidator);

    const result1 = validateUser({ name: 'Alice', age: 30 });
    const result2 = validateUser({ name: 'Bob' });
    const result3 = validateUser('not an object');

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, false);
    assert.strictEqual(result3.ok, false);
  });

  await t.test('compiles nested object validator', () => {
    const AddressValidator = v.object({
      user: v.object({
        name: v.string(),
        email: v.string()
      }),
      city: v.string()
    });
    const validateAddress = compile(AddressValidator);

    const result1 = validateAddress({
      user: { name: 'Alice', email: 'alice@example.com' },
      city: 'NYC'
    });
    const result2 = validateAddress({
      user: { name: 'Bob' },
      city: 'NYC'
    });

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, false);
  });

  await t.test('compiles object with optional fields', () => {
    const UserValidator = v.object({
      name: v.string(),
      email: v.string().optional()
    });
    const validateUser = compile(UserValidator);

    const result1 = validateUser({ name: 'Alice', email: 'alice@example.com' });
    const result2 = validateUser({ name: 'Bob', email: undefined });
    const result3 = validateUser({ name: 'Charlie' }); // Missing optional field

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, true);
    assert.strictEqual(result3.ok, true); // Optional fields can be omitted (treated as undefined)
    if (result3.ok) {
      assert.strictEqual(result3.value.name, 'Charlie');
      assert.strictEqual(result3.value.email, undefined);
    }
  });

  await t.test('compiles object with refined fields', () => {
    const ProductValidator = v.object({
      name: v.string(),
      price: v.number().refine(n => n > 0, 'Price must be positive')
    });
    const validateProduct = compile(ProductValidator);

    const result1 = validateProduct({ name: 'Widget', price: 9.99 });
    const result2 = validateProduct({ name: 'Gadget', price: -5 });

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, false);
  });

  await t.test('compiles object with transformed fields', () => {
    const ConfigValidator = v.object({
      port: v.string().transform(s => parseInt(s, 10)),
      debug: v.string().transform(s => s === 'true')
    });
    const validateConfig = compile(ConfigValidator);

    const result = validateConfig({ port: '3000', debug: 'true' });

    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value.port, 3000);
      assert.strictEqual(result.value.debug, true);
    }
  });

  await t.test('compiles empty object validator', () => {
    const EmptyValidator = v.object({});
    const validateEmpty = compile(EmptyValidator);

    const result1 = validateEmpty({});
    const result2 = validateEmpty({ extra: 'field' });

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, true); // Extra fields are allowed
  });

  await t.test('compiles object with many fields', () => {
    const LargeObjectValidator = v.object({
      field1: v.string(),
      field2: v.number(),
      field3: v.boolean(),
      field4: v.string(),
      field5: v.number(),
      field6: v.boolean(),
      field7: v.string(),
      field8: v.number()
    });
    const validateLarge = compile(LargeObjectValidator);

    const validData = {
      field1: 'a', field2: 1, field3: true, field4: 'b',
      field5: 2, field6: false, field7: 'c', field8: 3
    };
    const invalidData = {
      field1: 'a', field2: 'not a number', field3: true, field4: 'b',
      field5: 2, field6: false, field7: 'c', field8: 3
    };

    const result1 = validateLarge(validData);
    const result2 = validateLarge(invalidData);

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, false);
  });

  await t.test('compiles object with default values', () => {
    const ConfigValidator = v.object({
      port: v.number().default(3000),
      host: v.string().default('localhost')
    });
    const validateConfig = compile(ConfigValidator);

    const result = validateConfig({ port: undefined, host: undefined });

    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value.port, 3000);
      assert.strictEqual(result.value.host, 'localhost');
    }
  });

  await t.test('compiles object with union types', () => {
    const ResponseValidator = v.object({
      status: v.union([v.literal('success'), v.literal('error')]),
      data: v.string()
    });
    const validateResponse = compile(ResponseValidator);

    const result1 = validateResponse({ status: 'success', data: 'OK' });
    const result2 = validateResponse({ status: 'pending', data: 'Wait' });

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, false);
  });

  await t.test('compiles deeply nested object', () => {
    const DeepValidator = v.object({
      level1: v.object({
        level2: v.object({
          level3: v.object({
            value: v.string()
          })
        })
      })
    });
    const validateDeep = compile(DeepValidator);

    const result1 = validateDeep({
      level1: { level2: { level3: { value: 'deep' } } }
    });
    const result2 = validateDeep({
      level1: { level2: { level3: { value: 123 } } }
    });

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, false);
  });
});

// Compiled validators for arrays (8 tests)
test('compilation: arrays', async (t) => {
  await t.test('compiles simple array validator', () => {
    const NumberArrayValidator = v.array(v.number());
    const validateNumbers = compile(NumberArrayValidator);

    const result1 = validateNumbers([1, 2, 3]);
    const result2 = validateNumbers([1, '2', 3]);
    const result3 = validateNumbers('not an array');

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, false);
    assert.strictEqual(result3.ok, false);
  });

  await t.test('compiles array with constraints', () => {
    const ConstrainedArrayValidator = v.array(v.string()).min(1).max(3);
    const validateConstrained = compile(ConstrainedArrayValidator);

    const result1 = validateConstrained(['a', 'b']);
    const result2 = validateConstrained([]);
    const result3 = validateConstrained(['a', 'b', 'c', 'd']);

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, false); // Too short
    assert.strictEqual(result3.ok, false); // Too long
  });

  await t.test('compiles array of objects', () => {
    const UserArrayValidator = v.array(v.object({
      name: v.string(),
      age: v.number()
    }));
    const validateUsers = compile(UserArrayValidator);

    const result1 = validateUsers([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 }
    ]);
    const result2 = validateUsers([
      { name: 'Alice', age: 30 },
      { name: 'Bob' }
    ]);

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, false);
  });

  await t.test('compiles nested arrays (2D array)', () => {
    const MatrixValidator = v.array(v.array(v.number()));
    const validateMatrix = compile(MatrixValidator);

    const result1 = validateMatrix([[1, 2], [3, 4]]);
    const result2 = validateMatrix([[1, 2], [3, '4']]);

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, false);
  });

  await t.test('compiles empty array validator', () => {
    const EmptyArrayValidator = v.array(v.string()).max(0);
    const validateEmpty = compile(EmptyArrayValidator);

    const result1 = validateEmpty([]);
    const result2 = validateEmpty(['a']);

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, false);
  });

  await t.test('compiles tuple validator', () => {
    const TupleValidator = v.tuple([v.string(), v.number(), v.boolean()]);
    const validateTuple = compile(TupleValidator);

    const result1 = validateTuple(['hello', 42, true]);
    const result2 = validateTuple(['hello', 42]);
    const result3 = validateTuple(['hello', 42, 'not boolean']);

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, false); // Wrong length
    assert.strictEqual(result3.ok, false); // Wrong type
  });

  await t.test('compiles array with refined elements', () => {
    const PositiveNumbersValidator = v.array(
      v.number().refine(n => n > 0, 'Must be positive')
    );
    const validatePositives = compile(PositiveNumbersValidator);

    const result1 = validatePositives([1, 2, 3]);
    const result2 = validatePositives([1, -2, 3]);

    assert.strictEqual(result1.ok, true);
    assert.strictEqual(result2.ok, false);
  });

  await t.test('compiles array with transformed elements', () => {
    const ParsedIntsValidator = v.array(
      v.string().transform(s => parseInt(s, 10))
    );
    const validateParsed = compile(ParsedIntsValidator);

    const result = validateParsed(['1', '2', '3']);

    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.deepStrictEqual(result.value, [1, 2, 3]);
    }
  });
});

// Cache behavior (4 tests)
test('compilation: cache', async (t) => {
  await t.test('returns cached compiled validator on second call', () => {
    const StringValidator = v.string();
    const compiled1 = compile(StringValidator);
    const compiled2 = compile(StringValidator);

    // Should return the exact same function reference
    assert.strictEqual(compiled1, compiled2);
  });

  await t.test('different validators get different compiled functions', () => {
    const StringValidator = v.string();
    const NumberValidator = v.number();

    const compiledString = compile(StringValidator);
    const compiledNumber = compile(NumberValidator);

    // Should be different functions
    assert.notStrictEqual(compiledString, compiledNumber);
  });

  await t.test('cached validator works after multiple calls', () => {
    const UserValidator = v.object({ name: v.string(), age: v.number() });

    // Compile multiple times
    const compiled1 = compile(UserValidator);
    const compiled2 = compile(UserValidator);
    const compiled3 = compile(UserValidator);

    // All should be the same reference
    assert.strictEqual(compiled1, compiled2);
    assert.strictEqual(compiled2, compiled3);

    // And they should all work
    const result = compiled3({ name: 'Alice', age: 30 });
    assert.strictEqual(result.ok, true);
  });

  await t.test('standalone compile function has same cache as compile', () => {
    const StringValidator = v.string();

    const compiled1 = compile(StringValidator);
    const compiled2 = compile(StringValidator);

    // Should return the same cached function
    assert.strictEqual(compiled1, compiled2);
  });
});
