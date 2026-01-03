#!/usr/bin/env node --import tsx
/**
 * Property Validator - Main Benchmark Suite (tatami-ng)
 *
 * Benchmarks core validation operations using tatami-ng for statistical rigor.
 * Run: npm run bench
 *
 * Why tatami-ng over tinybench:
 * - Statistical significance testing (p-values, confidence intervals)
 * - Automatic outlier detection and removal
 * - Variance, standard deviation, error margin built-in
 * - Designed for <5% variance (vs tinybench's ±19.4% variance)
 * - See docs/BENCHMARKING_MIGRATION.md for details
 */

import { bench, baseline, group, run } from 'tatami-ng';
import { readFileSync } from 'node:fs';
import { v, validate, compile } from '../src/index.ts';

// ============================================================================
// Fixtures - Load once, reuse across benchmarks
// ============================================================================

const small = JSON.parse(readFileSync('./fixtures/small.json', 'utf8'));
const medium = JSON.parse(readFileSync('./fixtures/medium.json', 'utf8'));
const large = JSON.parse(readFileSync('./fixtures/large.json', 'utf8'));

// ============================================================================
// Schemas - Define once, reuse across benchmarks
// ============================================================================

const UserSchema = v.object({
  name: v.string(),
  age: v.number(),
  email: v.string(),
});

const UsersListSchema = v.object({
  users: v.array(UserSchema),
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

const RefineSchema = v.number().refine(n => n > 0, 'Must be positive').refine(n => n < 100, 'Must be less than 100');

// ============================================================================
// Benchmark Groups
// ============================================================================

let result: any; // Prevent dead code elimination

// ----------------------------------------------------------------------------
// Group: Primitive Validation
// ----------------------------------------------------------------------------

group('Primitives', () => {
  baseline('primitive: string (valid)', () => {
    result = validate(v.string(), 'hello world');
  });

  bench('primitive: number (valid)', () => {
    result = validate(v.number(), 42);
  });

  bench('primitive: boolean (valid)', () => {
    result = validate(v.boolean(), true);
  });

  bench('primitive: string (invalid)', () => {
    result = validate(v.string(), 123);
  });
});

// ----------------------------------------------------------------------------
// Group: Object Validation
// ----------------------------------------------------------------------------

group('Objects', () => {
  baseline('object: simple (valid)', () => {
    result = validate(UserSchema, { name: 'Alice', age: 30, email: 'alice@example.com' });
  });

  bench('object: simple (invalid - missing field)', () => {
    result = validate(UserSchema, { name: 'Alice', age: 30 });
  });

  bench('object: simple (invalid - wrong type)', () => {
    result = validate(UserSchema, { name: 'Alice', age: 'thirty', email: 'alice@example.com' });
  });

  bench('object: complex nested (valid)', () => {
    result = validate(ComplexSchema, {
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

  bench('object: complex nested (invalid - deep)', () => {
    result = validate(ComplexSchema, {
      id: 1,
      name: 'Test',
      metadata: {
        tags: ['tag1', 'tag2'],
        priority: 'invalid', // Wrong literal value
        createdAt: Date.now(),
      },
    });
  });
});

// ----------------------------------------------------------------------------
// Group: Array Validation
// ----------------------------------------------------------------------------

group('Arrays', () => {
  baseline('array: OBJECTS small (10 items) - COMPILED', () => {
    result = validate(UsersListSchema, small);
  });

  bench('array: OBJECTS medium (100 items) - COMPILED', () => {
    result = validate(UsersListSchema, medium);
  });

  bench('array: OBJECTS large (1000 items) - COMPILED', () => {
    result = validate(UsersListSchema, large);
  });

  bench('array: small (10 items)', () => {
    result = validate(v.array(v.union([v.string(), v.number(), v.boolean()])), [
      'a', 1, 'b', 2, 'c', 3, 'd', 4, 'e', 5
    ]);
  });

  bench('array: medium (100 items)', () => {
    const data = Array(100).fill(null).map((_, i) => i % 3 === 0 ? `str${i}` : i % 3 === 1 ? i : true);
    result = validate(v.array(v.union([v.string(), v.number(), v.boolean()])), data);
  });

  bench('array: large (1000 items)', () => {
    const data = Array(1000).fill(null).map((_, i) => i % 3 === 0 ? `str${i}` : i % 3 === 1 ? i : true);
    result = validate(v.array(v.union([v.string(), v.number(), v.boolean()])), data);
  });

  bench('array: string[] small (10 items) - OPTIMIZED', () => {
    result = validate(v.array(v.string()), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);
  });

  bench('array: string[] medium (100 items) - OPTIMIZED', () => {
    const data = Array(100).fill(null).map((_, i) => `str${i}`);
    result = validate(v.array(v.string()), data);
  });

  bench('array: string[] large (1000 items) - OPTIMIZED', () => {
    const data = Array(1000).fill(null).map((_, i) => `str${i}`);
    result = validate(v.array(v.string()), data);
  });

  bench('array: number[] small (10 items) - OPTIMIZED', () => {
    result = validate(v.array(v.number()), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  bench('array: boolean[] small (10 items) - OPTIMIZED', () => {
    result = validate(v.array(v.boolean()), [true, false, true, false, true, false, true, false, true, false]);
  });

  bench('array: invalid (early rejection)', () => {
    result = validate(v.array(v.string()), ['valid', 'valid', 123, 'more']); // Fail at index 2
  });

  bench('array: invalid (late rejection)', () => {
    const invalidData = {
      users: [
        ...small.users.slice(0, 9),
        { name: 'Invalid', age: 'not a number', email: 'invalid@example.com' }, // Invalid at index 9
      ],
    };
    result = validate(UsersListSchema, invalidData);
  });
});

// ----------------------------------------------------------------------------
// Group: Union Validation
// ----------------------------------------------------------------------------

group('Unions', () => {
  const UnionSchema = v.union([v.string(), v.number(), v.boolean()]);

  baseline('union: string match (1st option)', () => {
    result = validate(UnionSchema, 'hello');
  });

  bench('union: number match (2nd option)', () => {
    result = validate(UnionSchema, 42);
  });

  bench('union: boolean match (3rd option)', () => {
    result = validate(UnionSchema, true);
  });

  bench('union: no match (all options fail)', () => {
    result = validate(UnionSchema, null);
  });
});

// ----------------------------------------------------------------------------
// Group: Optional / Nullable
// ----------------------------------------------------------------------------

group('Optional/Nullable', () => {
  baseline('optional: present', () => {
    result = validate(v.optional(v.string()), 'value');
  });

  bench('optional: absent', () => {
    result = validate(v.optional(v.string()), undefined);
  });

  bench('nullable: non-null', () => {
    result = validate(v.nullable(v.number()), 42);
  });

  bench('nullable: null', () => {
    result = validate(v.nullable(v.number()), null);
  });
});

// ----------------------------------------------------------------------------
// Group: Refinements
// ----------------------------------------------------------------------------

group('Refinements', () => {
  baseline('refinement: pass (single)', () => {
    const schema = v.number().refine(n => n > 0, 'Must be positive');
    result = validate(schema, 42);
  });

  bench('refinement: fail (single)', () => {
    const schema = v.number().refine(n => n > 0, 'Must be positive');
    result = validate(schema, -5);
  });

  bench('refinement: pass (chained)', () => {
    result = validate(RefineSchema, 50);
  });

  bench('refinement: fail (chained - 1st)', () => {
    result = validate(RefineSchema, -10);
  });

  bench('refinement: fail (chained - 2nd)', () => {
    result = validate(RefineSchema, 150);
  });
});

// ----------------------------------------------------------------------------
// Group: Schema Compilation (v0.4.0 optimization)
// ----------------------------------------------------------------------------

group('Compiled', () => {
  const compiledSchema = compile(UserSchema);

  baseline('compiled: simple object (valid)', () => {
    result = compiledSchema({ name: 'Alice', age: 30, email: 'alice@example.com' });
  });

  bench('compiled: simple object (invalid)', () => {
    result = compiledSchema({ name: 'Alice', age: 'thirty', email: 'alice@example.com' });
  });
});

// ============================================================================
// Run Benchmarks
// ============================================================================

console.log('🔥 Property Validator Benchmarks (tatami-ng)\n');
console.log('Running benchmarks with statistical rigor...\n');
console.log('Configuration:');
console.log('  - Samples: 256 (vs tinybench: ~70-90k)');
console.log('  - Time: 2 seconds per benchmark (vs tinybench: 100ms)');
console.log('  - Warm-up: Enabled (JIT optimization)');
console.log('  - Outlier detection: Automatic');
console.log('  - Statistics: p-values, variance, std dev, error margin\n');

await run({
  units: false,       // Don't show unit reference (ops/sec is clear enough)
  silent: false,      // Show progress
  json: false,        // Human-readable output
  samples: 256,       // More samples = more stable results
  time: 2_000_000_000, // 2 seconds per benchmark (vs 100ms)
  warmup: true,       // Enable warm-up iterations for JIT
  latency: true,      // Show time per iteration
  throughput: true,   // Show operations per second
});

console.log('\n✅ Benchmark complete!');
console.log('\nℹ️  Variance should be <5% with tatami-ng (vs ±19.4% with tinybench)');
console.log('ℹ️  Run `npm run bench:compare` to compare against zod and yup.\n');
