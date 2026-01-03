#!/usr/bin/env node
/**
 * Profile primitive array validation (2.9x slower than valibot)
 *
 * Tests both APIs with string arrays to identify bottlenecks.
 *
 * Usage:
 *   node --prof --no-logfile-per-isolate profiling/profile-primitive-arrays.js
 *   node --prof-process isolate-*-v8.log > profiling/primitive-arrays-profile.txt
 */

import { v, validate } from '../dist/index.js';

// Define primitive array schema
const stringArraySchema = v.array(v.string());

// Create test data (1000 strings)
const testData = [];
for (let i = 0; i < 1000; i++) {
  testData.push(`string-${i}`);
}

// Warm up V8
console.log('Warming up V8...');
for (let i = 0; i < 100; i++) {
  const result = validate(stringArraySchema, testData);
}

// Profile Normal API
console.log('\n=== Profiling Normal API: validate(schema, data) ===');
console.time('Normal API (1000 iterations)');
for (let iter = 0; iter < 1000; iter++) {
  const result = validate(stringArraySchema, testData);
  if (!result.ok) {
    throw new Error('Validation failed unexpectedly');
  }
}
console.timeEnd('Normal API (1000 iterations)');

// Profile Fast API
console.log('\n=== Profiling Fast API: schema.validate(data) ===');
console.time('Fast API (1000 iterations)');
for (let iter = 0; iter < 1000; iter++) {
  const valid = stringArraySchema.validate(testData);
  if (!valid) {
    throw new Error('Validation failed unexpectedly');
  }
}
console.timeEnd('Fast API (1000 iterations)');

console.log('\n✓ Profiling complete');
console.log('Generate report: node --prof-process isolate-*-v8.log > profiling/primitive-arrays-profile.txt');
