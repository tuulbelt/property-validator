#!/usr/bin/env node --import tsx
/**
 * Honest Benchmark - Cache Disabled
 *
 * Most fair comparison: Same object, but cache disabled for pv.
 * This measures pure validation performance without any caching tricks.
 */

import { Bench } from 'tinybench';
import { readFileSync } from 'node:fs';
import { v, validate, compile } from '../src/index.ts';
import { z } from 'zod';

// ============================================================================
// Fixture - Single object reused (no JSON overhead)
// ============================================================================

const small = JSON.parse(readFileSync('./fixtures/small.json', 'utf8'));

// ============================================================================
// Schemas
// ============================================================================

const pvUsersListSchema = v.object({
  users: v.array(v.object({
    name: v.string(),
    age: v.number(),
    email: v.string(),
  })),
});

const zodUsersListSchema = z.object({
  users: z.array(z.object({
    name: z.string(),
    age: z.number(),
    email: z.string(),
  })),
});

const pvCompiledSchema = compile(pvUsersListSchema);

// ============================================================================
// Benchmark Suite
// ============================================================================

const bench = new Bench({
  time: 100,
  warmupIterations: 5,
  warmupTime: 100,
});

let result: any;

// pv with cache enabled (default)
bench.add('pv: array[10] with cache', () => {
  result = validate(pvUsersListSchema, small);
});

// pv with cache explicitly disabled
bench.add('pv: array[10] cache disabled', () => {
  result = validate(pvUsersListSchema, small, { skipCache: true });
});

// pv compiled (no cache, but optimized)
bench.add('pv: array[10] compiled', () => {
  result = pvCompiledSchema(small);
});

// zod (no cache)
bench.add('zod: array[10] no cache', () => {
  result = zodUsersListSchema.safeParse(small);
});

// ============================================================================
// Run
// ============================================================================

console.log('🎯 Honest Benchmark (Cache Disabled)\n');
console.log('All tests use the SAME object (no JSON overhead)');
console.log('Cache disabled for fair comparison\n');

await bench.warmup();
await bench.run();

console.log('\n📊 Results:\n');
console.table(
  bench.tasks.map((task) => ({
    'Benchmark': task.name,
    'ops/sec': task.result?.hz ? task.result.hz.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 'N/A',
    'Average (ns)': task.result?.mean ? (task.result.mean * 1_000_000).toFixed(2) : 'N/A',
    'Margin': task.result?.rme ? `±${task.result.rme.toFixed(2)}%` : 'N/A',
  }))
);

// Analysis
const tasks = bench.tasks;
const pvCached = tasks.find(t => t.name.includes('with cache'));
const pvNoCacheTask = tasks.find(t => t.name.includes('cache disabled'));
const pvCompiled = tasks.find(t => t.name.includes('compiled'));
const zodTask = tasks.find(t => t.name.includes('zod'));

console.log('\n📝 Honest Analysis:\n');

if (pvNoCacheTask?.result?.hz && zodTask?.result?.hz) {
  const ratio = pvNoCacheTask.result.hz / zodTask.result.hz;
  console.log(`🔹 FAIR COMPARISON (no cache, same object):`);
  console.log(`   property-validator: ${pvNoCacheTask.result.hz.toFixed(0)} ops/sec`);
  console.log(`   zod: ${zodTask.result.hz.toFixed(0)} ops/sec`);
  if (ratio >= 1) {
    console.log(`   Result: property-validator is ${ratio.toFixed(2)}x FASTER`);
  } else {
    console.log(`   Result: property-validator is ${(1/ratio).toFixed(2)}x SLOWER`);
  }
  console.log('');
}

if (pvCached?.result?.hz && pvNoCacheTask?.result?.hz) {
  const cacheSpeedup = pvCached.result.hz / pvNoCacheTask.result.hz;
  console.log(`🔹 CACHE BENEFIT:`);
  console.log(`   With cache: ${pvCached.result.hz.toFixed(0)} ops/sec`);
  console.log(`   Without cache: ${pvNoCacheTask.result.hz.toFixed(0)} ops/sec`);
  console.log(`   Speedup: ${cacheSpeedup.toFixed(2)}x`);
  console.log(`   ⚠️  Only applies when validating same object instance repeatedly`);
  console.log('');
}

if (pvCompiled?.result?.hz && zodTask?.result?.hz) {
  const compiledRatio = pvCompiled.result.hz / zodTask.result.hz;
  console.log(`🔹 COMPILED OPTIMIZATION:`);
  console.log(`   property-validator (compiled): ${pvCompiled.result.hz.toFixed(0)} ops/sec`);
  console.log(`   zod: ${zodTask.result.hz.toFixed(0)} ops/sec`);
  if (compiledRatio >= 1) {
    console.log(`   Result: compiled is ${compiledRatio.toFixed(2)}x FASTER than zod`);
  } else {
    console.log(`   Result: compiled is ${(1/compiledRatio).toFixed(2)}x SLOWER than zod`);
  }
  console.log('');
}

console.log('✅ Honest benchmark complete!\n');
