/**
 * Enhanced Error Messages Tests
 * Comprehensive test coverage for clear error messages in unions, refinements, and literals/enums
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { v } from '../src/index.js';
import { validate } from '../src/index.ts';

// Union error messages (7 tests)
test('union: error messages', async (t) => {
  await t.test('provides clear error for simple union failure', () => {
    const StringOrNumber = v.union([v.string(), v.number()]);
    const result = validate(StringOrNumber, true);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.includes('Expected one of'));
      assert(result.error.includes('Expected string'));
      assert(result.error.includes('Expected number'));
    }
  });

  await t.test('provides clear error for three-option union', () => {
    const MultiUnion = v.union([v.string(), v.number(), v.boolean()]);
    const result = validate(MultiUnion, null);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.includes('Expected one of'));
      assert(result.error.includes('Expected string'));
      assert(result.error.includes('Expected number'));
      assert(result.error.includes('Expected boolean'));
    }
  });

  await t.test('provides clear error for complex union failure', () => {
    const ComplexUnion = v.union([
      v.object({ type: v.literal('user'), name: v.string() }),
      v.object({ type: v.literal('admin'), role: v.string() })
    ]);
    const result = validate(ComplexUnion, { type: 'invalid' });
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.includes('Expected one of'));
    }
  });

  await t.test('provides detailed error for array union failure', () => {
    const ArrayUnion = v.union([v.array(v.string()), v.array(v.number())]);
    const result = validate(ArrayUnion, [1, '2', 3]);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.includes('Expected one of'));
    }
  });

  await t.test('shows single error for single-option union failure', () => {
    const SingleUnion = v.union([v.string()]);
    const result = validate(SingleUnion, 123);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      // Should show "Expected string" not "Expected one of"
      assert(result.error.includes('Expected string'));
    }
  });

  await t.test('provides clear error for nested union failure', () => {
    const NestedUnion = v.object({
      value: v.union([v.string(), v.number()])
    });
    const result = validate(NestedUnion, { value: true });
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.includes('value'));
      assert(result.error.includes('Expected one of'));
    }
  });

  await t.test('provides clear error when all union options fail validation', () => {
    const RefinedUnion = v.union([
      v.number().refine(n => n > 0, 'Must be positive'),
      v.number().refine(n => n < 0, 'Must be negative')
    ]);
    const result = validate(RefinedUnion, 0);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.includes('Expected one of'));
    }
  });
});

// Refinement error messages (7 tests)
test('refinement: error messages', async (t) => {
  await t.test('provides custom error message for failed refinement', () => {
    const PositiveNumber = v.number().refine(n => n > 0, 'Must be positive');
    const result = validate(PositiveNumber, -5);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Must be positive');
    }
  });

  await t.test('provides clear error for first failed refinement in chain', () => {
    const ConstrainedNumber = v.number()
      .refine(n => n > 0, 'Must be positive')
      .refine(n => n < 100, 'Must be less than 100')
      .refine(n => n % 2 === 0, 'Must be even');

    const result = validate(ConstrainedNumber, -5);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Must be positive');
    }
  });

  await t.test('provides clear error for second failed refinement in chain', () => {
    const ConstrainedNumber = v.number()
      .refine(n => n > 0, 'Must be positive')
      .refine(n => n < 100, 'Must be less than 100')
      .refine(n => n % 2 === 0, 'Must be even');

    const result = validate(ConstrainedNumber, 150);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Must be less than 100');
    }
  });

  await t.test('provides clear error for string refinement failure', () => {
    const EmailPattern = v.string().refine(
      s => s.includes('@') && s.includes('.'),
      'Invalid email format'
    );
    const result = validate(EmailPattern, 'not-an-email');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Invalid email format');
    }
  });

  await t.test('provides base validator error when type is wrong', () => {
    const PositiveNumber = v.number().refine(n => n > 0, 'Must be positive');
    const result = validate(PositiveNumber, 'not-a-number');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      // Should show base validator error, not refinement error
      assert(result.error.includes('Expected number'));
      assert(!result.error.includes('Must be positive'));
    }
  });

  await t.test('provides clear error for object refinement failure', () => {
    const UserWithEmail = v.object({
      name: v.string(),
      email: v.string()
    }).refine(
      obj => obj.email.includes('@'),
      'Email must contain @'
    );
    const result = validate(UserWithEmail, { name: 'Alice', email: 'invalid' });
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Email must contain @');
    }
  });

  await t.test('provides clear error for array refinement failure', () => {
    const NonEmptyArray = v.array(v.string()).refine(
      arr => arr.length > 0,
      'Array must not be empty'
    );
    const result = validate(NonEmptyArray, []);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error, 'Array must not be empty');
    }
  });
});

// Literal/enum error messages (6 tests)
test('literal/enum: error messages', async (t) => {
  await t.test('provides clear error for literal string mismatch', () => {
    const HelloLiteral = v.literal('hello');
    const result = validate(HelloLiteral, 'world');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.includes('Expected literal value'));
      assert(result.error.includes('hello'));
    }
  });

  await t.test('provides clear error for literal number mismatch', () => {
    const FortyTwoLiteral = v.literal(42);
    const result = validate(FortyTwoLiteral, 43);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.includes('Expected literal value'));
      assert(result.error.includes('42'));
    }
  });

  await t.test('provides clear error for literal boolean mismatch', () => {
    const TrueLiteral = v.literal(true);
    const result = validate(TrueLiteral, false);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.includes('Expected literal value'));
      assert(result.error.includes('true'));
    }
  });

  await t.test('provides clear error for enum value mismatch', () => {
    const ColorEnum = v.enum(['red', 'green', 'blue']);
    const result = validate(ColorEnum, 'yellow');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.includes('Expected one of'));
      assert(result.error.includes('red'));
      assert(result.error.includes('green'));
      assert(result.error.includes('blue'));
      assert(result.error.includes('yellow'));
    }
  });

  await t.test('provides clear error when enum receives wrong type', () => {
    const ColorEnum = v.enum(['red', 'green', 'blue']);
    const result = validate(ColorEnum, 123);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.includes('Expected one of'));
      assert(result.error.includes('123'));
    }
  });

  await t.test('provides clear error for null literal mismatch', () => {
    const NullLiteral = v.literal(null);
    const result = validate(NullLiteral, undefined);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert(result.error.includes('Expected literal value'));
      assert(result.error.includes('null'));
    }
  });
});
