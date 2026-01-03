#!/usr/bin/env node --import tsx
/**
 * Measure JSON.parse(JSON.stringify()) overhead
 */

import { readFileSync } from 'node:fs';

const smallTemplate = JSON.parse(readFileSync('./fixtures/small.json', 'utf8'));

console.log('📏 Measuring JSON serialization overhead\n');

// Test: How much overhead does JSON.parse(JSON.stringify()) add?
const iterations = 10000;

const start = performance.now();
for (let i = 0; i < iterations; i++) {
  const fresh = JSON.parse(JSON.stringify(smallTemplate));
}
const end = performance.now();

const avgTime = ((end - start) / iterations) * 1000000; // nanoseconds
const opsPerSec = 1000000000 / avgTime;

console.log(`Average time per JSON.parse(JSON.stringify()): ${avgTime.toFixed(2)} ns`);
console.log(`Operations per second: ${opsPerSec.toFixed(0)}`);
console.log(`\nThis overhead is added to EVERY iteration in "uncached" benchmarks,`);
console.log(`making them measure JSON performance rather than validation performance.\n`);
