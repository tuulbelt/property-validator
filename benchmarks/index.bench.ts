#!/usr/bin/env node --import tsx
/**
 * Property Validator - Main Benchmark Suite
 *
 * Benchmarks core validation operations using tinybench.
 * Run: npm run bench
 */

import { Bench } from 'tinybench';
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
// Benchmark Suite
// ============================================================================

const bench = new Bench({
  time: 100, // Minimum 100ms per benchmark
  warmupIterations: 5,
  warmupTime: 100,
});

// ----------------------------------------------------------------------------
// Primitive Validation
// ----------------------------------------------------------------------------

let result: any; // Prevent DCE

bench.add('primitive: string (valid)', () => {
  result = validate(v.string(), 'hello world');
});

bench.add('primitive: number (valid)', () => {
  result = validate(v.number(), 42);
});

bench.add('primitive: boolean (valid)', () => {
  result = validate(v.boolean(), true);
});

bench.add('primitive: string (invalid)', () => {
  result = validate(v.string(), 123);
});

// ----------------------------------------------------------------------------
// Object Validation
// ----------------------------------------------------------------------------

bench.add('object: simple (valid)', () => {
  result = validate(UserSchema, { name: 'Alice', age: 30, email: 'alice@example.com' });
});

bench.add('object: simple (invalid - missing field)', () => {
  result = validate(UserSchema, { name: 'Alice', age: 30 });
});

bench.add('object: simple (invalid - wrong type)', () => {
  result = validate(UserSchema, { name: 'Alice', age: 'thirty', email: 'alice@example.com' });
});

bench.add('object: complex nested (valid)', () => {
  result = validate(ComplexSchema, {
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

bench.add('object: complex nested (invalid - deep)', () => {
  result = validate(ComplexSchema, {
    id: 1,
    name: 'Test',
    metadata: {
      tags: ['foo', 'bar'],
      priority: 'invalid',
      createdAt: Date.now(),
    },
  });
});

// ----------------------------------------------------------------------------
// Array Validation
// ----------------------------------------------------------------------------

bench.add('array: small (10 items)', () => {
  result = validate(UsersListSchema, small);
});

bench.add('array: medium (100 items)', () => {
  result = validate(UsersListSchema, medium);
});

bench.add('array: large (1000 items)', () => {
  result = validate(UsersListSchema, large);
});

bench.add('array: invalid (early rejection)', () => {
  const invalidData = {
    users: [
      null, // Invalid at index 0
      ...small.users,
    ],
  };
  result = validate(UsersListSchema, invalidData);
});

bench.add('array: invalid (late rejection)', () => {
  const invalidData = {
    users: [
      ...small.users.slice(0, 9),
      { name: 'Invalid', age: 'not a number', email: 'invalid@example.com' }, // Invalid at index 9
    ],
  };
  result = validate(UsersListSchema, invalidData);
});

// ----------------------------------------------------------------------------
// Union Validation
// ----------------------------------------------------------------------------

const UnionSchema = v.union([v.string(), v.number(), v.boolean()]);

bench.add('union: string match (1st option)', () => {
  result = validate(UnionSchema, 'hello');
});

bench.add('union: number match (2nd option)', () => {
  result = validate(UnionSchema, 42);
});

bench.add('union: boolean match (3rd option)', () => {
  result = validate(UnionSchema, true);
});

bench.add('union: no match (all options fail)', () => {
  result = validate(UnionSchema, null);
});

// ----------------------------------------------------------------------------
// Optional / Nullable
// ----------------------------------------------------------------------------

bench.add('optional: present', () => {
  result = validate(v.optional(v.string()), 'value');
});

bench.add('optional: absent', () => {
  result = validate(v.optional(v.string()), undefined);
});

bench.add('nullable: non-null', () => {
  result = validate(v.nullable(v.number()), 42);
});

bench.add('nullable: null', () => {
  result = validate(v.nullable(v.number()), null);
});

// ----------------------------------------------------------------------------
// Refinements
// ----------------------------------------------------------------------------

bench.add('refinement: pass (single)', () => {
  const schema = v.number().refine(n => n > 0, 'Must be positive');
  result = validate(schema, 42);
});

bench.add('refinement: fail (single)', () => {
  const schema = v.number().refine(n => n > 0, 'Must be positive');
  result = validate(schema, -5);
});

bench.add('refinement: pass (chained)', () => {
  result = validate(RefineSchema, 50);
});

bench.add('refinement: fail (chained - 1st)', () => {
  result = validate(RefineSchema, -10);
});

bench.add('refinement: fail (chained - 2nd)', () => {
  result = validate(RefineSchema, 150);
});

// ----------------------------------------------------------------------------
// Schema Compilation (v0.4.0 optimization)
// ----------------------------------------------------------------------------

const compiledSchema = compile(UserSchema);

bench.add('compiled: simple object (valid)', () => {
  result = validate(compiledSchema, { name: 'Alice', age: 30, email: 'alice@example.com' });
});

bench.add('compiled: simple object (invalid)', () => {
  result = validate(compiledSchema, { name: 'Alice', age: 'thirty', email: 'alice@example.com' });
});

// ============================================================================
// Run Benchmarks
// ============================================================================

console.log('🔥 Property Validator Benchmarks\n');
console.log('Running benchmarks (this may take a minute)...\n');

await bench.warmup();
await bench.run();

// ============================================================================
// Results
// ============================================================================

console.log('\n📊 Results:\n');
console.table(
  bench.tasks.map((task) => ({
    'Benchmark': task.name,
    'ops/sec': task.result?.hz ? task.result.hz.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 'N/A',
    'Average (ns)': task.result?.mean ? (task.result.mean * 1_000_000).toFixed(2) : 'N/A',
    'Margin': task.result?.rme ? `±${task.result.rme.toFixed(2)}%` : 'N/A',
    'Samples': task.result?.samples?.length || 'N/A',
  }))
);

console.log('\n✅ Benchmark complete!');
console.log('\nℹ️  Run `npm run bench:compare` to compare against zod and yup.\n');
