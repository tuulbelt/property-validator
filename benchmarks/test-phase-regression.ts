#!/usr/bin/env node --import tsx
/**
 * Focused benchmark to isolate Phase 2 regression
 * Tests direct array of objects validation (apples-to-apples with competitors)
 */

import { Bench } from 'tinybench';
import { v } from '../src/index.ts';

// Schema
const UserSchema = v.object({
  name: v.string(),
  age: v.number(),
  email: v.string(),
});

// Direct arrays (same as competitor benchmarks)
const userArraySmall = Array(10).fill({ name: 'Alice', age: 30, email: 'alice@example.com' });
const userArrayMedium = Array(100).fill({ name: 'Bob', age: 25, email: 'bob@example.com' });
const userArrayLarge = Array(1000).fill({ name: 'Charlie', age: 35, email: 'charlie@example.com' });

const bench = new Bench({ time: 100 });
let result: any;

// Test compiled validator (same as what valibot/zod use)
const arrayValidator = v.array(UserSchema);

bench.add('array OBJECTS small (10 items)', () => {
  result = arrayValidator.validate(userArraySmall);
});

bench.add('array OBJECTS medium (100 items)', () => {
  result = arrayValidator.validate(userArrayMedium);
});

bench.add('array OBJECTS large (1000 items)', () => {
  result = arrayValidator.validate(userArrayLarge);
});

console.log('🔥 Phase Regression Test\n');
console.log('Testing compiled array validation (direct arrays)...\n');

await bench.warmup();
await bench.run();

console.log('\n📊 Results:\n');
console.table(bench.table());
console.log('\n✅ Test complete!\n');
