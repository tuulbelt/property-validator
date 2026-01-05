/**
 * Literal and Enum Validator Tests
 * Comprehensive test coverage for v.literal() and v.enum() validators
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { v } from '../src/v.ts';
import { validate } from '../src/index.ts';

// Literal validation - all types (10 tests)
test('literal: validation for all types', async (t) => {
  await t.test('validates string literal', () => {
    const result = validate(v.literal('hello'), 'hello');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'hello');
    }
  });

  await t.test('validates number literal', () => {
    const result = validate(v.literal(42), 42);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 42);
    }
  });

  await t.test('validates boolean literal (true)', () => {
    const result = validate(v.literal(true), true);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, true);
    }
  });

  await t.test('validates boolean literal (false)', () => {
    const result = validate(v.literal(false), false);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, false);
    }
  });

  await t.test('validates null literal', () => {
    const result = validate(v.literal(null), null);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, null);
    }
  });

  await t.test('validates empty string literal', () => {
    const result = validate(v.literal(''), '');
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates zero literal', () => {
    const result = validate(v.literal(0), 0);
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates negative number literal', () => {
    const result = validate(v.literal(-42), -42);
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects different string value', () => {
    const result = validate(v.literal('hello'), 'world');
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects different number value', () => {
    const result = validate(v.literal(42), 43);
    assert.strictEqual(result.ok, false);
  });
});

// Enum validation (10 tests)
test('enum: validation', async (t) => {
  await t.test('validates first value in enum', () => {
    const result = validate(v.enum(['red', 'green', 'blue']), 'red');
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 'red');
    }
  });

  await t.test('validates middle value in enum', () => {
    const result = validate(v.enum(['red', 'green', 'blue']), 'green');
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates last value in enum', () => {
    const result = validate(v.enum(['red', 'green', 'blue']), 'blue');
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates single-value enum', () => {
    const result = validate(v.enum(['only']), 'only');
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates large enum (10 values)', () => {
    const result = validate(
      v.enum(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']),
      'f'
    );
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates enum with empty string', () => {
    const result = validate(v.enum(['', 'value']), '');
    assert.strictEqual(result.ok, true);
  });

  await t.test('validates enum with similar values', () => {
    const result = validate(v.enum(['test', 'testing', 'tester']), 'testing');
    assert.strictEqual(result.ok, true);
  });

  await t.test('rejects value not in enum', () => {
    const result = validate(v.enum(['red', 'green', 'blue']), 'yellow');
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects wrong type for enum', () => {
    const result = validate(v.enum(['red', 'green', 'blue']), 123);
    assert.strictEqual(result.ok, false);
  });

  await t.test('rejects null for enum', () => {
    const result = validate(v.enum(['red', 'green', 'blue']), null);
    assert.strictEqual(result.ok, false);
  });
});

// Invalid literal/enum values (5 tests)
test('literal/enum: invalid values', async (t) => {
  await t.test('literal rejects wrong type (string vs number)', () => {
    const result = validate(v.literal('42'), 42);
    assert.strictEqual(result.ok, false);
  });

  await t.test('literal rejects wrong type (number vs string)', () => {
    const result = validate(v.literal(42), '42');
    assert.strictEqual(result.ok, false);
  });

  await t.test('literal rejects undefined', () => {
    const result = validate(v.literal('value'), undefined);
    assert.strictEqual(result.ok, false);
  });

  await t.test('enum rejects undefined', () => {
    const result = validate(v.enum(['a', 'b', 'c']), undefined);
    assert.strictEqual(result.ok, false);
  });

  await t.test('enum rejects empty string when not in values', () => {
    const result = validate(v.enum(['a', 'b', 'c']), '');
    assert.strictEqual(result.ok, false);
  });
});
