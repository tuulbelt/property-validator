#!/usr/bin/env -S npx tsx
/**
 * Error Formatting Tests
 *
 * Tests for Phase 3: Error Formatting (15 tests)
 * - JSON formatting (5 tests)
 * - Text formatting (5 tests)
 * - Color formatting (3 tests)
 * - Debug traces (2 tests)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { v } from '../src/v.ts';
import { validate, ValidationError } from '../src/index.ts';

// ============================================================================
// JSON Formatting (5 tests)
// ============================================================================

test('error formatting: JSON', async (t) => {
  await t.test('formats primitive error as JSON', () => {
    const result = validate(v.string(), 123);

    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      const json = result.details.format('json');
      const parsed = JSON.parse(json);

      assert.strictEqual(parsed.error, 'VALIDATION_ERROR');
      assert.strictEqual(parsed.message, 'Expected string, got number');
      assert.strictEqual(parsed.received, 'number');
    }
  });

  await t.test('formats object property error as JSON with path', () => {
    const User = v.object({
      name: v.string(),
      age: v.number(),
    });

    const result = validate(User, { name: 'Alice', age: 'not a number' });

    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      const json = result.details.format('json');
      const parsed = JSON.parse(json);

      assert.strictEqual(parsed.path, 'age');
      assert.strictEqual(parsed.expected, 'number');
      assert.strictEqual(parsed.received, 'string');
    }
  });

  await t.test('formats nested object error as JSON with full path', () => {
    const User = v.object({
      name: v.string(),
      address: v.object({
        street: v.string(),
        city: v.string(),
      }),
    });

    const result = validate(User, {
      name: 'Alice',
      address: { street: 'Main St', city: 123 },
    });

    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      const json = result.details.format('json');
      const parsed = JSON.parse(json);

      assert.strictEqual(parsed.path, 'address.city');
      assert.strictEqual(parsed.expected, 'string');
    }
  });

  await t.test('formats array element error as JSON with index', () => {
    const NumberArray = v.array(v.number());
    const result = validate(NumberArray, [1, 2, 'three', 4]);

    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      const json = result.details.format('json');
      const parsed = JSON.parse(json);

      assert.strictEqual(parsed.path, '[2]');
      assert.strictEqual(parsed.expected, 'number');
      assert.strictEqual(parsed.received, 'string');
    }
  });

  await t.test('JSON format includes error code', () => {
    const result = validate(v.number().refine((n) => n > 0, 'Must be positive'), -5);

    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      const json = result.details.format('json');
      const parsed = JSON.parse(json);

      assert.ok(parsed.error); // Should have an error code
      assert.strictEqual(parsed.message, 'Must be positive');
    }
  });
});

// ============================================================================
// Text Formatting (5 tests)
// ============================================================================

test('error formatting: text', async (t) => {
  await t.test('formats primitive error as plain text', () => {
    const result = validate(v.string(), 123);

    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      const text = result.details.format('text');

      assert.ok(text.includes('Error: Expected string, got number'));
      assert.ok(text.includes('Received: number'));
    }
  });

  await t.test('formats error with path as plain text', () => {
    const User = v.object({
      name: v.string(),
      age: v.number(),
    });

    const result = validate(User, { name: 'Alice', age: 'not a number' });

    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      const text = result.details.format('text');

      assert.ok(text.includes('At path: age'));
      assert.ok(text.includes('Expected: number'));
      assert.ok(text.includes('Received: string'));
    }
  });

  await t.test('formats nested path as plain text', () => {
    const User = v.object({
      name: v.string(),
      address: v.object({
        city: v.string(),
      }),
    });

    const result = validate(User, {
      name: 'Alice',
      address: { city: 123 },
    });

    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      const text = result.details.format('text');

      assert.ok(text.includes('At path: address.city'));
    }
  });

  await t.test('text format is multiline', () => {
    const result = validate(v.number(), 'not a number');

    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      const text = result.details.format('text');
      const lines = text.split('\n');

      assert.ok(lines.length >= 2); // Should have multiple lines
    }
  });

  await t.test('text format includes all error details', () => {
    const result = validate(v.boolean(), null);

    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      const text = result.details.format('text');

      assert.ok(text.includes('Error:'));
      assert.ok(text.includes('Received:'));
    }
  });
});

// ============================================================================
// Color Formatting (3 tests)
// ============================================================================

test('error formatting: color', async (t) => {
  await t.test('formats error with ANSI color codes', () => {
    const result = validate(v.string(), 123);

    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      const colored = result.details.format('color');

      // Should contain ANSI escape codes
      assert.ok(colored.includes('\x1b[')); // ANSI escape sequence
      assert.ok(colored.includes('Error:'));
    }
  });

  await t.test('color format includes path in blue', () => {
    const User = v.object({
      name: v.string(),
      age: v.number(),
    });

    const result = validate(User, { name: 'Alice', age: 'not a number' });

    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      const colored = result.details.format('color');

      // Should have blue color code (\x1b[34m) for path
      assert.ok(colored.includes('\x1b[34m')); // Blue
      assert.ok(colored.includes('age'));
    }
  });

  await t.test('color format includes reset codes', () => {
    const result = validate(v.number(), 'not a number');

    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      const colored = result.details.format('color');

      // Should have reset codes (\x1b[0m)
      assert.ok(colored.includes('\x1b[0m')); // Reset
    }
  });
});

// ============================================================================
// Debug Traces (2 tests)
// ============================================================================

test('error formatting: debug traces', async (t) => {
  await t.test('ValidationError includes validation path', () => {
    const User = v.object({
      profile: v.object({
        email: v.string(),
      }),
    });

    const result = validate(User, {
      profile: { email: 123 },
    });

    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      assert.ok(Array.isArray(result.details.path));
      assert.deepStrictEqual(result.details.path, ['profile', 'email']);
    }
  });

  await t.test('ValidationError includes failed value for debugging', () => {
    const result = validate(v.number(), 'not a number');

    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      assert.strictEqual(result.details.value, 'not a number');
      assert.strictEqual(result.details.expected, 'number');
    }
  });
});
