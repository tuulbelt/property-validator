#!/usr/bin/env node --import tsx
/**
 * Fair Comparison Benchmark
 *
 * Honest apples-to-apples comparison between property-validator and zod.
 * Separates cached vs uncached scenarios.
 */

import { Bench } from 'tinybench';
import { readFileSync } from 'node:fs';
import { v, validate, compile } from '../src/index.ts';
import { z } from 'zod';

// ============================================================================
// Load Fixture Template (used to create fresh objects)
// ============================================================================

const smallTemplate = JSON.parse(readFileSync('./fixtures/small.json', 'utf8'));

// ============================================================================
// Schemas
// ============================================================================

const pvUserSchema = v.object({
  name: v.string(),
  age: v.number(),
  email: v.string(),
});

const pvUsersListSchema = v.object({
  users: v.array(pvUserSchema),
});

const zodUserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string(),
});

const zodUsersListSchema = z.object({
  users: z.array(zodUserSchema),
});

// Compiled validator (fair optimization - no cache)
const pvCompiledUsersList = compile(pvUsersListSchema);

// ============================================================================
// Benchmark Suite
// ============================================================================

const bench = new Bench({
  time: 100,
  warmupIterations: 5,
  warmupTime: 100,
});

let result: any;

// ============================================================================
// SCENARIO 1: Uncached (Fresh Objects) - FAIR COMPARISON
// ============================================================================

console.log('Preparing uncached benchmarks (fresh objects each iteration)...\n');

bench.add('pv: array[10] uncached (fresh object)', () => {
  // Create FRESH object each iteration (no cache benefit)
  const fresh = JSON.parse(JSON.stringify(smallTemplate));
  result = validate(pvUsersListSchema, fresh);
});

bench.add('zod: array[10] uncached (fresh object)', () => {
  // Create FRESH object each iteration (same as pv)
  const fresh = JSON.parse(JSON.stringify(smallTemplate));
  result = zodUsersListSchema.safeParse(fresh);
});

// ============================================================================
// SCENARIO 2: Compiled Validators - FAIR OPTIMIZATION
// ============================================================================

bench.add('pv: array[10] compiled (fresh object)', () => {
  const fresh = JSON.parse(JSON.stringify(smallTemplate));
  result = pvCompiledUsersList(fresh);
});

// ============================================================================
// SCENARIO 3: Cached (Same Object) - LABELED SCENARIO
// ============================================================================

console.log('Preparing cached benchmarks (same object reference)...\n');

// Single object reference reused
const cachedObject = JSON.parse(JSON.stringify(smallTemplate));

bench.add('pv: array[10] cached (same object repeated)', () => {
  result = validate(pvUsersListSchema, cachedObject);
});

bench.add('zod: array[10] cached (same object repeated)', () => {
  result = zodUsersListSchema.safeParse(cachedObject);
});

// ============================================================================
// Run Benchmarks
// ============================================================================

console.log('🔬 Fair Comparison Benchmark\n');
console.log('Running benchmarks (this may take a minute)...\n');

await bench.warmup();
await bench.run();

// ============================================================================
// Results with Context
// ============================================================================

console.log('\n📊 Honest Results:\n');
console.table(
  bench.tasks.map((task) => ({
    'Benchmark': task.name,
    'ops/sec': task.result?.hz ? task.result.hz.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 'N/A',
    'Average (ns)': task.result?.mean ? (task.result.mean * 1_000_000).toFixed(2) : 'N/A',
    'Margin': task.result?.rme ? `±${task.result.rme.toFixed(2)}%` : 'N/A',
  }))
);

// Calculate honest comparisons
const tasks = bench.tasks;
const pvUncached = tasks.find(t => t.name.includes('pv: array[10] uncached'));
const zodUncached = tasks.find(t => t.name.includes('zod: array[10] uncached'));
const pvCompiled = tasks.find(t => t.name.includes('pv: array[10] compiled'));
const pvCached = tasks.find(t => t.name.includes('pv: array[10] cached (same'));
const zodCached = tasks.find(t => t.name.includes('zod: array[10] cached (same'));

console.log('\n📝 Honest Analysis:\n');

if (pvUncached?.result?.hz && zodUncached?.result?.hz) {
  const uncachedRatio = pvUncached.result.hz / zodUncached.result.hz;
  console.log(`🔹 UNCACHED (Fair Comparison):`);
  console.log(`   property-validator: ${pvUncached.result.hz.toFixed(0)} ops/sec`);
  console.log(`   zod: ${zodUncached.result.hz.toFixed(0)} ops/sec`);
  console.log(`   Ratio: ${uncachedRatio.toFixed(2)}x ${uncachedRatio > 1 ? 'faster' : 'slower'}`);
  console.log(`   ℹ️  This measures full validation performance (no caching)`);
  console.log('');
}

if (pvCompiled?.result?.hz && zodUncached?.result?.hz) {
  const compiledRatio = pvCompiled.result.hz / zodUncached.result.hz;
  console.log(`🔹 COMPILED VALIDATORS (Fair Optimization):`);
  console.log(`   property-validator (compiled): ${pvCompiled.result.hz.toFixed(0)} ops/sec`);
  console.log(`   zod: ${zodUncached.result.hz.toFixed(0)} ops/sec`);
  console.log(`   Ratio: ${compiledRatio.toFixed(2)}x faster`);
  console.log(`   ℹ️  compile() generates optimized validators (no cache)`);
  console.log('');
}

if (pvCached?.result?.hz && zodCached?.result?.hz) {
  const cachedRatio = pvCached.result.hz / zodCached.result.hz;
  console.log(`🔹 CACHED (Repeated Validation of Same Instance):`);
  console.log(`   property-validator (cached): ${pvCached.result.hz.toFixed(0)} ops/sec`);
  console.log(`   zod (no cache): ${zodCached.result.hz.toFixed(0)} ops/sec`);
  console.log(`   Ratio: ${cachedRatio.toFixed(2)}x faster`);
  console.log(`   ⚠️  This only applies when validating THE SAME object reference repeatedly`);
  console.log(`   ⚠️  Real-world usually validates different objects with same structure`);
  console.log('');
}

console.log('✅ Honest benchmark complete!\n');
console.log('Summary:');
console.log('- Uncached: Fair apples-to-apples comparison');
console.log('- Compiled: Fair optimization (no unfair caching)');
console.log('- Cached: Only useful for specific scenarios (same object instance)\n');
