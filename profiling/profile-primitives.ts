#!/usr/bin/env npx tsx
/**
 * Profile primitive validation (1.9x slower than valibot)
 *
 * Tests both APIs with simple primitives to identify overhead.
 *
 * Usage:
 *   node --prof --no-logfile-per-isolate profiling/profile-primitives.ts
 *   node --prof-process isolate-*-v8.log > profiling/primitives-profile.txt
 */

import { v, validate } from '../dist/index.js';

// Define primitive schemas
const stringSchema = v.string();
const numberSchema = v.number();
const booleanSchema = v.boolean();

// Test data
const testStrings = ['hello', 'world', 'test', 'data', 'value'];
const testNumbers = [1, 2, 3, 4, 5, 42, 100, 999];
const testBooleans = [true, false, true, false, true];

// Warm up V8
console.log('Warming up V8...');
for (let i = 0; i < 10000; i++) {
  validate(stringSchema, 'test');
  validate(numberSchema, 42);
  validate(booleanSchema, true);
}

// Profile Normal API
console.log('\n=== Profiling Normal API: validate(schema, data) ===');
console.time('Normal API (100k iterations)');
for (let iter = 0; iter < 100000; iter++) {
  const idx = iter % 5;
  const s = validate(stringSchema, testStrings[idx]);
  const n = validate(numberSchema, testNumbers[idx % 8]);
  const b = validate(booleanSchema, testBooleans[idx]);

  if (!s.ok || !n.ok || !b.ok) {
    throw new Error('Validation failed unexpectedly');
  }
}
console.timeEnd('Normal API (100k iterations)');

// Profile Fast API
console.log('\n=== Profiling Fast API: schema.validate(data) ===');
console.time('Fast API (100k iterations)');
for (let iter = 0; iter < 100000; iter++) {
  const idx = iter % 5;
  const s = stringSchema.validate(testStrings[idx]);
  const n = numberSchema.validate(testNumbers[idx % 8]);
  const b = booleanSchema.validate(testBooleans[idx]);

  if (!s || !n || !b) {
    throw new Error('Validation failed unexpectedly');
  }
}
console.timeEnd('Fast API (100k iterations)');

console.log('\n✓ Profiling complete');
console.log('Generate report: node --prof-process isolate-*-v8.log > profiling/primitives-profile.txt');
