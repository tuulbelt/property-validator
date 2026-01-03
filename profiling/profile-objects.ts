#!/usr/bin/env npx tsx
/**
 * Profile simple object validation (1.8x slower than valibot)
 *
 * Tests both APIs with simple objects to identify overhead.
 *
 * Usage:
 *   node --prof --no-logfile-per-isolate profiling/profile-objects.ts
 *   node --prof-process isolate-*-v8.log > profiling/objects-profile.txt
 */

import { v, validate } from '../dist/index.js';

// Define simple object schema
const personSchema = v.object({
  name: v.string(),
  age: v.number(),
  active: v.boolean(),
});

// Test data
const testObjects = [
  { name: 'Alice', age: 30, active: true },
  { name: 'Bob', age: 25, active: false },
  { name: 'Charlie', age: 35, active: true },
  { name: 'Diana', age: 28, active: false },
  { name: 'Eve', age: 32, active: true },
];

// Warm up V8
console.log('Warming up V8...');
for (let i = 0; i < 10000; i++) {
  validate(personSchema, testObjects[i % 5]);
}

// Profile Normal API
console.log('\n=== Profiling Normal API: validate(schema, data) ===');
console.time('Normal API (50k iterations)');
for (let iter = 0; iter < 50000; iter++) {
  const result = validate(personSchema, testObjects[iter % 5]);
  if (!result.ok) {
    throw new Error('Validation failed unexpectedly');
  }
}
console.timeEnd('Normal API (50k iterations)');

// Profile Fast API
console.log('\n=== Profiling Fast API: schema.validate(data) ===');
console.time('Fast API (50k iterations)');
for (let iter = 0; iter < 50000; iter++) {
  const valid = personSchema.validate(testObjects[iter % 5]);
  if (!valid) {
    throw new Error('Validation failed unexpectedly');
  }
}
console.timeEnd('Fast API (50k iterations)');

console.log('\n✓ Profiling complete');
console.log('Generate report: node --prof-process isolate-*-v8.log > profiling/objects-profile.txt');
