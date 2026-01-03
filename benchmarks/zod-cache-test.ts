#!/usr/bin/env node --import tsx
/**
 * Test if zod caches validation results
 */

import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string(),
});

const UsersListSchema = z.object({
  users: z.array(UserSchema),
});

const testData = {
  users: Array.from({ length: 10 }, (_, i) => ({
    name: `User${i}`,
    age: 20 + i,
    email: `user${i}@example.com`,
  })),
};

console.log('🔍 Testing if Zod caches validation results\n');

// Test: Same object reference
console.log('Test 1: Same object reference (10 iterations)');
const times: number[] = [];
for (let i = 0; i < 10; i++) {
  const start = performance.now();
  const result = UsersListSchema.safeParse(testData);
  const time = performance.now() - start;
  times.push(time * 1_000_000); // Convert to nanoseconds
  console.log(`  Iteration ${i + 1}: ${(time * 1_000_000).toFixed(2)} ns`);
}

const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
const firstTime = times[0]!;
const lastTime = times[times.length - 1]!;
console.log(`\n  Average: ${avgTime.toFixed(2)} ns`);
console.log(`  First vs Last: ${(firstTime / lastTime).toFixed(2)}x difference`);

if (firstTime / lastTime > 3) {
  console.log(`  ⚠️  Significant speedup detected - could be JIT warmup or caching\n`);
} else {
  console.log(`  ✓ Consistent performance - no caching detected\n`);
}

// Test 2: Rapid iterations (like benchmark)
console.log('Test 2: Rapid iterations (10,000 validations of same object)');
const rapidStart = performance.now();
for (let i = 0; i < 10000; i++) {
  UsersListSchema.safeParse(testData);
}
const rapidEnd = performance.now();
const rapidAvg = ((rapidEnd - rapidStart) / 10000) * 1_000_000;
console.log(`  Average per validation: ${rapidAvg.toFixed(2)} ns`);
console.log(`  Operations per second: ${(1_000_000_000 / rapidAvg).toFixed(0)}\n`);

// Test 3: Different objects with same structure
console.log('Test 3: Different objects, same structure (10 validations)');
const diffTimes: number[] = [];
for (let i = 0; i < 10; i++) {
  // Create DIFFERENT object each time (deep clone via JSON)
  const freshData = JSON.parse(JSON.stringify(testData));
  const start = performance.now();
  const result = UsersListSchema.safeParse(freshData);
  const time = performance.now() - start;
  diffTimes.push(time * 1_000_000);
  console.log(`  Iteration ${i + 1}: ${(time * 1_000_000).toFixed(2)} ns`);
}

const avgDiffTime = diffTimes.reduce((a, b) => a + b, 0) / diffTimes.length;
console.log(`\n  Average: ${avgDiffTime.toFixed(2)} ns`);

// Compare
console.log('\n📊 Comparison:');
console.log(`  Same object (after warmup): ${lastTime.toFixed(2)} ns`);
console.log(`  Different objects: ${avgDiffTime.toFixed(2)} ns`);
console.log(`  Difference: ${(avgDiffTime / lastTime).toFixed(2)}x`);

if (Math.abs(avgDiffTime - lastTime) < lastTime * 0.2) {
  console.log('\n✅ No result caching detected in Zod');
  console.log('   (Same object vs different objects have similar performance)');
} else if (lastTime < avgDiffTime * 0.5) {
  console.log('\n⚠️  POSSIBLE result caching in Zod!');
  console.log('   (Same object is significantly faster than different objects)');
} else {
  console.log('\n❓ Inconclusive - differences may be due to JIT or allocation overhead');
}
