#!/usr/bin/env -S npx tsx
/**
 * Stack Trace Preservation Tests
 *
 * Verifies that ValidationError preserves stack traces for debugging
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { v } from '../src/index.js';
import { validate } from '../src/index.ts';

test('stack trace preservation', async (t) => {
  await t.test('ValidationError has stack trace', () => {
    const result = validate(v.string(), 123);

    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      // ValidationError should have a stack trace (inherited from Error)
      assert.ok(result.details.stack);
      assert.ok(typeof result.details.stack === 'string');
      assert.ok(result.details.stack.length > 0);
    }
  });

  await t.test('stack trace includes ValidationError', () => {
    const result = validate(v.number(), 'not a number');

    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      // Stack trace should mention ValidationError
      assert.ok(result.details.stack?.includes('ValidationError'));
    }
  });

  await t.test('stack trace is accessible for debugging', () => {
    const UserSchema = v.object({
      name: v.string(),
      age: v.number(),
    });

    const result = validate(UserSchema, { name: 'Alice', age: 'invalid' });

    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      // Should be able to log stack trace for debugging
      const stackLines = result.details.stack?.split('\n') || [];
      assert.ok(stackLines.length > 0);

      // First line should contain error name and message
      assert.ok(stackLines[0].includes('ValidationError'));
    }
  });
});
