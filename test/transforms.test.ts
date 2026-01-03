/**
 * Transform Validator Tests
 * Comprehensive test coverage for .transform() method
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { v, validate } from '../src/index.ts';

// String transformations (8 tests)
test('transform: string transformations', async (t) => {
  await t.test('trims whitespace from string', () => {
    const TrimmedString = v.string().transform(s => s.trim());
    const result = validate(TrimmedString, '  hello  ');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'hello');
    }
  });

  await t.test('converts string to lowercase', () => {
    const LowercaseString = v.string().transform(s => s.toLowerCase());
    const result = validate(LowercaseString, 'HELLO');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'hello');
    }
  });

  await t.test('converts string to uppercase', () => {
    const UppercaseString = v.string().transform(s => s.toUpperCase());
    const result = validate(UppercaseString, 'hello');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'HELLO');
    }
  });

  await t.test('parses string to integer', () => {
    const ParsedInt = v.string().transform(s => parseInt(s, 10));
    const result = validate(ParsedInt, '42');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 42);
      assert.strictEqual(typeof result.value, 'number');
    }
  });

  await t.test('parses string to float', () => {
    const ParsedFloat = v.string().transform(s => parseFloat(s));
    const result = validate(ParsedFloat, '3.14');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 3.14);
    }
  });

  await t.test('splits string into array', () => {
    const SplitString = v.string().transform(s => s.split(','));
    const result = validate(SplitString, 'a,b,c');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value, ['a', 'b', 'c']);
    }
  });

  await t.test('extracts substring', () => {
    const Substring = v.string().transform(s => s.substring(0, 3));
    const result = validate(Substring, 'hello');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'hel');
    }
  });

  await t.test('replaces characters in string', () => {
    const ReplacedString = v.string().transform(s => s.replace('a', 'A'));
    const result = validate(ReplacedString, 'banana');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'bAnana'); // Only first occurrence
    }
  });
});

// Number transformations (6 tests)
test('transform: number transformations', async (t) => {
  await t.test('rounds number to nearest integer', () => {
    const RoundedNumber = v.number().transform(n => Math.round(n));
    const result = validate(RoundedNumber, 3.7);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 4);
    }
  });

  await t.test('floors number', () => {
    const FlooredNumber = v.number().transform(n => Math.floor(n));
    const result = validate(FlooredNumber, 3.9);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 3);
    }
  });

  await t.test('gets absolute value', () => {
    const AbsoluteNumber = v.number().transform(n => Math.abs(n));
    const result = validate(AbsoluteNumber, -5);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 5);
    }
  });

  await t.test('converts number to string', () => {
    const NumberToString = v.number().transform(n => n.toString());
    const result = validate(NumberToString, 42);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, '42');
      assert.strictEqual(typeof result.value, 'string');
    }
  });

  await t.test('multiplies number by constant', () => {
    const Doubled = v.number().transform(n => n * 2);
    const result = validate(Doubled, 5);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 10);
    }
  });

  await t.test('converts number to fixed precision string', () => {
    const FixedPrecision = v.number().transform(n => n.toFixed(2));
    const result = validate(FixedPrecision, 3.14159);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, '3.14');
    }
  });
});

// Chaining transforms (3 tests)
test('transform: chaining transformations', async (t) => {
  await t.test('chains two string transformations', () => {
    const Processed = v.string()
      .transform(s => s.trim())
      .transform(s => s.toUpperCase());
    const result = validate(Processed, '  hello  ');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'HELLO');
    }
  });

  await t.test('chains three transformations', () => {
    const Processed = v.string()
      .transform(s => s.trim())
      .transform(s => s.toLowerCase())
      .transform(s => s.split('').reverse().join(''));
    const result = validate(Processed, '  HELLO  ');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'olleh');
    }
  });

  await t.test('chains transform with type change', () => {
    const ParsedAndDoubled = v.string()
      .transform(s => parseInt(s, 10))
      .transform(n => n * 2);
    const result = validate(ParsedAndDoubled, '21');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 42);
      assert.strictEqual(typeof result.value, 'number');
    }
  });
});

// Type inference (3 tests)
test('transform: type inference', async (t) => {
  await t.test('infers transformed type from string to number', () => {
    const ParsedInt = v.string().transform(s => parseInt(s, 10));
    const result = validate(ParsedInt, '42');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      // TypeScript should infer result.value as number
      const _typeCheck: number = result.value;
      assert.strictEqual(typeof result.value, 'number');
    }
  });

  await t.test('infers transformed type from number to string', () => {
    const ToString = v.number().transform(n => n.toString());
    const result = validate(ToString, 42);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      // TypeScript should infer result.value as string
      const _typeCheck: string = result.value;
      assert.strictEqual(typeof result.value, 'string');
    }
  });

  await t.test('infers transformed type from string to array', () => {
    const SplitString = v.string().transform(s => s.split(','));
    const result = validate(SplitString, 'a,b,c');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      // TypeScript should infer result.value as string[]
      const _typeCheck: string[] = result.value;
      assert(Array.isArray(result.value));
    }
  });
});
