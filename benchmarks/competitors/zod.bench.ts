#!/usr/bin/env node --import tsx
/**
 * Zod - Competitor Benchmark
 *
 * Benchmarks zod using same scenarios as property-validator for direct comparison.
 */

import { Bench } from 'tinybench';
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
// Benchmark Suite
// ============================================================================

const bench = new Bench({
  time: 100,
  warmupIterations: 5,
  warmupTime: 100,
});

let result: any;

// Primitives
bench.add('zod: primitive string (valid)', () => {
  result = z.string().safeParse('hello world');
});

bench.add('zod: primitive number (valid)', () => {
  result = z.number().safeParse(42);
});

bench.add('zod: primitive string (invalid)', () => {
  result = z.string().safeParse(123);
});

// Objects
bench.add('zod: object simple (valid)', () => {
  result = UserSchema.safeParse({ name: 'Alice', age: 30, email: 'alice@example.com' });
});

bench.add('zod: object simple (invalid)', () => {
  result = UserSchema.safeParse({ name: 'Alice', age: 'thirty', email: 'alice@example.com' });
});

bench.add('zod: object complex nested (valid)', () => {
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

// Arrays
bench.add('zod: array small (10 items)', () => {
  result = UsersListSchema.safeParse(small);
});

bench.add('zod: array medium (100 items)', () => {
  result = UsersListSchema.safeParse(medium);
});

bench.add('zod: array large (1000 items)', () => {
  result = UsersListSchema.safeParse(large);
});

// Union
const UnionSchema = z.union([z.string(), z.number(), z.boolean()]);

bench.add('zod: union string match', () => {
  result = UnionSchema.safeParse('hello');
});

bench.add('zod: union number match', () => {
  result = UnionSchema.safeParse(42);
});

// Optional/Nullable
bench.add('zod: optional present', () => {
  result = z.optional(z.string()).safeParse('value');
});

bench.add('zod: optional absent', () => {
  result = z.optional(z.string()).safeParse(undefined);
});

// Refinements
bench.add('zod: refinement pass', () => {
  result = RefineSchema.safeParse(50);
});

bench.add('zod: refinement fail', () => {
  result = RefineSchema.safeParse(150);
});

// ============================================================================
// Run
// ============================================================================

console.log('\n🔵 Zod Competitor Benchmark\n');
console.log('Running benchmarks...\n');

await bench.warmup();
await bench.run();

console.log('\n📊 Results:\n');
console.table(
  bench.tasks.map((task) => ({
    'Benchmark': task.name,
    'ops/sec': task.result?.hz.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') || 'N/A',
    'Average (ns)': task.result?.mean ? (task.result.mean * 1_000_000).toFixed(2) : 'N/A',
    'Margin': task.result?.rme ? `±${task.result.rme.toFixed(2)}%` : 'N/A',
  }))
);

console.log('\n✅ Zod benchmark complete!\n');
