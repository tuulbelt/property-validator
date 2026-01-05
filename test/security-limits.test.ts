#!/usr/bin/env -S npx tsx
/**
 * Security Limits Tests
 *
 * Tests for Phase 5: Security Limits (10 tests)
 * - Maximum depth limits for nested structures
 * - Maximum property count limits for objects
 * - Maximum array length limits
 * - Protection against resource exhaustion attacks
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { v } from '../src/v.ts';
import { validate } from '../src/index.ts';

// ============================================================================
// Maximum Depth Limits (4 tests)
// ============================================================================

test('security: respects maxDepth for nested objects', () => {
  const schema = v.object({
    level1: v.object({
      level2: v.object({
        value: v.string(),
      }),
    }),
  });

  const validData = {
    level1: {
      level2: {
        value: 'test',
      },
    },
  };

  // Should pass with default depth
  const result1 = validate(schema, validData);
  assert.strictEqual(result1.ok, true);

  // Should fail with maxDepth=2 (only 2 levels allowed)
  const result2 = validate(schema, validData, { maxDepth: 2 });
  assert.strictEqual(result2.ok, false);
  if (!result2.ok) {
    assert.match(result2.error, /depth|nesting/i);
  }
});

test('security: respects maxDepth for nested arrays', () => {
  const schema = v.array(v.array(v.array(v.number())));

  const validData = [[[1, 2], [3, 4]], [[5, 6]]];

  // Should pass with default depth
  const result1 = validate(schema, validData);
  assert.strictEqual(result1.ok, true);

  // Should fail with maxDepth=2
  const result2 = validate(schema, validData, { maxDepth: 2 });
  assert.strictEqual(result2.ok, false);
  if (!result2.ok) {
    assert.match(result2.error, /depth|nesting/i);
  }
});

test('security: maxDepth applies to mixed object/array nesting', () => {
  const schema = v.object({
    data: v.array(
      v.object({
        nested: v.array(v.string()),
      })
    ),
  });

  const validData = {
    data: [
      { nested: ['a', 'b'] },
      { nested: ['c', 'd'] },
    ],
  };

  // Should pass with sufficient depth
  const result1 = validate(schema, validData, { maxDepth: 10 });
  assert.strictEqual(result1.ok, true);

  // Should fail with maxDepth=3
  const result2 = validate(schema, validData, { maxDepth: 3 });
  assert.strictEqual(result2.ok, false);
  if (!result2.ok) {
    assert.match(result2.error, /depth|nesting/i);
  }
});

test('security: maxDepth prevents stack overflow on deeply nested data', () => {
  // Define a recursive schema that can validate any depth
  const DeepNestedSchema: any = v.object({
    value: v.string(),
    nested: v.lazy(() => DeepNestedSchema).optional(),
  });

  // Create extremely deeply nested object
  let deepData: any = { value: 'bottom' };
  for (let i = 0; i < 1000; i++) {
    deepData = { value: `level${i}`, nested: deepData };
  }

  // Without maxDepth, this could cause stack overflow
  // With maxDepth, it should fail gracefully
  const result = validate(DeepNestedSchema, deepData, { maxDepth: 100 });
  assert.strictEqual(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /depth|nesting/i);
  }
});

// ============================================================================
// Maximum Property Count Limits (3 tests)
// ============================================================================

test('security: respects maxProperties for objects', () => {
  const schema = v.object({
    a: v.number(),
    b: v.number(),
    c: v.number(),
  });

  const validData = { a: 1, b: 2, c: 3 };

  // Should pass with default
  const result1 = validate(schema, validData);
  assert.strictEqual(result1.ok, true);

  // Should fail with maxProperties=2
  const result2 = validate(schema, validData, { maxProperties: 2 });
  assert.strictEqual(result2.ok, false);
  if (!result2.ok) {
    assert.match(result2.error, /properties|fields/i);
  }
});

test('security: maxProperties applies to nested objects', () => {
  const schema = v.object({
    outer: v.object({
      a: v.number(),
      b: v.number(),
      c: v.number(),
    }),
  });

  const validData = {
    outer: { a: 1, b: 2, c: 3 },
  };

  // Should pass with sufficient limit
  const result1 = validate(schema, validData, { maxProperties: 10 });
  assert.strictEqual(result1.ok, true);

  // Should fail when nested object exceeds limit
  const result2 = validate(schema, validData, { maxProperties: 2 });
  assert.strictEqual(result2.ok, false);
  if (!result2.ok) {
    assert.match(result2.error, /properties|fields/i);
  }
});

test('security: maxProperties prevents DoS via large objects', () => {
  // Create object with many properties
  const largeData: Record<string, number> = {};
  for (let i = 0; i < 10000; i++) {
    largeData[`prop${i}`] = i;
  }

  const schema = v.object({});

  // Should fail gracefully with maxProperties limit
  const result = validate(schema, largeData, { maxProperties: 100 });
  assert.strictEqual(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /properties|fields/i);
  }
});

// ============================================================================
// Maximum Array Length Limits (3 tests)
// ============================================================================

test('security: respects maxItems for arrays', () => {
  const schema = v.array(v.number());

  const validData = [1, 2, 3, 4, 5];

  // Should pass with default
  const result1 = validate(schema, validData);
  assert.strictEqual(result1.ok, true);

  // Should fail with maxItems=3
  const result2 = validate(schema, validData, { maxItems: 3 });
  assert.strictEqual(result2.ok, false);
  if (!result2.ok) {
    assert.match(result2.error, /items|length|array/i);
  }
});

test('security: maxItems applies to nested arrays', () => {
  const schema = v.array(v.array(v.number()));

  const validData = [
    [1, 2, 3, 4, 5],
    [6, 7, 8],
  ];

  // Should pass with sufficient limit
  const result1 = validate(schema, validData, { maxItems: 10 });
  assert.strictEqual(result1.ok, true);

  // Should fail when nested array exceeds limit
  const result2 = validate(schema, validData, { maxItems: 4 });
  assert.strictEqual(result2.ok, false);
  if (!result2.ok) {
    assert.match(result2.error, /items|length|array/i);
  }
});

test('security: maxItems prevents DoS via large arrays', () => {
  // Create very large array
  const largeArray = Array.from({ length: 100000 }, (_, i) => i);

  const schema = v.array(v.number());

  // Should fail gracefully with maxItems limit
  const result = validate(schema, largeArray, { maxItems: 1000 });
  assert.strictEqual(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /items|length|array/i);
  }
});
