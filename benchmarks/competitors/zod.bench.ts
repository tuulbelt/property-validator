#!/usr/bin/env node --import tsx
/**
 * Zod - Competitor Benchmark (tatami-ng)
 *
 * Benchmarks zod using same scenarios as property-validator for direct comparison.
 */

import { bench, group, run } from 'tatami-ng';
import { readFileSync } from 'node:fs';
import { z } from 'zod';

// ============================================================================
// Fixtures
// ============================================================================

const small = JSON.parse(readFileSync('./fixtures/small.json', 'utf8'));
const medium = JSON.parse(readFileSync('./fixtures/medium.json', 'utf8'));
const large = JSON.parse(readFileSync('./fixtures/large.json', 'utf8'));

// ============================================================================
// Schemas
// ============================================================================

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string(),
});

const UsersListSchema = z.object({
  users: z.array(UserSchema),
});

const ComplexSchema = z.object({
  id: z.number(),
  name: z.string(),
  metadata: z.object({
    tags: z.array(z.string()),
    priority: z.union([z.literal('low'), z.literal('medium'), z.literal('high')]),
    createdAt: z.number(),
  }),
  settings: z.optional(z.object({
    theme: z.string(),
    notifications: z.boolean(),
  })),
});

const RefineSchema = z.number().refine(n => n > 0, 'Must be positive').refine(n => n < 100, 'Must be less than 100');

// ============================================================================
// Prevent Dead Code Elimination
// ============================================================================

let result: any;

// ============================================================================
// Benchmark Suite
// ============================================================================

console.log('\n🔵 Zod Competitor Benchmark (tatami-ng)\n');

group('Primitives', () => {
  bench('zod: primitive string (valid)', () => {
    result = z.string().safeParse('hello world');
  });

  bench('zod: primitive number (valid)', () => {
    result = z.number().safeParse(42);
  });

  bench('zod: primitive string (invalid)', () => {
    result = z.string().safeParse(123);
  });
});

group('Objects', () => {
  bench('zod: object simple (valid)', () => {
    result = UserSchema.safeParse({ name: 'Alice', age: 30, email: 'alice@example.com' });
  });

  bench('zod: object simple (invalid)', () => {
    result = UserSchema.safeParse({ name: 'Alice', age: 'thirty', email: 'alice@example.com' });
  });

  bench('zod: object complex nested (valid)', () => {
    result = ComplexSchema.safeParse({
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
  bench('zod: array OBJECTS small (10 items)', () => {
    result = z.array(UserSchema).safeParse(userArraySmall);
  });

  bench('zod: array OBJECTS medium (100 items)', () => {
    result = z.array(UserSchema).safeParse(userArrayMedium);
  });

  bench('zod: array OBJECTS large (1000 items)', () => {
    result = z.array(UserSchema).safeParse(userArrayLarge);
  });
});

// Arrays - PRIMITIVES (string[])
const stringArraySmall = Array(10).fill('test');
const stringArrayMedium = Array(100).fill('test');
const stringArrayLarge = Array(1000).fill('test');

group('Arrays - Primitives', () => {
  bench('zod: array PRIMITIVES string[] small (10 items)', () => {
    result = z.array(z.string()).safeParse(stringArraySmall);
  });

  bench('zod: array PRIMITIVES string[] medium (100 items)', () => {
    result = z.array(z.string()).safeParse(stringArrayMedium);
  });

  bench('zod: array PRIMITIVES string[] large (1000 items)', () => {
    result = z.array(z.string()).safeParse(stringArrayLarge);
  });
});

// Union
const UnionSchema = z.union([z.string(), z.number(), z.boolean()]);

group('Unions', () => {
  bench('zod: union string match', () => {
    result = UnionSchema.safeParse('hello');
  });

  bench('zod: union number match', () => {
    result = UnionSchema.safeParse(42);
  });
});

group('Optional/Nullable', () => {
  bench('zod: optional present', () => {
    result = z.optional(z.string()).safeParse('value');
  });

  bench('zod: optional absent', () => {
    result = z.optional(z.string()).safeParse(undefined);
  });
});

group('Refinements', () => {
  bench('zod: refinement pass', () => {
    result = RefineSchema.safeParse(50);
  });

  bench('zod: refinement fail', () => {
    result = RefineSchema.safeParse(150);
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

console.log('\n✅ Zod benchmark complete!\n');
