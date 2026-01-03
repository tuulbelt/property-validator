#!/usr/bin/env node --import tsx
/**
 * Yup - Competitor Benchmark (tatami-ng)
 *
 * Benchmarks yup using same scenarios as property-validator for direct comparison.
 */

import { bench, group, run } from 'tatami-ng';
import { readFileSync } from 'node:fs';
import * as yup from 'yup';

// ============================================================================
// Fixtures
// ============================================================================

const small = JSON.parse(readFileSync('./fixtures/small.json', 'utf8'));
const medium = JSON.parse(readFileSync('./fixtures/medium.json', 'utf8'));
const large = JSON.parse(readFileSync('./fixtures/large.json', 'utf8'));

// ============================================================================
// Schemas
// ============================================================================

const UserSchema = yup.object({
  name: yup.string().required(),
  age: yup.number().required(),
  email: yup.string().required(),
});

const UsersListSchema = yup.object({
  users: yup.array(UserSchema).required(),
});

const ComplexSchema = yup.object({
  id: yup.number().required(),
  name: yup.string().required(),
  metadata: yup.object({
    tags: yup.array(yup.string()).required(),
    priority: yup.string().oneOf(['low', 'medium', 'high']).required(),
    createdAt: yup.number().required(),
  }).required(),
  settings: yup.object({
    theme: yup.string().required(),
    notifications: yup.boolean().required(),
  }).optional(),
});

const RefineSchema = yup.number().test('positive', 'Must be positive', n => n! > 0).test('limit', 'Must be less than 100', n => n! < 100);

// ============================================================================
// Prevent Dead Code Elimination
// ============================================================================

let result: any;

// ============================================================================
// Benchmark Suite
// ============================================================================

console.log('\n🟡 Yup Competitor Benchmark (tatami-ng)\n');

group('Primitives', () => {
  bench('yup: primitive string (valid)', async () => {
    result = await yup.string().validate('hello world');
  });

  bench('yup: primitive number (valid)', async () => {
    result = await yup.number().validate(42);
  });

  bench('yup: primitive string (invalid)', async () => {
    try {
      result = await yup.string().validate(123);
    } catch (e) {
      result = e;
    }
  });
});

group('Objects', () => {
  bench('yup: object simple (valid)', async () => {
    result = await UserSchema.validate({ name: 'Alice', age: 30, email: 'alice@example.com' });
  });

  bench('yup: object simple (invalid)', async () => {
    try {
      result = await UserSchema.validate({ name: 'Alice', age: 'thirty', email: 'alice@example.com' });
    } catch (e) {
      result = e;
    }
  });

  bench('yup: object complex nested (valid)', async () => {
    result = await ComplexSchema.validate({
      id: 1,
      name: 'Test',
      metadata: {
        tags: ['foo', 'bar'],
        priority: 'high',
        createdAt: Date.now(),
      },
      settings: {
        theme: 'dark',
        notifications: true,
      },
    });
  });
});

// Arrays - OBJECTS (UserSchema) - APPLES-TO-APPLES comparison
const userArraySmall = Array(10).fill({ name: 'Alice', age: 30, email: 'alice@example.com' });
const userArrayMedium = Array(100).fill({ name: 'Bob', age: 25, email: 'bob@example.com' });
const userArrayLarge = Array(1000).fill({ name: 'Charlie', age: 35, email: 'charlie@example.com' });

group('Arrays - Objects', () => {
  bench('yup: array OBJECTS small (10 items)', async () => {
    result = await yup.array(UserSchema).validate(userArraySmall);
  });

  bench('yup: array OBJECTS medium (100 items)', async () => {
    result = await yup.array(UserSchema).validate(userArrayMedium);
  });

  bench('yup: array OBJECTS large (1000 items)', async () => {
    result = await yup.array(UserSchema).validate(userArrayLarge);
  });
});

// Union (using oneOf as yup doesn't have direct union support)
const UnionSchema = yup.mixed().test('union', 'Must be string, number, or boolean', (value) =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
);

group('Unions', () => {
  bench('yup: union string match', async () => {
    result = await UnionSchema.validate('hello');
  });

  bench('yup: union number match', async () => {
    result = await UnionSchema.validate(42);
  });
});

group('Optional/Nullable', () => {
  bench('yup: optional present', async () => {
    result = await yup.string().optional().validate('value');
  });

  bench('yup: optional absent', async () => {
    result = await yup.string().optional().validate(undefined);
  });
});

group('Refinements', () => {
  bench('yup: refinement pass', async () => {
    result = await RefineSchema.validate(50);
  });

  bench('yup: refinement fail', async () => {
    try {
      result = await RefineSchema.validate(150);
    } catch (e) {
      result = e;
    }
  });
});

// ============================================================================
// Run
// ============================================================================

await run({
  units: false,
  silent: false,
  json: false,
  samples: 256,
  time: 2_000_000_000, // 2 seconds per benchmark
  warmup: true,
  latency: true,
  throughput: true,
});

console.log('\n✅ Yup benchmark complete!');
console.log('⚠️  Note: Yup is async by default, which adds overhead.');
console.log('   Direct comparison may not be entirely fair.\n');
