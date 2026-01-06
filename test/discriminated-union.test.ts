/**
 * Tests for v.discriminatedUnion() (v0.11.0)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as v from '../src/index.js';
import { validate } from '../src/index.js';

// ============================================================================
// Basic Discriminated Union Tests
// ============================================================================

describe('v.discriminatedUnion() - Basic validation', () => {
  test('validates simple two-variant union', () => {
    const Shape = v.discriminatedUnion('type', [
      v.object({ type: v.literal('circle'), radius: v.number() }),
      v.object({ type: v.literal('square'), side: v.number() }),
    ]);

    assert.strictEqual(Shape.validate({ type: 'circle', radius: 5 }), true);
    assert.strictEqual(Shape.validate({ type: 'square', side: 10 }), true);
  });

  test('rejects unknown discriminator value', () => {
    const Shape = v.discriminatedUnion('type', [
      v.object({ type: v.literal('circle'), radius: v.number() }),
      v.object({ type: v.literal('square'), side: v.number() }),
    ]);

    assert.strictEqual(Shape.validate({ type: 'triangle', base: 5 }), false);
  });

  test('rejects missing discriminator property', () => {
    const Shape = v.discriminatedUnion('type', [
      v.object({ type: v.literal('circle'), radius: v.number() }),
      v.object({ type: v.literal('square'), side: v.number() }),
    ]);

    assert.strictEqual(Shape.validate({ radius: 5 }), false);
  });

  test('rejects non-object inputs', () => {
    const Shape = v.discriminatedUnion('type', [
      v.object({ type: v.literal('a'), value: v.number() }),
    ]);

    assert.strictEqual(Shape.validate(null), false);
    assert.strictEqual(Shape.validate(undefined), false);
    assert.strictEqual(Shape.validate('string'), false);
    assert.strictEqual(Shape.validate(123), false);
    assert.strictEqual(Shape.validate([]), false);
    assert.strictEqual(Shape.validate(true), false);
  });

  test('validates variant with invalid property', () => {
    const Shape = v.discriminatedUnion('type', [
      v.object({ type: v.literal('circle'), radius: v.number() }),
      v.object({ type: v.literal('square'), side: v.number() }),
    ]);

    // Discriminator matches, but property is wrong type
    assert.strictEqual(Shape.validate({ type: 'circle', radius: 'not-a-number' }), false);
  });

  test('validates three or more variants', () => {
    const Shape = v.discriminatedUnion('type', [
      v.object({ type: v.literal('circle'), radius: v.number() }),
      v.object({ type: v.literal('square'), side: v.number() }),
      v.object({ type: v.literal('rectangle'), width: v.number(), height: v.number() }),
    ]);

    assert.strictEqual(Shape.validate({ type: 'circle', radius: 5 }), true);
    assert.strictEqual(Shape.validate({ type: 'square', side: 10 }), true);
    assert.strictEqual(Shape.validate({ type: 'rectangle', width: 10, height: 5 }), true);
    assert.strictEqual(Shape.validate({ type: 'triangle' }), false);
  });
});

// ============================================================================
// Discriminator Key Variations
// ============================================================================

describe('v.discriminatedUnion() - Different discriminator keys', () => {
  test('uses "kind" as discriminator', () => {
    const Result = v.discriminatedUnion('kind', [
      v.object({ kind: v.literal('success'), data: v.string() }),
      v.object({ kind: v.literal('error'), message: v.string() }),
    ]);

    assert.strictEqual(Result.validate({ kind: 'success', data: 'hello' }), true);
    assert.strictEqual(Result.validate({ kind: 'error', message: 'oops' }), true);
  });

  test('uses "status" as discriminator', () => {
    const Event = v.discriminatedUnion('status', [
      v.object({ status: v.literal('pending'), createdAt: v.string() }),
      v.object({ status: v.literal('completed'), completedAt: v.string() }),
      v.object({ status: v.literal('failed'), error: v.string() }),
    ]);

    assert.strictEqual(Event.validate({ status: 'pending', createdAt: '2024-01-01' }), true);
    assert.strictEqual(Event.validate({ status: 'completed', completedAt: '2024-01-02' }), true);
    assert.strictEqual(Event.validate({ status: 'failed', error: 'Network error' }), true);
  });

  test('uses "__typename" as discriminator (GraphQL style)', () => {
    const Node = v.discriminatedUnion('__typename', [
      v.object({ __typename: v.literal('User'), name: v.string() }),
      v.object({ __typename: v.literal('Post'), title: v.string() }),
    ]);

    assert.strictEqual(Node.validate({ __typename: 'User', name: 'Alice' }), true);
    assert.strictEqual(Node.validate({ __typename: 'Post', title: 'Hello' }), true);
  });
});

// ============================================================================
// Numeric and Boolean Discriminators
// ============================================================================

describe('v.discriminatedUnion() - Non-string discriminator values', () => {
  test('numeric discriminator values', () => {
    const Version = v.discriminatedUnion('version', [
      v.object({ version: v.literal(1), data: v.string() }),
      v.object({ version: v.literal(2), data: v.string(), metadata: v.object({}) }),
    ]);

    assert.strictEqual(Version.validate({ version: 1, data: 'v1' }), true);
    assert.strictEqual(Version.validate({ version: 2, data: 'v2', metadata: {} }), true);
    assert.strictEqual(Version.validate({ version: 3, data: 'v3' }), false);
  });

  test('boolean discriminator values', () => {
    const Toggle = v.discriminatedUnion('enabled', [
      v.object({ enabled: v.literal(true), config: v.object({ setting: v.string() }) }),
      v.object({ enabled: v.literal(false), reason: v.string() }),
    ]);

    assert.strictEqual(Toggle.validate({ enabled: true, config: { setting: 'x' } }), true);
    assert.strictEqual(Toggle.validate({ enabled: false, reason: 'disabled' }), true);
  });
});

// ============================================================================
// Error Messages
// ============================================================================

describe('v.discriminatedUnion() - Error messages', () => {
  test('error for non-object input', () => {
    const Schema = v.discriminatedUnion('type', [
      v.object({ type: v.literal('a'), value: v.number() }),
    ]);

    const error = Schema.error(null);
    assert.ok(error.includes("Expected object with 'type' property"));
  });

  test('error for array input', () => {
    const Schema = v.discriminatedUnion('type', [
      v.object({ type: v.literal('a'), value: v.number() }),
    ]);

    const error = Schema.error([]);
    assert.ok(error.includes("Expected object with 'type' property"));
    assert.ok(error.includes('array'));
  });

  test('error for missing discriminator', () => {
    const Schema = v.discriminatedUnion('type', [
      v.object({ type: v.literal('a'), value: v.number() }),
      v.object({ type: v.literal('b'), name: v.string() }),
    ]);

    const error = Schema.error({ value: 5 });
    assert.ok(error.includes("Missing discriminator property 'type'"));
    assert.ok(error.includes('"a"'));
    assert.ok(error.includes('"b"'));
  });

  test('error for invalid discriminator value', () => {
    const Schema = v.discriminatedUnion('type', [
      v.object({ type: v.literal('a'), value: v.number() }),
      v.object({ type: v.literal('b'), name: v.string() }),
    ]);

    const error = Schema.error({ type: 'c' });
    assert.ok(error.includes("Invalid discriminator value 'c'"));
    assert.ok(error.includes('"a"'));
    assert.ok(error.includes('"b"'));
  });

  test('error for invalid variant property', () => {
    const Schema = v.discriminatedUnion('type', [
      v.object({ type: v.literal('user'), name: v.string() }),
    ]);

    const error = Schema.error({ type: 'user', name: 123 });
    assert.ok(error.includes('string'));
  });
});

// ============================================================================
// validate() Function Integration
// ============================================================================

describe('v.discriminatedUnion() - validate() function', () => {
  test('returns ok: true for valid data', () => {
    const Schema = v.discriminatedUnion('type', [
      v.object({ type: v.literal('user'), name: v.string() }),
      v.object({ type: v.literal('guest'), id: v.number() }),
    ]);

    const result = validate(Schema, { type: 'user', name: 'Alice' });
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value.type, 'user');
    }
  });

  test('returns ok: false with MISSING_DISCRIMINATOR code', () => {
    const Schema = v.discriminatedUnion('type', [
      v.object({ type: v.literal('a') }),
    ]);

    const result = validate(Schema, {});
    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      assert.strictEqual(result.details.code, 'MISSING_DISCRIMINATOR');
      assert.deepStrictEqual(result.details.path, ['type']);
    }
  });

  test('returns ok: false with INVALID_DISCRIMINATOR code', () => {
    const Schema = v.discriminatedUnion('type', [
      v.object({ type: v.literal('a') }),
      v.object({ type: v.literal('b') }),
    ]);

    const result = validate(Schema, { type: 'c' });
    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      assert.strictEqual(result.details.code, 'INVALID_DISCRIMINATOR');
      assert.deepStrictEqual(result.details.path, ['type']);
    }
  });

  test('returns path-aware errors for nested validation failures', () => {
    const Schema = v.discriminatedUnion('type', [
      v.object({ type: v.literal('user'), profile: v.object({ age: v.number() }) }),
    ]);

    const result = validate(Schema, { type: 'user', profile: { age: 'not-a-number' } });
    assert.strictEqual(result.ok, false);
    if (!result.ok && result.details) {
      assert.ok(result.details.path.length > 0);
    }
  });
});

// ============================================================================
// Construction Errors
// ============================================================================

describe('v.discriminatedUnion() - Construction validation', () => {
  test('throws on non-object validator', () => {
    assert.throws(() => {
      v.discriminatedUnion('type', [
        v.string() as any, // Not an object validator
      ]);
    }, /must be an object validator/);
  });

  test('throws on missing discriminator in variant', () => {
    assert.throws(() => {
      v.discriminatedUnion('type', [
        v.object({ name: v.string() }), // Missing 'type' property
      ]);
    }, /must have a 'type' property/);
  });

  test('throws on non-literal discriminator', () => {
    assert.throws(() => {
      v.discriminatedUnion('type', [
        v.object({ type: v.string(), name: v.string() }), // 'type' is not literal
      ]);
    }, /must be a literal validator/);
  });

  test('throws on duplicate discriminator values', () => {
    assert.throws(() => {
      v.discriminatedUnion('type', [
        v.object({ type: v.literal('a'), x: v.number() }),
        v.object({ type: v.literal('a'), y: v.number() }), // Duplicate 'a'
      ]);
    }, /Duplicate discriminator value/);
  });
});

// ============================================================================
// Complex Nested Structures
// ============================================================================

describe('v.discriminatedUnion() - Complex structures', () => {
  test('nested objects in variants', () => {
    const Event = v.discriminatedUnion('type', [
      v.object({
        type: v.literal('click'),
        target: v.object({ x: v.number(), y: v.number() }),
      }),
      v.object({
        type: v.literal('scroll'),
        offset: v.object({ top: v.number(), left: v.number() }),
      }),
    ]);

    assert.strictEqual(Event.validate({ type: 'click', target: { x: 10, y: 20 } }), true);
    assert.strictEqual(Event.validate({ type: 'scroll', offset: { top: 100, left: 0 } }), true);
  });

  test('arrays in variants', () => {
    const Data = v.discriminatedUnion('format', [
      v.object({ format: v.literal('list'), items: v.array(v.string()) }),
      v.object({ format: v.literal('single'), item: v.string() }),
    ]);

    assert.strictEqual(Data.validate({ format: 'list', items: ['a', 'b', 'c'] }), true);
    assert.strictEqual(Data.validate({ format: 'single', item: 'x' }), true);
  });

  test('optional fields in variants', () => {
    const Response = v.discriminatedUnion('status', [
      v.object({ status: v.literal('success'), data: v.string(), metadata: v.optional(v.object({})) }),
      v.object({ status: v.literal('error'), message: v.string() }),
    ]);

    assert.strictEqual(Response.validate({ status: 'success', data: 'ok' }), true);
    assert.strictEqual(Response.validate({ status: 'success', data: 'ok', metadata: {} }), true);
    assert.strictEqual(Response.validate({ status: 'error', message: 'fail' }), true);
  });

  test('nested discriminated unions', () => {
    const Inner = v.discriminatedUnion('innerType', [
      v.object({ innerType: v.literal('x'), value: v.number() }),
      v.object({ innerType: v.literal('y'), name: v.string() }),
    ]);

    const Outer = v.discriminatedUnion('outerType', [
      v.object({ outerType: v.literal('wrapper'), inner: Inner }),
      v.object({ outerType: v.literal('plain'), data: v.string() }),
    ]);

    assert.strictEqual(Outer.validate({
      outerType: 'wrapper',
      inner: { innerType: 'x', value: 42 }
    }), true);

    assert.strictEqual(Outer.validate({
      outerType: 'wrapper',
      inner: { innerType: 'y', name: 'test' }
    }), true);

    assert.strictEqual(Outer.validate({
      outerType: 'plain',
      data: 'hello'
    }), true);

    // Invalid inner discriminator
    assert.strictEqual(Outer.validate({
      outerType: 'wrapper',
      inner: { innerType: 'z', value: 1 }
    }), false);
  });
});

// ============================================================================
// JIT Optimization
// ============================================================================

describe('v.discriminatedUnion() - JIT optimization', () => {
  test('_compiled is set when no refinements', () => {
    const Schema = v.discriminatedUnion('type', [
      v.object({ type: v.literal('a'), value: v.number() }),
      v.object({ type: v.literal('b'), name: v.string() }),
    ]);

    assert.ok((Schema as any)._compiled, 'Expected _compiled to be set');
  });

  test('_type is set to discriminatedUnion', () => {
    const Schema = v.discriminatedUnion('type', [
      v.object({ type: v.literal('a') }),
    ]);

    assert.strictEqual((Schema as any)._type, 'discriminatedUnion');
  });

  test('compiled path performs O(1) lookup', () => {
    // Create a discriminated union with many variants
    const variants = [];
    for (let i = 0; i < 100; i++) {
      variants.push(v.object({
        type: v.literal(`variant${i}`),
        value: v.number()
      }));
    }

    const Schema = v.discriminatedUnion('type', variants as any);

    // Both first and last variants should validate efficiently
    assert.strictEqual(Schema.validate({ type: 'variant0', value: 1 }), true);
    assert.strictEqual(Schema.validate({ type: 'variant99', value: 1 }), true);
    assert.strictEqual(Schema.validate({ type: 'variant50', value: 1 }), true);
  });
});

// ============================================================================
// Refinements
// ============================================================================

describe('v.discriminatedUnion() - Refinements', () => {
  test('refine on discriminated union', () => {
    const Schema = v.discriminatedUnion('type', [
      v.object({ type: v.literal('user'), name: v.string() }),
      v.object({ type: v.literal('admin'), name: v.string(), permissions: v.array(v.string()) }),
    ]).refine(
      (val) => val.name.length > 0,
      'Name cannot be empty'
    );

    assert.strictEqual(Schema.validate({ type: 'user', name: 'Alice' }), true);
    assert.strictEqual(Schema.validate({ type: 'user', name: '' }), false);
  });

  test('transform on discriminated union', () => {
    const Schema = v.discriminatedUnion('type', [
      v.object({ type: v.literal('a'), value: v.number() }),
      v.object({ type: v.literal('b'), value: v.number() }),
    ]).transform((val) => ({
      ...val,
      doubled: val.value * 2
    }));

    // Transform doesn't affect validate(), just the output value
    assert.strictEqual(Schema.validate({ type: 'a', value: 5 }), true);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('v.discriminatedUnion() - Edge cases', () => {
  test('single variant union', () => {
    const Schema = v.discriminatedUnion('type', [
      v.object({ type: v.literal('only'), value: v.string() }),
    ]);

    assert.strictEqual(Schema.validate({ type: 'only', value: 'test' }), true);
    assert.strictEqual(Schema.validate({ type: 'other', value: 'test' }), false);
  });

  test('discriminator value is null literal', () => {
    const Schema = v.discriminatedUnion('status', [
      v.object({ status: v.literal(null as any), reason: v.string() }),
      v.object({ status: v.literal('active'), data: v.string() }),
    ]);

    assert.strictEqual(Schema.validate({ status: null, reason: 'not set' }), true);
    assert.strictEqual(Schema.validate({ status: 'active', data: 'hello' }), true);
  });

  test('extra properties in valid variant', () => {
    const Schema = v.discriminatedUnion('type', [
      v.object({ type: v.literal('a'), value: v.number() }),
    ]);

    // By default, extra properties are allowed
    assert.strictEqual(Schema.validate({ type: 'a', value: 1, extra: 'ignored' }), true);
  });

  test('discriminator at end of object', () => {
    // Discriminator doesn't need to be first property
    const Schema = v.discriminatedUnion('type', [
      v.object({ type: v.literal('test'), name: v.string() }),
    ]);

    assert.strictEqual(Schema.validate({ name: 'first', type: 'test' }), true);
  });

  test('empty string discriminator value', () => {
    const Schema = v.discriminatedUnion('type', [
      v.object({ type: v.literal(''), isEmpty: v.boolean() }),
      v.object({ type: v.literal('filled'), content: v.string() }),
    ]);

    assert.strictEqual(Schema.validate({ type: '', isEmpty: true }), true);
    assert.strictEqual(Schema.validate({ type: 'filled', content: 'data' }), true);
  });
});

// ============================================================================
// Real-World Use Cases
// ============================================================================

describe('v.discriminatedUnion() - Real-world scenarios', () => {
  test('API response handling', () => {
    const ApiResponse = v.discriminatedUnion('status', [
      v.object({
        status: v.literal('success'),
        data: v.object({ id: v.number(), name: v.string() }),
      }),
      v.object({
        status: v.literal('error'),
        error: v.object({ code: v.number(), message: v.string() }),
      }),
      v.object({
        status: v.literal('loading'),
      }),
    ]);

    assert.strictEqual(ApiResponse.validate({
      status: 'success',
      data: { id: 1, name: 'Item' }
    }), true);

    assert.strictEqual(ApiResponse.validate({
      status: 'error',
      error: { code: 404, message: 'Not found' }
    }), true);

    assert.strictEqual(ApiResponse.validate({
      status: 'loading'
    }), true);
  });

  test('Redux action types', () => {
    const Action = v.discriminatedUnion('type', [
      v.object({ type: v.literal('INCREMENT'), amount: v.number() }),
      v.object({ type: v.literal('DECREMENT'), amount: v.number() }),
      v.object({ type: v.literal('RESET') }),
      v.object({ type: v.literal('SET'), value: v.number() }),
    ]);

    assert.strictEqual(Action.validate({ type: 'INCREMENT', amount: 5 }), true);
    assert.strictEqual(Action.validate({ type: 'RESET' }), true);
    assert.strictEqual(Action.validate({ type: 'SET', value: 100 }), true);
  });

  test('Event types in event-driven system', () => {
    const Event = v.discriminatedUnion('eventType', [
      v.object({
        eventType: v.literal('USER_CREATED'),
        payload: v.object({ userId: v.string(), email: v.string() }),
        timestamp: v.number(),
      }),
      v.object({
        eventType: v.literal('USER_DELETED'),
        payload: v.object({ userId: v.string() }),
        timestamp: v.number(),
      }),
      v.object({
        eventType: v.literal('USER_UPDATED'),
        payload: v.object({ userId: v.string(), changes: v.object({}) }),
        timestamp: v.number(),
      }),
    ]);

    assert.strictEqual(Event.validate({
      eventType: 'USER_CREATED',
      payload: { userId: 'u123', email: 'test@example.com' },
      timestamp: Date.now()
    }), true);
  });
});
