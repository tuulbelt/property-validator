#!/usr/bin/env npx tsx
/**
 * Profile object array validation - our worst bottleneck (4.2x slower than valibot)
 *
 * This script profiles both APIs:
 * 1. Normal API: validate(schema, data) - with error details
 * 2. Fast API: schema.validate(data) - boolean only
 *
 * Usage:
 *   node --prof --no-logfile-per-isolate profiling/profile-object-arrays.ts
 *   node --prof-process isolate-*-v8.log > profiling/object-arrays-profile.txt
 */

import { v, validate } from '../dist/index.js';

// Define object schema
const userSchema = v.object({
  name: v.string(),
  age: v.number(),
  email: v.string(),
});

// Create test data (100 valid objects)
const testData: any[] = [];
for (let i = 0; i < 100; i++) {
  testData.push({
    name: `User ${i}`,
    age: 20 + (i % 50),
    email: `user${i}@example.com`,
  });
}

// Warm up V8
console.log('Warming up V8...');
for (let i = 0; i < 1000; i++) {
  const result = validate(userSchema, testData[0]);
}

// Profile Normal API (with error details)
console.log('\n=== Profiling Normal API: validate(schema, data) ===');
console.time('Normal API (100 iterations)');
for (let iter = 0; iter < 100; iter++) {
  for (let i = 0; i < testData.length; i++) {
    const result = validate(userSchema, testData[i]);
    if (!result.ok) {
      throw new Error('Validation failed unexpectedly');
    }
  }
}
console.timeEnd('Normal API (100 iterations)');

// Profile Fast API (boolean only)
console.log('\n=== Profiling Fast API: schema.validate(data) ===');
console.time('Fast API (100 iterations)');
for (let iter = 0; iter < 100; iter++) {
  for (let i = 0; i < testData.length; i++) {
    const valid = userSchema.validate(testData[i]);
    if (!valid) {
      throw new Error('Validation failed unexpectedly');
    }
  }
}
console.timeEnd('Fast API (100 iterations)');

console.log('\n✓ Profiling complete');
console.log('Generate report: node --prof-process isolate-*-v8.log > profiling/object-arrays-profile.txt');
