/**
 * Refinement Validator Tests
 * Comprehensive test coverage for .refine() method
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { v } from '../src/v.ts';
import { validate } from '../src/index.ts';

// Single refinement pass/fail (10 tests)
test('refine: single refinement validation', async (t) => {
  await t.test('passes when refinement predicate returns true', () => {
    const PositiveNumber = v.number().refine(n => n > 0, 'Must be positive');
    const result = validate(PositiveNumber, 5);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 5);
    }
  });

  await t.test('fails when refinement predicate returns false', () => {
    const PositiveNumber = v.number().refine(n => n > 0, 'Must be positive');
    const result = validate(PositiveNumber, -5);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Must be positive');
    }
  });

  await t.test('passes string refinement when condition met', () => {
    const NonEmptyString = v.string().refine(s => s.length > 0, 'Must not be empty');
    const result = validate(NonEmptyString, 'hello');
    assert.strictEqual(result.ok, true);
  });

  await t.test('fails string refinement when condition not met', () => {
    const NonEmptyString = v.string().refine(s => s.length > 0, 'Must not be empty');
    const result = validate(NonEmptyString, '');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Must not be empty');
    }
  });

  await t.test('passes array refinement when condition met', () => {
    const NonEmptyArray = v.array(v.string()).refine(arr => arr.length > 0, 'Array must not be empty');
    const result = validate(NonEmptyArray, ['a', 'b']);
    assert.strictEqual(result.ok, true);
  });

  await t.test('fails array refinement when condition not met', () => {
    const NonEmptyArray = v.array(v.string()).refine(arr => arr.length > 0, 'Array must not be empty');
    const result = validate(NonEmptyArray, []);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Array must not be empty');
    }
  });

  await t.test('passes object refinement when condition met', () => {
    const UserWithEmail = v.object({
      name: v.string(),
      email: v.string()
    }).refine(obj => obj.email.includes('@'), 'Email must contain @');
    const result = validate(UserWithEmail, { name: 'Alice', email: 'alice@example.com' });
    assert.strictEqual(result.ok, true);
  });

  await t.test('fails object refinement when condition not met', () => {
    const UserWithEmail = v.object({
      name: v.string(),
      email: v.string()
    }).refine(obj => obj.email.includes('@'), 'Email must contain @');
    const result = validate(UserWithEmail, { name: 'Alice', email: 'invalid-email' });
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Email must contain @');
    }
  });

  await t.test('fails base validation before checking refinements', () => {
    const PositiveNumber = v.number().refine(n => n > 0, 'Must be positive');
    const result = validate(PositiveNumber, 'not-a-number');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.includes('Expected number')); // Base validator error, not refinement error
    }
  });

  await t.test('refinement runs after base validation passes', () => {
    const PositiveNumber = v.number().refine(n => n > 0, 'Must be positive');
    const result = validate(PositiveNumber, 0);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Must be positive');
    }
  });
});

// Multiple refinements (5 tests)
test('refine: multiple refinements', async (t) => {
  await t.test('passes when all refinements return true', () => {
    const PositiveEvenNumber = v.number()
      .refine(n => n > 0, 'Must be positive')
      .refine(n => n % 2 === 0, 'Must be even');
    const result = validate(PositiveEvenNumber, 4);
    assert.strictEqual(result.ok, true);
  });

  await t.test('fails when first refinement fails', () => {
    const PositiveEvenNumber = v.number()
      .refine(n => n > 0, 'Must be positive')
      .refine(n => n % 2 === 0, 'Must be even');
    const result = validate(PositiveEvenNumber, -4);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Must be positive');
    }
  });

  await t.test('fails when second refinement fails', () => {
    const PositiveEvenNumber = v.number()
      .refine(n => n > 0, 'Must be positive')
      .refine(n => n % 2 === 0, 'Must be even');
    const result = validate(PositiveEvenNumber, 3);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Must be even');
    }
  });

  await t.test('chains three refinements successfully', () => {
    const ConstrainedNumber = v.number()
      .refine(n => n > 0, 'Must be positive')
      .refine(n => n < 100, 'Must be less than 100')
      .refine(n => n % 10 === 0, 'Must be divisible by 10');
    const result = validate(ConstrainedNumber, 50);
    assert.strictEqual(result.ok, true);
  });

  await t.test('reports first failing refinement in chain', () => {
    const ConstrainedNumber = v.number()
      .refine(n => n > 0, 'Must be positive')
      .refine(n => n < 100, 'Must be less than 100')
      .refine(n => n % 10 === 0, 'Must be divisible by 10');
    const result = validate(ConstrainedNumber, 55); // Fails third refinement
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Must be divisible by 10');
    }
  });
});

// Custom error messages (5 tests)
test('refine: custom error messages', async (t) => {
  await t.test('shows custom message when refinement fails', () => {
    const validator = v.string().refine(s => s.startsWith('test_'), 'String must start with "test_"');
    const result = validate(validator, 'invalid');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'String must start with "test_"');
    }
  });

  await t.test('supports dynamic error messages with interpolation', () => {
    const MinLength = (n: number) =>
      v.string().refine(s => s.length >= n, `String must be at least ${n} characters`);
    const result = validate(MinLength(5), 'hi');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'String must be at least 5 characters');
    }
  });

  await t.test('shows different custom messages for different refinements', () => {
    const validator = v.number()
      .refine(n => n > 0, 'Number must be positive')
      .refine(n => n < 10, 'Number must be less than 10');
    const result1 = validate(validator, -5);
    assert.strictEqual(result1.ok, false);
    if (!result1.ok) {
      assert.strictEqual(result1.error, 'Number must be positive');
    }

    const result2 = validate(validator, 15);
    assert.strictEqual(result2.ok, false);
    if (!result2.ok) {
      assert.strictEqual(result2.error, 'Number must be less than 10');
    }
  });

  await t.test('supports multiline error messages', () => {
    const validator = v.string().refine(
      s => s.includes('@') && s.includes('.'),
      'Invalid email format:\n- Must contain @\n- Must contain .'
    );
    const result = validate(validator, 'invalid');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.includes('Invalid email format'));
      assert(result.error.includes('Must contain @'));
    }
  });

  await t.test('preserves base validator error when refinement not reached', () => {
    const validator = v.number().refine(n => n > 0, 'Must be positive');
    const result = validate(validator, 'not-a-number');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.includes('Expected number'));
      assert(!result.error.includes('Must be positive'));
    }
  });
});

// Common patterns (email, URL, positive numbers) (10 tests)
test('refine: common validation patterns', async (t) => {
  await t.test('email validation pattern', () => {
    const Email = v.string().refine(
      s => s.includes('@') && s.includes('.') && s.indexOf('@') < s.lastIndexOf('.'),
      'Invalid email format'
    );

    const valid = validate(Email, 'user@example.com');
    assert.strictEqual(valid.ok, true);

    const invalid1 = validate(Email, 'invalid');
    assert.strictEqual(invalid1.ok, false);

    const invalid2 = validate(Email, 'no-at-sign.com');
    assert.strictEqual(invalid2.ok, false);
  });

  await t.test('URL validation pattern', () => {
    const URL = v.string().refine(
      s => s.startsWith('http://') || s.startsWith('https://'),
      'URL must start with http:// or https://'
    );

    const valid = validate(URL, 'https://example.com');
    assert.strictEqual(valid.ok, true);

    const invalid = validate(URL, 'example.com');
    assert.strictEqual(invalid.ok, false);
  });

  await t.test('positive number validation', () => {
    const PositiveNumber = v.number().refine(n => n > 0, 'Must be positive');

    const valid = validate(PositiveNumber, 5);
    assert.strictEqual(valid.ok, true);

    const invalid = validate(PositiveNumber, -5);
    assert.strictEqual(invalid.ok, false);
  });

  await t.test('non-negative number validation', () => {
    const NonNegativeNumber = v.number().refine(n => n >= 0, 'Must be non-negative');

    const valid1 = validate(NonNegativeNumber, 0);
    assert.strictEqual(valid1.ok, true);

    const valid2 = validate(NonNegativeNumber, 5);
    assert.strictEqual(valid2.ok, true);

    const invalid = validate(NonNegativeNumber, -1);
    assert.strictEqual(invalid.ok, false);
  });

  await t.test('integer validation', () => {
    const Integer = v.number().refine(n => Number.isInteger(n), 'Must be an integer');

    const valid = validate(Integer, 5);
    assert.strictEqual(valid.ok, true);

    const invalid = validate(Integer, 5.5);
    assert.strictEqual(invalid.ok, false);
  });

  await t.test('range validation', () => {
    const InRange = v.number()
      .refine(n => n >= 0, 'Must be >= 0')
      .refine(n => n <= 100, 'Must be <= 100');

    const valid = validate(InRange, 50);
    assert.strictEqual(valid.ok, true);

    const invalid1 = validate(InRange, -1);
    assert.strictEqual(invalid1.ok, false);

    const invalid2 = validate(InRange, 101);
    assert.strictEqual(invalid2.ok, false);
  });

  await t.test('string min length validation', () => {
    const MinLength = v.string().refine(s => s.length >= 3, 'Must be at least 3 characters');

    const valid = validate(MinLength, 'hello');
    assert.strictEqual(valid.ok, true);

    const invalid = validate(MinLength, 'hi');
    assert.strictEqual(invalid.ok, false);
  });

  await t.test('string max length validation', () => {
    const MaxLength = v.string().refine(s => s.length <= 10, 'Must be at most 10 characters');

    const valid = validate(MaxLength, 'hello');
    assert.strictEqual(valid.ok, true);

    const invalid = validate(MaxLength, 'this is too long');
    assert.strictEqual(invalid.ok, false);
  });

  await t.test('non-empty array validation', () => {
    const NonEmptyArray = v.array(v.string()).refine(arr => arr.length > 0, 'Array must not be empty');

    const valid = validate(NonEmptyArray, ['a']);
    assert.strictEqual(valid.ok, true);

    const invalid = validate(NonEmptyArray, []);
    assert.strictEqual(invalid.ok, false);
  });

  await t.test('unique array elements validation', () => {
    const UniqueArray = v.array(v.string()).refine(
      arr => new Set(arr).size === arr.length,
      'Array must contain unique elements'
    );

    const valid = validate(UniqueArray, ['a', 'b', 'c']);
    assert.strictEqual(valid.ok, true);

    const invalid = validate(UniqueArray, ['a', 'b', 'a']);
    assert.strictEqual(invalid.ok, false);
  });
});
