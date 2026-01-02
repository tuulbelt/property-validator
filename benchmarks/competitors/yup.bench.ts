#!/usr/bin/env node --import tsx
/**
 * Yup - Competitor Benchmark
 *
 * Benchmarks yup using same scenarios as property-validator for direct comparison.
 */

import { Bench } from 'tinybench';
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
// Benchmark Suite
// ============================================================================

const bench = new Bench({
  time: 100,
  warmupIterations: 5,
  warmupTime: 100,
});

let result: any;

// Primitives
bench.add('yup: primitive string (valid)', async () => {
  result = await yup.string().validate('hello world');
});

bench.add('yup: primitive number (valid)', async () => {
  result = await yup.number().validate(42);
});

bench.add('yup: primitive string (invalid)', async () => {
  try {
    result = await yup.string().validate(123);
  } catch (e) {
    result = e;
  }
});

// Objects
bench.add('yup: object simple (valid)', async () => {
  result = await UserSchema.validate({ name: 'Alice', age: 30, email: 'alice@example.com' });
});

bench.add('yup: object simple (invalid)', async () => {
  try {
    result = await UserSchema.validate({ name: 'Alice', age: 'thirty', email: 'alice@example.com' });
  } catch (e) {
    result = e;
  }
});

bench.add('yup: object complex nested (valid)', async () => {
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

// Arrays
bench.add('yup: array small (10 items)', async () => {
  result = await UsersListSchema.validate(small);
});

bench.add('yup: array medium (100 items)', async () => {
  result = await UsersListSchema.validate(medium);
});

bench.add('yup: array large (1000 items)', async () => {
  result = await UsersListSchema.validate(large);
});

// Union (using oneOf as yup doesn't have direct union support)
const UnionSchema = yup.mixed().test('union', 'Must be string, number, or boolean', (value) =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
);

bench.add('yup: union string match', async () => {
  result = await UnionSchema.validate('hello');
});

bench.add('yup: union number match', async () => {
  result = await UnionSchema.validate(42);
});

// Optional/Nullable
bench.add('yup: optional present', async () => {
  result = await yup.string().optional().validate('value');
});

bench.add('yup: optional absent', async () => {
  result = await yup.string().optional().validate(undefined);
});

// Refinements
bench.add('yup: refinement pass', async () => {
  result = await RefineSchema.validate(50);
});

bench.add('yup: refinement fail', async () => {
  try {
    result = await RefineSchema.validate(150);
  } catch (e) {
    result = e;
  }
});

// ============================================================================
// Run
// ============================================================================

console.log('\n🟡 Yup Competitor Benchmark\n');
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

console.log('\n✅ Yup benchmark complete!\n');
console.log('⚠️  Note: Yup is async by default, which adds overhead.');
console.log('   Direct comparison may not be entirely fair.\n');
