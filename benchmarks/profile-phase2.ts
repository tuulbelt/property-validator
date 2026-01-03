#!/usr/bin/env node --import tsx
/**
 * Profiling script for Phase 2 investigation
 *
 * This isolates array of objects validation to profile V8 behavior
 */

import { v } from '../src/index.ts';

// Schema (same as benchmarks)
const UserSchema = v.object({
  name: v.string(),
  age: v.number(),
  email: v.string(),
});

// Test data - arrays of user objects
const userArraySmall = Array(10).fill({ name: 'Alice', age: 30, email: 'alice@example.com' });
const userArrayMedium = Array(100).fill({ name: 'Bob', age: 25, email: 'bob@example.com' });
const userArrayLarge = Array(1000).fill({ name: 'Charlie', age: 35, email: 'charlie@example.com' });

// Compiled validators (pre-compile before profiling)
const arraySmallValidator = v.array(UserSchema);
const arrayMediumValidator = v.array(UserSchema);
const arrayLargeValidator = v.array(UserSchema);

// Warmup (let JIT compile)
console.log('Warming up...');
for (let i = 0; i < 1000; i++) {
  arraySmallValidator.validate(userArraySmall);
  arrayMediumValidator.validate(userArrayMedium);
  arrayLargeValidator.validate(userArrayLarge);
}

console.log('Starting profiling run...');
console.log('Run this with: node --prof benchmarks/profile-phase2.ts');
console.log('');

// Main profiling loop (100,000 iterations to get significant profile data)
const iterations = 100_000;
let result;

console.time('Small arrays (10 items)');
for (let i = 0; i < iterations; i++) {
  result = arraySmallValidator.validate(userArraySmall);
}
console.timeEnd('Small arrays (10 items)');

console.time('Medium arrays (100 items)');
for (let i = 0; i < iterations / 10; i++) {  // Fewer iterations for larger arrays
  result = arrayMediumValidator.validate(userArrayMedium);
}
console.timeEnd('Medium arrays (100 items)');

console.time('Large arrays (1000 items)');
for (let i = 0; i < iterations / 100; i++) {  // Even fewer for large
  result = arrayLargeValidator.validate(userArrayLarge);
}
console.timeEnd('Large arrays (1000 items)');

console.log('');
console.log('Profiling complete. Analyze with:');
console.log('  node --prof-process isolate-*.log > profile.txt');
console.log('  cat profile.txt | head -100');
