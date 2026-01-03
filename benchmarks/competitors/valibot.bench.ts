#!/usr/bin/env node --import tsx
/**
 * Valibot - Competitor Benchmark (tatami-ng)
 *
 * Benchmarks valibot using same scenarios as property-validator for direct comparison.
 */

import { bench, group, run } from 'tatami-ng';
import * as v from 'valibot';

// ============================================================================
// Schemas
// ============================================================================

const UserSchema = v.object({
  name: v.string(),
  age: v.number(),
  email: v.string(),
});

const ComplexSchema = v.object({
  id: v.number(),
  name: v.string(),
  metadata: v.object({
    tags: v.array(v.string()),
    priority: v.union([v.literal('low'), v.literal('medium'), v.literal('high')]),
    createdAt: v.number(),
  }),
  settings: v.optional(v.object({
    theme: v.string(),
    notifications: v.boolean(),
  })),
});

// ============================================================================
// Prevent Dead Code Elimination
// ============================================================================

let result: any;

// ============================================================================
// Benchmark Suite
// ============================================================================

console.log('\n🔥 Valibot Competitor Benchmark (tatami-ng)\n');

group('Primitives', () => {
  bench('valibot: primitive string (valid)', () => {
    result = v.safeParse(v.string(), 'hello world');
  });

  bench('valibot: primitive number (valid)', () => {
    result = v.safeParse(v.number(), 42);
  });

  bench('valibot: primitive string (invalid)', () => {
    result = v.safeParse(v.string(), 123);
  });
});

group('Objects', () => {
  bench('valibot: object simple (valid)', () => {
    result = v.safeParse(UserSchema, { name: 'Alice', age: 30, email: 'alice@example.com' });
  });

  bench('valibot: object simple (invalid)', () => {
    result = v.safeParse(UserSchema, { name: 'Bob', age: 'not-a-number' });
  });

  bench('valibot: object complex nested (valid)', () => {
    result = v.safeParse(ComplexSchema, {
      id: 1,
      name: 'Test',
      metadata: {
        tags: ['tag1', 'tag2'],
        priority: 'high',
        createdAt: Date.now(),
      },
      settings: {
        theme: 'dark',
        notifications: true,
      },
    });
  });

  bench('valibot: object complex nested (invalid)', () => {
    result = v.safeParse(ComplexSchema, {
      id: 'not-a-number',
      name: 'Test',
      metadata: {
        tags: ['tag1', 'tag2'],
        priority: 'invalid',
        createdAt: Date.now(),
      },
    });
  });
});

// Arrays - OBJECTS (UserSchema) - APPLES-TO-APPLES comparison
const userArraySmall = Array(10).fill({ name: 'Alice', age: 30, email: 'alice@example.com' });
const userArrayMedium = Array(100).fill({ name: 'Bob', age: 25, email: 'bob@example.com' });
const userArrayLarge = Array(1000).fill({ name: 'Charlie', age: 35, email: 'charlie@example.com' });

group('Arrays - Objects', () => {
  bench('valibot: array OBJECTS small (10 items)', () => {
    result = v.safeParse(v.array(UserSchema), userArraySmall);
  });

  bench('valibot: array OBJECTS medium (100 items)', () => {
    result = v.safeParse(v.array(UserSchema), userArrayMedium);
  });

  bench('valibot: array OBJECTS large (1000 items)', () => {
    result = v.safeParse(v.array(UserSchema), userArrayLarge);
  });
});

// Arrays - PRIMITIVES (string[])
const stringArraySmall = Array(10).fill('test');
const stringArrayMedium = Array(100).fill('test');
const stringArrayLarge = Array(1000).fill('test');

group('Arrays - Primitives', () => {
  bench('valibot: array PRIMITIVES string[] small (10 items)', () => {
    result = v.safeParse(v.array(v.string()), stringArraySmall);
  });

  bench('valibot: array PRIMITIVES string[] medium (100 items)', () => {
    result = v.safeParse(v.array(v.string()), stringArrayMedium);
  });

  bench('valibot: array PRIMITIVES string[] large (1000 items)', () => {
    result = v.safeParse(v.array(v.string()), stringArrayLarge);
  });
});

group('Unions', () => {
  bench('valibot: union string match', () => {
    result = v.safeParse(v.union([v.string(), v.number(), v.boolean()]), 'test');
  });

  bench('valibot: union number match', () => {
    result = v.safeParse(v.union([v.string(), v.number(), v.boolean()]), 42);
  });

  bench('valibot: union boolean match', () => {
    result = v.safeParse(v.union([v.string(), v.number(), v.boolean()]), true);
  });

  bench('valibot: union no match', () => {
    result = v.safeParse(v.union([v.string(), v.number(), v.boolean()]), null);
  });
});

group('Optional/Nullable', () => {
  bench('valibot: optional present', () => {
    result = v.safeParse(v.optional(v.string()), 'value');
  });

  bench('valibot: optional absent', () => {
    result = v.safeParse(v.optional(v.string()), undefined);
  });

  bench('valibot: nullable non-null', () => {
    result = v.safeParse(v.nullable(v.string()), 'value');
  });

  bench('valibot: nullable null', () => {
    result = v.safeParse(v.nullable(v.string()), null);
  });
});

// Refinements (using pipe + custom validation)
const PositiveSchema = v.pipe(v.number(), v.custom((n) => n > 0, 'Must be positive'));
const RangeSchema = v.pipe(
  v.number(),
  v.custom((n) => n > 0, 'Must be positive'),
  v.custom((n) => n < 100, 'Must be less than 100')
);

group('Refinements', () => {
  bench('valibot: refinement pass (single)', () => {
    result = v.safeParse(PositiveSchema, 42);
  });

  bench('valibot: refinement fail (single)', () => {
    result = v.safeParse(PositiveSchema, -5);
  });

  bench('valibot: refinement pass (chained)', () => {
    result = v.safeParse(RangeSchema, 50);
  });

  bench('valibot: refinement fail (chained - 1st)', () => {
    result = v.safeParse(RangeSchema, -5);
  });

  bench('valibot: refinement fail (chained - 2nd)', () => {
    result = v.safeParse(RangeSchema, 150);
  });
});

// ============================================================================
// Run Benchmarks
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

console.log('\n✅ Valibot benchmark complete!\n');
