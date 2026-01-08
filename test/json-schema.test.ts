/**
 * JSON Schema Export Tests
 *
 * Tests for converting property-validator schemas to JSON Schema Draft 7.
 *
 * Both APIs support full introspection:
 *
 * Functional API:
 *   - `string(email(), minLength(5))` → format: 'email', minLength: 5
 *   - `optional(string())` → property not in required array
 *   - `nullable(string())` → type: ['string', 'null']
 *
 * Chainable API:
 *   - `v.string().email().min(5)` → format: 'email', minLength: 5
 *   - `.optional()` / `.nullable()` methods also supported
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { v, discriminatedUnion, string, number, optional, nullable, object } from '../src/index.js';
import { toJsonSchema } from '../src/json-schema.js';
import type { JsonSchema } from '../src/json-schema.js';

// Import refinements for functional API tests
import { email, minLength, maxLength, pattern, uuid, datetime, date, time, ipv4, ipv6 } from '../src/refinements/string.js';
import { int, positive, negative, min, max, multipleOf, nonnegative } from '../src/refinements/number.js';

// ============================================================================
// Primitive Types
// ============================================================================

test('JSON Schema: primitives', async (t) => {
  await t.test('converts string validator', () => {
    const schema = v.string();
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.$schema, 'http://json-schema.org/draft-07/schema#');
    assert.strictEqual(jsonSchema.type, 'string');
  });

  await t.test('converts number validator', () => {
    const schema = v.number();
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'number');
  });

  await t.test('converts boolean validator', () => {
    const schema = v.boolean();
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'boolean');
  });

  await t.test('can disable $schema declaration', () => {
    const schema = v.string();
    const jsonSchema = toJsonSchema(schema, { includeSchema: false });

    assert.strictEqual(jsonSchema.$schema, undefined);
    assert.strictEqual(jsonSchema.type, 'string');
  });

  await t.test('chainable string refinements ARE exported', () => {
    // Chainable methods now include jsonSchema metadata
    const schema = v.string().min(5).max(100).email();
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'string');
    assert.strictEqual(jsonSchema.minLength, 5);
    assert.strictEqual(jsonSchema.maxLength, 100);
    assert.strictEqual(jsonSchema.format, 'email');
  });

  await t.test('chainable number refinements ARE exported', () => {
    // Chainable methods now include jsonSchema metadata
    const schema = v.number().positive().min(0).max(100);
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'number');
    assert.strictEqual(jsonSchema.exclusiveMinimum, 0);  // positive()
    assert.strictEqual(jsonSchema.minimum, 0);           // min(0)
    assert.strictEqual(jsonSchema.maximum, 100);         // max(100)
  });
});

// ============================================================================
// Refinement Extraction (Functional API)
// ============================================================================

test('JSON Schema: string refinements (functional API)', async (t) => {
  await t.test('exports minLength constraint', () => {
    const schema = string(minLength(5));
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'string');
    assert.strictEqual(jsonSchema.minLength, 5);
  });

  await t.test('exports maxLength constraint', () => {
    const schema = string(maxLength(100));
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'string');
    assert.strictEqual(jsonSchema.maxLength, 100);
  });

  await t.test('exports both minLength and maxLength', () => {
    const schema = string(minLength(5), maxLength(100));
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'string');
    assert.strictEqual(jsonSchema.minLength, 5);
    assert.strictEqual(jsonSchema.maxLength, 100);
  });

  await t.test('exports email format', () => {
    const schema = string(email());
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'string');
    assert.strictEqual(jsonSchema.format, 'email');
  });

  await t.test('exports pattern constraint', () => {
    const schema = string(pattern(/^[A-Z]{3}$/));
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'string');
    assert.strictEqual(jsonSchema.pattern, '^[A-Z]{3}$');
  });

  await t.test('exports uuid format', () => {
    const schema = string(uuid());
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'string');
    assert.strictEqual(jsonSchema.format, 'uuid');
  });

  await t.test('exports datetime format', () => {
    const schema = string(datetime());
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'string');
    assert.strictEqual(jsonSchema.format, 'date-time');
  });

  await t.test('exports date format', () => {
    const schema = string(date());
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'string');
    assert.strictEqual(jsonSchema.format, 'date');
  });

  await t.test('exports time format', () => {
    const schema = string(time());
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'string');
    assert.strictEqual(jsonSchema.format, 'time');
  });

  await t.test('exports ipv4 format', () => {
    const schema = string(ipv4());
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'string');
    assert.strictEqual(jsonSchema.format, 'ipv4');
  });

  await t.test('exports ipv6 format', () => {
    const schema = string(ipv6());
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'string');
    assert.strictEqual(jsonSchema.format, 'ipv6');
  });

  await t.test('exports combined email and minLength', () => {
    const schema = string(email(), minLength(5));
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'string');
    assert.strictEqual(jsonSchema.format, 'email');
    assert.strictEqual(jsonSchema.minLength, 5);
  });
});

test('JSON Schema: number refinements (functional API)', async (t) => {
  await t.test('exports minimum constraint', () => {
    const schema = number(min(0));
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'number');
    assert.strictEqual(jsonSchema.minimum, 0);
  });

  await t.test('exports maximum constraint', () => {
    const schema = number(max(100));
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'number');
    assert.strictEqual(jsonSchema.maximum, 100);
  });

  await t.test('exports both minimum and maximum', () => {
    const schema = number(min(0), max(100));
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'number');
    assert.strictEqual(jsonSchema.minimum, 0);
    assert.strictEqual(jsonSchema.maximum, 100);
  });

  await t.test('exports exclusiveMinimum (positive)', () => {
    const schema = number(positive());
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'number');
    assert.strictEqual(jsonSchema.exclusiveMinimum, 0);
  });

  await t.test('exports exclusiveMaximum (negative)', () => {
    const schema = number(negative());
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'number');
    assert.strictEqual(jsonSchema.exclusiveMaximum, 0);
  });

  await t.test('exports multipleOf constraint', () => {
    const schema = number(multipleOf(0.01));
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'number');
    assert.strictEqual(jsonSchema.multipleOf, 0.01);
  });

  await t.test('exports int format', () => {
    const schema = number(int());
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'number');
    assert.strictEqual(jsonSchema.format, 'int32');
  });

  await t.test('exports nonnegative minimum', () => {
    const schema = number(nonnegative());
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'number');
    assert.strictEqual(jsonSchema.minimum, 0);
  });

  await t.test('exports combined int and range', () => {
    const schema = number(int(), min(1), max(10));
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'number');
    assert.strictEqual(jsonSchema.format, 'int32');
    assert.strictEqual(jsonSchema.minimum, 1);
    assert.strictEqual(jsonSchema.maximum, 10);
  });
});

// ============================================================================
// Object Types
// ============================================================================

test('JSON Schema: objects', async (t) => {
  await t.test('converts simple object', () => {
    const schema = v.object({
      name: v.string(),
      age: v.number(),
    });
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'object');
    assert.deepStrictEqual(jsonSchema.properties, {
      name: { type: 'string' },
      age: { type: 'number' },
    });
    assert.deepStrictEqual(jsonSchema.required, ['name', 'age']);
  });

  await t.test('converts nested object', () => {
    const schema = v.object({
      user: v.object({
        name: v.string(),
      }),
    });
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'object');
    assert.deepStrictEqual(jsonSchema.properties!.user, {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    });
  });

  // Note: optional/nullable/nullish wrappers don't expose metadata internally,
  // so they cannot be distinguished from regular properties in JSON Schema.
  // All properties are treated as required when using v.optional(), v.nullable()
  // since the wrapper implementation doesn't set detectable flags.

  await t.test('all properties are required by default', () => {
    const schema = v.object({
      name: v.string(),
      age: v.number(),
    });
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'object');
    assert.deepStrictEqual(jsonSchema.required, ['name', 'age']);
  });
});

// ============================================================================
// Array Types
// ============================================================================

test('JSON Schema: arrays', async (t) => {
  await t.test('converts array of strings', () => {
    const schema = v.array(v.string());
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'array');
    assert.deepStrictEqual(jsonSchema.items, { type: 'string' });
  });

  await t.test('converts array of numbers', () => {
    const schema = v.array(v.number());
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'array');
    assert.deepStrictEqual(jsonSchema.items, { type: 'number' });
  });

  await t.test('converts array of objects', () => {
    const schema = v.array(v.object({ id: v.number() }));
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'array');
    assert.deepStrictEqual(jsonSchema.items, {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    });
  });

  await t.test('converts nested arrays', () => {
    const schema = v.array(v.array(v.string()));
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'array');
    assert.deepStrictEqual(jsonSchema.items, {
      type: 'array',
      items: { type: 'string' },
    });
  });
});

// ============================================================================
// Tuple Types
// ============================================================================

test('JSON Schema: tuples', async (t) => {
  await t.test('converts simple tuple', () => {
    const schema = v.tuple([v.string(), v.number()]);
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'array');
    assert.deepStrictEqual(jsonSchema.items, [
      { type: 'string' },
      { type: 'number' },
    ]);
    assert.strictEqual(jsonSchema.minItems, 2);
    assert.strictEqual(jsonSchema.maxItems, 2);
  });

  await t.test('converts single-element tuple', () => {
    const schema = v.tuple([v.boolean()]);
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.minItems, 1);
    assert.strictEqual(jsonSchema.maxItems, 1);
    assert.deepStrictEqual(jsonSchema.items, [{ type: 'boolean' }]);
  });

  await t.test('converts tuple with mixed types', () => {
    const schema = v.tuple([
      v.string(),
      v.number(),
      v.boolean(),
      v.object({ x: v.number() }),
    ]);
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.minItems, 4);
    assert.strictEqual(jsonSchema.maxItems, 4);
  });
});

// ============================================================================
// Union Types
// ============================================================================

test('JSON Schema: unions', async (t) => {
  await t.test('converts union of primitives', () => {
    const schema = v.union([v.string(), v.number()]);
    const jsonSchema = toJsonSchema(schema);

    assert.deepStrictEqual(jsonSchema.anyOf, [
      { type: 'string' },
      { type: 'number' },
    ]);
  });

  await t.test('converts union of string and null', () => {
    const schema = v.union([v.string(), v.literal(null)]);
    const jsonSchema = toJsonSchema(schema);

    assert.deepStrictEqual(jsonSchema.anyOf, [
      { type: 'string' },
      { const: null },
    ]);
  });

  await t.test('converts union of objects', () => {
    const schema = v.union([
      v.object({ type: v.literal('a'), value: v.string() }),
      v.object({ type: v.literal('b'), value: v.number() }),
    ]);
    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.anyOf?.length, 2);
    assert.strictEqual((jsonSchema.anyOf![0] as JsonSchema).type, 'object');
  });
});

// ============================================================================
// Literal Types
// ============================================================================

test('JSON Schema: literals', async (t) => {
  await t.test('converts string literal', () => {
    const schema = v.literal('hello');
    const jsonSchema = toJsonSchema(schema);

    assert.deepStrictEqual(jsonSchema.const, 'hello');
  });

  await t.test('converts number literal', () => {
    const schema = v.literal(42);
    const jsonSchema = toJsonSchema(schema);

    assert.deepStrictEqual(jsonSchema.const, 42);
  });

  await t.test('converts boolean literal', () => {
    const schema = v.literal(true);
    const jsonSchema = toJsonSchema(schema);

    assert.deepStrictEqual(jsonSchema.const, true);
  });

  await t.test('converts null literal', () => {
    const schema = v.literal(null);
    const jsonSchema = toJsonSchema(schema);

    assert.deepStrictEqual(jsonSchema.const, null);
  });

  await t.test('converts union of literals to enum', () => {
    const schema = v.union([
      v.literal('a'),
      v.literal('b'),
      v.literal('c'),
    ]);
    const jsonSchema = toJsonSchema(schema);

    assert.deepStrictEqual(jsonSchema.enum, ['a', 'b', 'c']);
  });

  await t.test('converts union of mixed literals to enum', () => {
    const schema = v.union([
      v.literal('active'),
      v.literal('inactive'),
      v.literal(0),
    ]);
    const jsonSchema = toJsonSchema(schema);

    assert.deepStrictEqual(jsonSchema.enum, ['active', 'inactive', 0]);
  });
});

// ============================================================================
// Enum Types
// ============================================================================

test('JSON Schema: enums', async (t) => {
  await t.test('converts enum validator', () => {
    const schema = v.enum(['red', 'green', 'blue']);
    const jsonSchema = toJsonSchema(schema);

    assert.deepStrictEqual(jsonSchema.enum, ['red', 'green', 'blue']);
  });

  await t.test('converts numeric enum', () => {
    const schema = v.enum([1, 2, 3]);
    const jsonSchema = toJsonSchema(schema);

    assert.deepStrictEqual(jsonSchema.enum, [1, 2, 3]);
  });
});

// ============================================================================
// Discriminated Unions
// ============================================================================

test('JSON Schema: discriminated union', async (t) => {
  await t.test('converts discriminated union to oneOf', () => {
    const schema = discriminatedUnion('type', [
      v.object({ type: v.literal('dog'), breed: v.string() }),
      v.object({ type: v.literal('cat'), indoor: v.boolean() }),
    ]);
    const jsonSchema = toJsonSchema(schema);

    assert.ok(jsonSchema.oneOf);
    assert.strictEqual(jsonSchema.oneOf!.length, 2);

    // Each variant should have the discriminator as const
    const dogSchema = jsonSchema.oneOf![0] as JsonSchema;
    const catSchema = jsonSchema.oneOf![1] as JsonSchema;

    assert.deepStrictEqual(dogSchema.properties!.type, { const: 'dog' });
    assert.deepStrictEqual(catSchema.properties!.type, { const: 'cat' });
  });
});

// ============================================================================
// Complex Schemas
// ============================================================================

test('JSON Schema: complex schemas', async (t) => {
  await t.test('converts User schema', () => {
    const schema = v.object({
      id: v.string(),
      name: v.string(),
      age: v.number(),
      email: v.string(),
      roles: v.array(v.string()),
      address: v.object({
        street: v.string(),
        city: v.string(),
        zip: v.string(),
      }),
    });

    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'object');
    // All properties are required (optional wrappers not detectable)
    assert.deepStrictEqual(jsonSchema.required, ['id', 'name', 'age', 'email', 'roles', 'address']);
    assert.strictEqual(jsonSchema.properties!.id.type, 'string');
    assert.strictEqual(jsonSchema.properties!.roles.type, 'array');
    assert.strictEqual(jsonSchema.properties!.address.type, 'object');
  });

  await t.test('converts API Response schema', () => {
    const schema = v.object({
      status: v.union([v.literal('success'), v.literal('error')]),
      data: v.object({
        items: v.array(v.object({
          id: v.number(),
          name: v.string(),
        })),
      }),
    });

    const jsonSchema = toJsonSchema(schema);

    assert.strictEqual(jsonSchema.type, 'object');
    assert.deepStrictEqual(jsonSchema.properties!.status.enum, ['success', 'error']);
    // All properties required
    assert.strictEqual(jsonSchema.required!.length, 2);
    assert.ok(jsonSchema.required!.includes('status'));
    assert.ok(jsonSchema.required!.includes('data'));
  });

  await t.test('converts deeply nested schema', () => {
    const schema = v.object({
      level1: v.object({
        level2: v.object({
          level3: v.object({
            value: v.string(),
          }),
        }),
      }),
    });

    const jsonSchema = toJsonSchema(schema);

    const level3 = (jsonSchema.properties!.level1 as JsonSchema)
      .properties!.level2.properties!.level3;
    assert.strictEqual(level3.type, 'object');
    assert.strictEqual(level3.properties!.value.type, 'string');
  });
});

// ============================================================================
// Options
// ============================================================================

test('JSON Schema: options', async (t) => {
  await t.test('custom draft URL', () => {
    const schema = v.string();
    const jsonSchema = toJsonSchema(schema, {
      draft: 'http://json-schema.org/draft-06/schema#',
    });

    assert.strictEqual(jsonSchema.$schema, 'http://json-schema.org/draft-06/schema#');
  });

  await t.test('throw on unknown type', () => {
    // Create a validator that doesn't match any known type
    const customValidator = {
      validate: (data: unknown): data is unknown => true,
      error: () => 'error',
    };

    assert.throws(() => {
      toJsonSchema(customValidator as any, { unknownTypeHandling: 'throw' });
    }, /Cannot convert unknown validator type/);
  });

  await t.test('empty schema on unknown type', () => {
    const customValidator = {
      validate: (data: unknown): data is unknown => true,
      error: () => 'error',
    };

    const jsonSchema = toJsonSchema(customValidator as any, {
      unknownTypeHandling: 'empty',
      includeSchema: false,
    });

    assert.deepStrictEqual(jsonSchema, {});
  });

  await t.test('any (empty schema) on unknown type by default', () => {
    const customValidator = {
      validate: (data: unknown): data is unknown => true,
      error: () => 'error',
    };

    const jsonSchema = toJsonSchema(customValidator as any, { includeSchema: false });

    assert.deepStrictEqual(jsonSchema, {});
  });
});

// ============================================================================
// Optional/Nullable (Functional API)
// ============================================================================

test('JSON Schema: optional/nullable (functional API)', async (t) => {
  await t.test('optional property is not in required array', () => {
    const schema = object({
      name: string(),
      email: optional(string()),
    });
    const jsonSchema = toJsonSchema(schema, { includeSchema: false });

    assert.strictEqual(jsonSchema.type, 'object');
    assert.deepStrictEqual(jsonSchema.required, ['name']);
    assert.deepStrictEqual(jsonSchema.properties?.name, { type: 'string' });
    assert.deepStrictEqual(jsonSchema.properties?.email, { type: 'string' });
  });

  await t.test('nullable property has null in type array', () => {
    const schema = nullable(string());
    const jsonSchema = toJsonSchema(schema, { includeSchema: false });

    assert.deepStrictEqual(jsonSchema.type, ['string', 'null']);
  });

  await t.test('nullable number has null in type array', () => {
    const schema = nullable(number());
    const jsonSchema = toJsonSchema(schema, { includeSchema: false });

    assert.deepStrictEqual(jsonSchema.type, ['number', 'null']);
  });

  await t.test('object with all optional properties has no required array', () => {
    const schema = object({
      name: optional(string()),
      age: optional(number()),
    });
    const jsonSchema = toJsonSchema(schema, { includeSchema: false });

    assert.strictEqual(jsonSchema.type, 'object');
    assert.strictEqual(jsonSchema.required, undefined);
    assert.deepStrictEqual(jsonSchema.properties?.name, { type: 'string' });
    assert.deepStrictEqual(jsonSchema.properties?.age, { type: 'number' });
  });

  await t.test('mixed required and optional properties', () => {
    const schema = object({
      id: string(),
      name: string(),
      email: optional(string()),
      age: optional(number()),
    });
    const jsonSchema = toJsonSchema(schema, { includeSchema: false });

    assert.strictEqual(jsonSchema.type, 'object');
    assert.deepStrictEqual(jsonSchema.required, ['id', 'name']);
    assert.strictEqual(Object.keys(jsonSchema.properties!).length, 4);
  });

  await t.test('nullable with refinements preserves type array', () => {
    const schema = nullable(string(minLength(1)));
    const jsonSchema = toJsonSchema(schema, { includeSchema: false });

    assert.deepStrictEqual(jsonSchema.type, ['string', 'null']);
    assert.strictEqual(jsonSchema.minLength, 1);
  });

  await t.test('optional with refinements preserves constraints', () => {
    const schema = object({
      email: optional(string(email())),
    });
    const jsonSchema = toJsonSchema(schema, { includeSchema: false });

    assert.strictEqual(jsonSchema.required, undefined);
    assert.strictEqual(jsonSchema.properties?.email?.type, 'string');
    assert.strictEqual(jsonSchema.properties?.email?.format, 'email');
  });

  await t.test('nullable object adds null to type array', () => {
    const innerSchema = object({ name: string() });
    const schema = nullable(innerSchema);
    const jsonSchema = toJsonSchema(schema, { includeSchema: false });

    // Objects with type property can use type array
    assert.deepStrictEqual(jsonSchema.type, ['object', 'null']);
    assert.ok(jsonSchema.properties);
    assert.deepStrictEqual(jsonSchema.required, ['name']);
  });
});
