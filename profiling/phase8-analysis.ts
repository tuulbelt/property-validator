/**
 * Phase 8 Analysis: Compare current implementation paths
 *
 * Goal: Understand where performance gaps exist in current v0.7.5
 */

import { v, validate } from '../src/index.js';

// ============================================================================
// Setup: Same schemas used in benchmarks
// ============================================================================

const simpleObjectValidator = v.object({
  name: v.string(),
  age: v.number()
});

const validSimpleObject = { name: 'Alice', age: 30 };

// Direct JIT prototype (from research)
function createDirectJIT() {
  const code = `
    if (typeof data !== 'object' || data === null) return false;
    if (typeof data.name !== 'string') return false;
    if (typeof data.age !== 'number' || Number.isNaN(data.age)) return false;
    return true;
  `;
  return new Function('data', code) as (data: unknown) => boolean;
}

const directJIT = createDirectJIT();

// ============================================================================
// Warmup
// ============================================================================

for (let i = 0; i < 10000; i++) {
  // Current API paths
  validate(simpleObjectValidator, validSimpleObject);
  simpleObjectValidator.validate(validSimpleObject);

  // Direct JIT
  directJIT(validSimpleObject);
}

// ============================================================================
// Benchmark function
// ============================================================================

const ITERATIONS = 1_000_000;

function benchmark(name: string, fn: () => unknown): void {
  const start = performance.now();
  let result: unknown;
  for (let i = 0; i < ITERATIONS; i++) {
    result = fn();
  }
  const end = performance.now();
  const totalMs = end - start;
  const nsPerOp = (totalMs * 1_000_000) / ITERATIONS;
  const opsPerSec = ITERATIONS / (totalMs / 1000);
  console.log(`${name.padEnd(45)} ${nsPerOp.toFixed(2).padStart(10)} ns/op  ${(opsPerSec / 1_000_000).toFixed(2).padStart(6)}M ops/sec`);
  // Prevent DCE
  if (result === Symbol()) console.log('never');
}

// ============================================================================
// Analysis
// ============================================================================

console.log('=== Phase 8 Analysis: Current Implementation Paths ===\n');
console.log(`Iterations: ${ITERATIONS.toLocaleString()}\n`);

console.log('--- Path Comparison ---');
console.log('');
console.log('API Path 1: validate(validator, data)');
console.log('  → validateFast() → validateWithPath() → Phase 6 fast path');
benchmark('  validate(objectValidator, data)', () => validate(simpleObjectValidator, validSimpleObject));

console.log('');
console.log('API Path 2: validator.validate(data)');
console.log('  → createValidator closure → Object.entries().every() → validate() per property');
benchmark('  objectValidator.validate(data)', () => simpleObjectValidator.validate(validSimpleObject));

console.log('');
console.log('Direct JIT (research prototype):');
console.log('  → Single JIT function call with inline checks');
benchmark('  directJIT(data)', () => directJIT(validSimpleObject));

// ============================================================================
// Findings
// ============================================================================

console.log('\n=== Findings ===\n');
console.log('If validate() is close to directJIT: Phase 6 optimization is working.');
console.log('If .validate() is much slower: The validator.validate method is the bottleneck.');
console.log('');
console.log('Key insight: Phase 6 fast path uses compiledValidator(data) directly,');
console.log('but .validate() method goes through closure-based Object.entries().every().');
