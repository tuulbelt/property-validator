/**
 * Tree-Shakeable API Tests
 *
 * Tests for the new functional refinement API (v0.9.1) that enables
 * bundlers to eliminate unused refinements.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Import tree-shakeable functions
import {
  // Core validators
  string,
  number,
  validate,
  check,
  // String refinements
  email,
  url,
  uuid,
  minLength,
  maxLength,
  length,
  nonempty,
  pattern,
  startsWith,
  endsWith,
  includes,
  datetime,
  date,
  time,
  ip,
  ipv4,
  ipv6,
  // Number refinements
  int,
  safeInt,
  positive,
  negative,
  nonnegative,
  nonpositive,
  min,
  max,
  range,
  finite,
  multipleOf,
} from '../src/index.js';

// ============================================================================
// String Validator with Refinements
// ============================================================================

test('tree-shakeable string: basic string validation', () => {
  const schema = string();
  assert.strictEqual(schema.validate('hello'), true);
  assert.strictEqual(schema.validate(123), false);
  assert.strictEqual(schema.validate(null), false);
});

test('tree-shakeable string: with email refinement', () => {
  const schema = string(email());
  assert.strictEqual(schema.validate('test@example.com'), true);
  assert.strictEqual(schema.validate('invalid'), false);
  assert.strictEqual(schema.validate(''), false);
});

test('tree-shakeable string: with multiple refinements', () => {
  const schema = string(email(), minLength(10));

  // Valid email >= 10 chars
  assert.strictEqual(schema.validate('test@example.com'), true);

  // Valid email but too short
  assert.strictEqual(schema.validate('a@b.com'), false);

  // Not an email
  assert.strictEqual(schema.validate('not-an-email'), false);
});

test('tree-shakeable string: minLength refinement', () => {
  const schema = string(minLength(5));
  assert.strictEqual(schema.validate('hello'), true);
  assert.strictEqual(schema.validate('hi'), false);
});

test('tree-shakeable string: maxLength refinement', () => {
  const schema = string(maxLength(5));
  assert.strictEqual(schema.validate('hello'), true);
  assert.strictEqual(schema.validate('hello world'), false);
});

test('tree-shakeable string: length refinement', () => {
  const schema = string(length(5));
  assert.strictEqual(schema.validate('hello'), true);
  assert.strictEqual(schema.validate('hi'), false);
  assert.strictEqual(schema.validate('hello world'), false);
});

test('tree-shakeable string: nonempty refinement', () => {
  const schema = string(nonempty());
  assert.strictEqual(schema.validate('hello'), true);
  assert.strictEqual(schema.validate(''), false);
});

test('tree-shakeable string: url refinement', () => {
  const schema = string(url());
  assert.strictEqual(schema.validate('https://example.com'), true);
  assert.strictEqual(schema.validate('http://example.com'), true);
  assert.strictEqual(schema.validate('not-a-url'), false);
});

test('tree-shakeable string: uuid refinement', () => {
  const schema = string(uuid());
  assert.strictEqual(schema.validate('550e8400-e29b-41d4-a716-446655440000'), true);
  assert.strictEqual(schema.validate('not-a-uuid'), false);
});

test('tree-shakeable string: pattern refinement', () => {
  const schema = string(pattern(/^\d{3}-\d{4}$/, 'phone'));
  assert.strictEqual(schema.validate('123-4567'), true);
  assert.strictEqual(schema.validate('1234567'), false);
});

test('tree-shakeable string: startsWith refinement', () => {
  const schema = string(startsWith('https://'));
  assert.strictEqual(schema.validate('https://example.com'), true);
  assert.strictEqual(schema.validate('http://example.com'), false);
});

test('tree-shakeable string: endsWith refinement', () => {
  const schema = string(endsWith('.json'));
  assert.strictEqual(schema.validate('config.json'), true);
  assert.strictEqual(schema.validate('config.yaml'), false);
});

test('tree-shakeable string: includes refinement', () => {
  const schema = string(includes('@'));
  assert.strictEqual(schema.validate('user@domain.com'), true);
  assert.strictEqual(schema.validate('invalid'), false);
});

test('tree-shakeable string: datetime refinement', () => {
  const schema = string(datetime());
  assert.strictEqual(schema.validate('2024-01-15T10:30:00'), true);
  assert.strictEqual(schema.validate('2024-01-15'), false);
});

test('tree-shakeable string: date refinement', () => {
  const schema = string(date());
  assert.strictEqual(schema.validate('2024-01-15'), true);
  assert.strictEqual(schema.validate('2024-01-15T10:30:00'), false);
});

test('tree-shakeable string: time refinement', () => {
  const schema = string(time());
  assert.strictEqual(schema.validate('10:30:00'), true);
  assert.strictEqual(schema.validate('10:30'), false);
});

test('tree-shakeable string: ip refinement', () => {
  const schema = string(ip());
  assert.strictEqual(schema.validate('192.168.1.1'), true);
  assert.strictEqual(schema.validate('::1'), true);
  assert.strictEqual(schema.validate('invalid'), false);
});

test('tree-shakeable string: ipv4 refinement', () => {
  const schema = string(ipv4());
  assert.strictEqual(schema.validate('192.168.1.1'), true);
  assert.strictEqual(schema.validate('::1'), false);
});

test('tree-shakeable string: ipv6 refinement', () => {
  const schema = string(ipv6());
  assert.strictEqual(schema.validate('2001:0db8:85a3:0000:0000:8a2e:0370:7334'), true);
  assert.strictEqual(schema.validate('192.168.1.1'), false);
});

// ============================================================================
// Number Validator with Refinements
// ============================================================================

test('tree-shakeable number: basic number validation', () => {
  const schema = number();
  assert.strictEqual(schema.validate(42), true);
  assert.strictEqual(schema.validate(3.14), true);
  assert.strictEqual(schema.validate('42'), false);
  assert.strictEqual(schema.validate(NaN), false);
});

test('tree-shakeable number: int refinement', () => {
  const schema = number(int());
  assert.strictEqual(schema.validate(42), true);
  assert.strictEqual(schema.validate(3.14), false);
});

test('tree-shakeable number: positive refinement', () => {
  const schema = number(positive());
  assert.strictEqual(schema.validate(42), true);
  assert.strictEqual(schema.validate(0), false);
  assert.strictEqual(schema.validate(-5), false);
});

test('tree-shakeable number: negative refinement', () => {
  const schema = number(negative());
  assert.strictEqual(schema.validate(-5), true);
  assert.strictEqual(schema.validate(0), false);
  assert.strictEqual(schema.validate(42), false);
});

test('tree-shakeable number: nonnegative refinement', () => {
  const schema = number(nonnegative());
  assert.strictEqual(schema.validate(42), true);
  assert.strictEqual(schema.validate(0), true);
  assert.strictEqual(schema.validate(-5), false);
});

test('tree-shakeable number: nonpositive refinement', () => {
  const schema = number(nonpositive());
  assert.strictEqual(schema.validate(-5), true);
  assert.strictEqual(schema.validate(0), true);
  assert.strictEqual(schema.validate(42), false);
});

test('tree-shakeable number: min refinement', () => {
  const schema = number(min(10));
  assert.strictEqual(schema.validate(10), true);
  assert.strictEqual(schema.validate(15), true);
  assert.strictEqual(schema.validate(5), false);
});

test('tree-shakeable number: max refinement', () => {
  const schema = number(max(100));
  assert.strictEqual(schema.validate(100), true);
  assert.strictEqual(schema.validate(50), true);
  assert.strictEqual(schema.validate(150), false);
});

test('tree-shakeable number: range refinement', () => {
  const schema = number(range(10, 100));
  assert.strictEqual(schema.validate(50), true);
  assert.strictEqual(schema.validate(10), true);
  assert.strictEqual(schema.validate(100), true);
  assert.strictEqual(schema.validate(5), false);
  assert.strictEqual(schema.validate(150), false);
});

test('tree-shakeable number: finite refinement', () => {
  const schema = number(finite());
  assert.strictEqual(schema.validate(42), true);
  assert.strictEqual(schema.validate(Infinity), false);
  assert.strictEqual(schema.validate(-Infinity), false);
});

test('tree-shakeable number: safeInt refinement', () => {
  const schema = number(safeInt());
  assert.strictEqual(schema.validate(42), true);
  assert.strictEqual(schema.validate(Number.MAX_SAFE_INTEGER), true);
  assert.strictEqual(schema.validate(Number.MAX_SAFE_INTEGER + 1), false);
});

test('tree-shakeable number: multipleOf refinement', () => {
  const schema = number(multipleOf(5));
  assert.strictEqual(schema.validate(10), true);
  assert.strictEqual(schema.validate(15), true);
  assert.strictEqual(schema.validate(7), false);
});

test('tree-shakeable number: with multiple refinements', () => {
  const schema = number(int(), positive(), max(100));
  assert.strictEqual(schema.validate(50), true);
  assert.strictEqual(schema.validate(0), false); // not positive
  assert.strictEqual(schema.validate(3.14), false); // not int
  assert.strictEqual(schema.validate(150), false); // exceeds max
});

// ============================================================================
// Integration with validate() and check()
// ============================================================================

test('tree-shakeable: validate() returns Result', () => {
  const schema = string(email());
  const result = validate(schema, 'test@example.com');

  assert.strictEqual(result.ok, true);
  if (result.ok) {
    assert.strictEqual(result.value, 'test@example.com');
  }
});

test('tree-shakeable: validate() returns error for invalid data', () => {
  const schema = string(email());
  const result = validate(schema, 'invalid');

  assert.strictEqual(result.ok, false);
  if (!result.ok) {
    assert.strictEqual(result.error, 'Must be a valid email address');
  }
});

test('tree-shakeable: check() returns boolean', () => {
  const schema = number(int(), positive());

  assert.strictEqual(check(schema, 42), true);
  assert.strictEqual(check(schema, -5), false);
  assert.strictEqual(check(schema, 3.14), false);
});

// ============================================================================
// Error Messages
// ============================================================================

test('tree-shakeable string: error message for type mismatch', () => {
  const schema = string(email());
  assert.strictEqual(schema.error(123), 'Expected string, got number');
});

test('tree-shakeable string: error message for refinement failure', () => {
  const schema = string(email());
  assert.strictEqual(schema.error('invalid'), 'Must be a valid email address');
});

test('tree-shakeable number: error message for type mismatch', () => {
  const schema = number(int());
  assert.strictEqual(schema.error('hello'), 'Expected number, got string');
});

test('tree-shakeable number: error message for refinement failure', () => {
  const schema = number(int());
  assert.strictEqual(schema.error(3.14), 'Number must be an integer');
});

// ============================================================================
// Optional/Nullable Support
// ============================================================================

test('tree-shakeable string: optional support', () => {
  const schema = string(email()).optional();
  assert.strictEqual(schema.validate(undefined), true);
  assert.strictEqual(schema.validate('test@example.com'), true);
  assert.strictEqual(schema.validate('invalid'), false);
});

test('tree-shakeable string: nullable support', () => {
  const schema = string(email()).nullable();
  assert.strictEqual(schema.validate(null), true);
  assert.strictEqual(schema.validate('test@example.com'), true);
  assert.strictEqual(schema.validate('invalid'), false);
});

test('tree-shakeable number: optional support', () => {
  const schema = number(positive()).optional();
  assert.strictEqual(schema.validate(undefined), true);
  assert.strictEqual(schema.validate(42), true);
  assert.strictEqual(schema.validate(-5), false);
});

// ============================================================================
// Backwards Compatibility
// ============================================================================

test('tree-shakeable string: backwards compatible with chainable API', () => {
  // When called without refinements, should return StringValidator with chainable methods
  const schema = string();

  // Should have chainable methods
  assert.strictEqual(typeof (schema as any).email, 'function');
  assert.strictEqual(typeof (schema as any).min, 'function');
  assert.strictEqual(typeof (schema as any).max, 'function');

  // Chainable API should work
  const emailSchema = (schema as any).email();
  assert.strictEqual(emailSchema.validate('test@example.com'), true);
  assert.strictEqual(emailSchema.validate('invalid'), false);
});

test('tree-shakeable number: backwards compatible with chainable API', () => {
  // When called without refinements, should return NumberValidator with chainable methods
  const schema = number();

  // Should have chainable methods
  assert.strictEqual(typeof (schema as any).int, 'function');
  assert.strictEqual(typeof (schema as any).positive, 'function');
  assert.strictEqual(typeof (schema as any).min, 'function');

  // Chainable API should work
  const intSchema = (schema as any).int();
  assert.strictEqual(intSchema.validate(42), true);
  assert.strictEqual(intSchema.validate(3.14), false);
});
