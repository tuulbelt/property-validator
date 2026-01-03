#!/usr/bin/env node --import tsx
/**
 * Compare the overhead between property-validator and valibot
 */

import { Bench } from 'tinybench';
import { v as pv } from '../src/index.ts';
import * as valibot from 'valibot';

// Simple schema
const pvSchema = pv.object({
  name: pv.string(),
  age: pv.number(),
  email: pv.string(),
});

const vbSchema = valibot.object({
  name: valibot.string(),
  age: valibot.number(),
  email: valibot.string(),
});

// Pre-compile both
const pvValidator = pvSchema;
const vbValidator = vbSchema;

// Test data
const validData = { name: 'Alice', age: 30, email: 'alice@example.com' };
const invalidData = { name: 123, age: 30, email: 'alice@example.com' };

const bench = new Bench({ time: 100 });
let result: any;

console.log('🔬 Overhead Comparison\n');
console.log('Comparing what happens during validation:\n');

// Property-validator - valid data
bench.add('pv: valid data', () => {
  result = pvValidator.validate(validData);
});

// Valibot - valid data
bench.add('vb: valid data', () => {
  result = valibot.safeParse(vbValidator, validData);
});

// Property-validator - invalid data (early rejection)
bench.add('pv: invalid data (early)', () => {
  result = pvValidator.validate(invalidData);
});

// Valibot - invalid data (early rejection)
bench.add('vb: invalid data (early)', () => {
  result = valibot.safeParse(vbValidator, invalidData);
});

await bench.warmup();
await bench.run();

console.table(bench.table());
console.log('\n');

// Analyze return values
console.log('='.repeat(60));
console.log('Return Value Analysis');
console.log('='.repeat(60));
console.log('\n');

console.log('Property-validator (valid):');
const pvValid = pvValidator.validate(validData);
console.log('  Type:', typeof pvValid);
console.log('  Value:', pvValid);
console.log('  Size:', JSON.stringify(pvValid).length, 'bytes');
console.log('');

console.log('Valibot (valid):');
const vbValid = valibot.safeParse(vbValidator, validData);
console.log('  Type:', typeof vbValid);
console.log('  Value:', JSON.stringify(vbValid, null, 2));
console.log('  Size:', JSON.stringify(vbValid).length, 'bytes');
console.log('');

console.log('Property-validator (invalid):');
const pvInvalid = pvValidator.validate(invalidData);
console.log('  Type:', typeof pvInvalid);
console.log('  Value:', pvInvalid);
console.log('  Size:', JSON.stringify(pvInvalid).length, 'bytes');
console.log('');

console.log('Valibot (invalid):');
const vbInvalid = valibot.safeParse(vbValidator, invalidData);
console.log('  Type:', typeof vbInvalid);
console.log('  Value:', JSON.stringify(vbInvalid, null, 2));
console.log('  Size:', JSON.stringify(vbInvalid).length, 'bytes');
console.log('');

console.log('='.repeat(60));
console.log('Key Differences');
console.log('='.repeat(60));
console.log('\n');

console.log('Property-validator:');
console.log('  ✅ Returns: boolean (true/false)');
console.log('  ✅ Size: 4-5 bytes');
console.log('  ✅ No object allocation on success');
console.log('  ⚠️  No error details');
console.log('');

console.log('Valibot:');
console.log('  ⚠️  Returns: { success, output?, issues? }');
console.log('  ⚠️  Size: 50-200+ bytes');
console.log('  ⚠️  Always allocates object');
console.log('  ✅ Detailed error information');
console.log('');

console.log('This explains the ~10x difference in performance:');
console.log('  1. Valibot allocates result object every call');
console.log('  2. Valibot builds error information (even on success)');
console.log('  3. Valibot has more complex validation pipeline');
console.log('  4. Property-validator returns primitive boolean (zero allocation)');
