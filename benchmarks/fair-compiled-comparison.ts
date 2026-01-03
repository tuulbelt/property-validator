#!/usr/bin/env node --import tsx
/**
 * Fair comparison: Pre-compiled validators (apples-to-apples)
 *
 * Both libraries pre-compile their schemas ONCE, then we measure
 * pure validation performance without compilation overhead.
 */

import { Bench } from 'tinybench';
import { v as pv } from '../src/index.ts';
import * as valibot from 'valibot';

// Test data
const userArraySmall = Array(10).fill({ name: 'Alice', age: 30, email: 'alice@example.com' });
const userArrayMedium = Array(100).fill({ name: 'Bob', age: 25, email: 'bob@example.com' });
const userArrayLarge = Array(1000).fill({ name: 'Charlie', age: 35, email: 'charlie@example.com' });

// Property-validator: Pre-compile schema
const pvUserSchema = pv.object({
  name: pv.string(),
  age: pv.number(),
  email: pv.string(),
});
const pvArrayValidator = pv.array(pvUserSchema);

// Valibot: Pre-compile schema
const vbUserSchema = valibot.object({
  name: valibot.string(),
  age: valibot.number(),
  email: valibot.string(),
});
const vbArraySchema = valibot.array(vbUserSchema);

const bench = new Bench({ time: 100 });
let result: any;

// Property-validator benchmarks (pre-compiled)
bench.add('pv: array small (10 items) - PRE-COMPILED', () => {
  result = pvArrayValidator.validate(userArraySmall);
});

bench.add('pv: array medium (100 items) - PRE-COMPILED', () => {
  result = pvArrayValidator.validate(userArrayMedium);
});

bench.add('pv: array large (1000 items) - PRE-COMPILED', () => {
  result = pvArrayValidator.validate(userArrayLarge);
});

// Valibot benchmarks (pre-compiled)
bench.add('vb: array small (10 items) - PRE-COMPILED', () => {
  result = valibot.safeParse(vbArraySchema, userArraySmall);
});

bench.add('vb: array medium (100 items) - PRE-COMPILED', () => {
  result = valibot.safeParse(vbArraySchema, userArrayMedium);
});

bench.add('vb: array large (1000 items) - PRE-COMPILED', () => {
  result = valibot.safeParse(vbArraySchema, userArrayLarge);
});

console.log('🔥 Fair Compiled Comparison\n');
console.log('Testing PRE-COMPILED validators (no schema creation overhead)...\n');

await bench.warmup();
await bench.run();

console.log('\n📊 Results:\n');
console.table(bench.table());
console.log('\n✅ Test complete!\n');
