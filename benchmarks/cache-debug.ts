#!/usr/bin/env node --import tsx
/**
 * Cache Debug - Verify cache is actually working
 */

import { readFileSync } from 'node:fs';
import { v, validate } from '../src/index.ts';

const smallTemplate = JSON.parse(readFileSync('./fixtures/small.json', 'utf8'));

const UsersListSchema = v.object({
  users: v.array(v.object({
    name: v.string(),
    age: v.number(),
    email: v.string(),
  })),
});

console.log('🔍 Cache Debug Test\n');

// Test 1: Same object reference (should hit cache)
console.log('Test 1: Validating same object 5 times...');
const sameObject = JSON.parse(JSON.stringify(smallTemplate));

const start1 = performance.now();
const r1 = validate(UsersListSchema, sameObject);
const time1 = performance.now() - start1;
console.log(`  Iteration 1: ${(time1 * 1000000).toFixed(2)} ns (should be slow - first validation)`);

const start2 = performance.now();
const r2 = validate(UsersListSchema, sameObject);
const time2 = performance.now() - start2;
console.log(`  Iteration 2: ${(time2 * 1000000).toFixed(2)} ns (should be FAST - cache hit)`);

const start3 = performance.now();
const r3 = validate(UsersListSchema, sameObject);
const time3 = performance.now() - start3;
console.log(`  Iteration 3: ${(time3 * 1000000).toFixed(2)} ns (should be FAST - cache hit)`);

console.log(`  Cache speedup: ${(time1 / time2).toFixed(2)}x faster on iteration 2\n`);

// Test 2: Different objects (should NOT hit cache)
console.log('Test 2: Validating 3 different objects...');
const obj1 = JSON.parse(JSON.stringify(smallTemplate));
const obj2 = JSON.parse(JSON.stringify(smallTemplate));
const obj3 = JSON.parse(JSON.stringify(smallTemplate));

const startA = performance.now();
validate(UsersListSchema, obj1);
const timeA = performance.now() - startA;
console.log(`  Object 1: ${(timeA * 1000000).toFixed(2)} ns (no cache - first time)`);

const startB = performance.now();
validate(UsersListSchema, obj2);
const timeB = performance.now() - startB;
console.log(`  Object 2: ${(timeB * 1000000).toFixed(2)} ns (no cache - different object)`);

const startC = performance.now();
validate(UsersListSchema, obj3);
const timeC = performance.now() - startC;
console.log(`  Object 3: ${(timeC * 1000000).toFixed(2)} ns (no cache - different object)\n`);

// Test 3: Rapid repeated validation (benchmark scenario)
console.log('Test 3: Rapid repeated validation (10,000 iterations)...');
const rapidObject = JSON.parse(JSON.stringify(smallTemplate));

const rapidStart = performance.now();
for (let i = 0; i < 10000; i++) {
  validate(UsersListSchema, rapidObject);
}
const rapidEnd = performance.now();
const rapidAvg = ((rapidEnd - rapidStart) / 10000) * 1000000;
console.log(`  Average per validation: ${rapidAvg.toFixed(2)} ns`);
console.log(`  Operations per second: ${(1000000000 / rapidAvg).toFixed(0)}\n`);

console.log('✅ Cache debug complete!');
