#!/usr/bin/env node --import tsx
/**
 * v.check() vs v.validate() API Benchmark
 *
 * Compares the new v.check() boolean-only API against v.validate() Result-based API.
 * v.check() should be faster because it skips Result allocation entirely.
 */

import { bench, baseline, group, run } from 'tatami-ng';
import { v, validate, check } from '../src/index.ts';

// ============================================================================
// Schemas (PRE-CREATED for fair benchmarking)
// ============================================================================

// Primitives
const StringSchema = v.string();
const NumberSchema = v.number();
const BooleanSchema = v.boolean();

// Objects
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

// Arrays
const StringArraySchema = v.array(v.string());
const NumberArraySchema = v.array(v.number());
const UserArraySchema = v.array(UserSchema);

// Unions
const UnionSchema = v.union([v.string(), v.number(), v.boolean()]);

// ============================================================================
// Test Data
// ============================================================================

const validString = 'hello world';
const validNumber = 42;
const validBoolean = true;

const validUser = { name: 'Alice', age: 30, email: 'alice@example.com' };
const invalidUser = { name: 'Bob', age: 'not-a-number' };

const validComplex = {
  id: 1,
  name: 'Test',
  metadata: {
    tags: ['tag1', 'tag2'],
    priority: 'high' as const,
    createdAt: Date.now(),
  },
  settings: {
    theme: 'dark',
    notifications: true,
  },
};

const stringArraySmall = Array(10).fill('test');
const stringArrayMedium = Array(100).fill('test');
const userArraySmall = Array(10).fill({ name: 'Alice', age: 30, email: 'alice@example.com' });
const userArrayMedium = Array(100).fill({ name: 'Bob', age: 25, email: 'bob@example.com' });

// ============================================================================
// Prevent Dead Code Elimination
// ============================================================================

let result: any;

// ============================================================================
// Benchmark Suite
// ============================================================================

console.log('\n🔥 v.check() vs v.validate() API Benchmark\n');
console.log('Comparing boolean-only v.check() against Result-based v.validate()\n');

group('Primitives', () => {
  baseline('validate() string', () => {
    result = validate(StringSchema, validString);
  });

  bench('check() string', () => {
    result = check(StringSchema, validString);
  });

  bench('validate() number', () => {
    result = validate(NumberSchema, validNumber);
  });

  bench('check() number', () => {
    result = check(NumberSchema, validNumber);
  });
});

group('Objects - Valid', () => {
  baseline('validate() simple object', () => {
    result = validate(UserSchema, validUser);
  });

  bench('check() simple object', () => {
    result = check(UserSchema, validUser);
  });

  bench('validate() complex nested', () => {
    result = validate(ComplexSchema, validComplex);
  });

  bench('check() complex nested', () => {
    result = check(ComplexSchema, validComplex);
  });
});

group('Objects - Invalid (early rejection)', () => {
  baseline('validate() invalid object', () => {
    result = validate(UserSchema, invalidUser);
  });

  bench('check() invalid object', () => {
    result = check(UserSchema, invalidUser);
  });
});

group('Arrays - Objects', () => {
  baseline('validate() 10 objects', () => {
    result = validate(UserArraySchema, userArraySmall);
  });

  bench('check() 10 objects', () => {
    result = check(UserArraySchema, userArraySmall);
  });

  bench('validate() 100 objects', () => {
    result = validate(UserArraySchema, userArrayMedium);
  });

  bench('check() 100 objects', () => {
    result = check(UserArraySchema, userArrayMedium);
  });
});

group('Arrays - Primitives', () => {
  baseline('validate() 10 strings', () => {
    result = validate(StringArraySchema, stringArraySmall);
  });

  bench('check() 10 strings', () => {
    result = check(StringArraySchema, stringArraySmall);
  });

  bench('validate() 100 strings', () => {
    result = validate(StringArraySchema, stringArrayMedium);
  });

  bench('check() 100 strings', () => {
    result = check(StringArraySchema, stringArrayMedium);
  });
});

group('Unions', () => {
  baseline('validate() union string', () => {
    result = validate(UnionSchema, 'test');
  });

  bench('check() union string', () => {
    result = check(UnionSchema, 'test');
  });

  bench('validate() union number', () => {
    result = validate(UnionSchema, 42);
  });

  bench('check() union number', () => {
    result = check(UnionSchema, 42);
  });

  bench('validate() union boolean', () => {
    result = validate(UnionSchema, true);
  });

  bench('check() union boolean', () => {
    result = check(UnionSchema, true);
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

console.log('\n✅ v.check() API benchmark complete!\n');
console.log('Note: v.check() returns only boolean (no Result allocation).');
console.log('Use v.check() for hot paths where you only need pass/fail.\n');
