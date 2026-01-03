/**
 * Performance Benchmarks for Property Validator
 *
 * Measures performance of validators with and without optimizations.
 * Run with: npx tsx benchmarks/performance.bench.ts
 */

import { validate, v } from '../src/index.ts';

// Benchmark configuration
const ITERATIONS = 100_000;
const WARMUP_ITERATIONS = 1_000;

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  opsPerSec: number;
}

function benchmark(name: string, fn: () => void, iterations: number = ITERATIONS): BenchmarkResult {
  // Warmup
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    fn();
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Actual benchmark
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();

  const totalMs = end - start;
  const avgMs = totalMs / iterations;
  const opsPerSec = (iterations / totalMs) * 1000;

  return {
    name,
    iterations,
    totalMs,
    avgMs,
    opsPerSec,
  };
}

function printResults(results: BenchmarkResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log('BENCHMARK RESULTS');
  console.log('='.repeat(80) + '\n');

  const maxNameLength = Math.max(...results.map(r => r.name.length));

  for (const result of results) {
    const name = result.name.padEnd(maxNameLength);
    const ops = result.opsPerSec.toLocaleString('en-US', { maximumFractionDigits: 0 });
    const avg = (result.avgMs * 1_000_000).toFixed(2); // Convert to nanoseconds

    console.log(`${name}  ${ops.padStart(15)} ops/sec  (${avg.padStart(10)} ns/op)`);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

function compareResults(baseline: BenchmarkResult, optimized: BenchmarkResult) {
  const speedup = optimized.opsPerSec / baseline.opsPerSec;
  const improvement = ((speedup - 1) * 100).toFixed(1);

  console.log(`Speedup: ${speedup.toFixed(2)}x (${improvement}% faster)`);
}

// ============================================================================
// Primitive Validators
// ============================================================================

console.log('\n📊 Benchmarking Primitive Validators...\n');

const primitiveResults: BenchmarkResult[] = [];

// String validator
const StringValidator = v.string();
primitiveResults.push(
  benchmark('v.string()', () => {
    validate(StringValidator, 'hello');
  })
);

// Number validator
const NumberValidator = v.number();
primitiveResults.push(
  benchmark('v.number()', () => {
    validate(NumberValidator, 42);
  })
);

// Boolean validator
const BooleanValidator = v.boolean();
primitiveResults.push(
  benchmark('v.boolean()', () => {
    validate(BooleanValidator, true);
  })
);

printResults(primitiveResults);

// ============================================================================
// Object Validators
// ============================================================================

console.log('\n📊 Benchmarking Object Validators...\n');

const objectResults: BenchmarkResult[] = [];

// Simple object (3 fields)
const SimpleUser = v.object({
  name: v.string(),
  age: v.number(),
  active: v.boolean(),
});

const simpleUserData = { name: 'Alice', age: 30, active: true };

objectResults.push(
  benchmark('Simple object (3 fields)', () => {
    validate(SimpleUser, simpleUserData);
  })
);

// Medium object (10 fields)
const MediumUser = v.object({
  id: v.string(),
  name: v.string(),
  email: v.string(),
  age: v.number(),
  active: v.boolean(),
  role: v.string(),
  department: v.string(),
  salary: v.number(),
  startDate: v.string(),
  manager: v.string(),
});

const mediumUserData = {
  id: 'u123',
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
  active: true,
  role: 'Engineer',
  department: 'Engineering',
  salary: 100000,
  startDate: '2020-01-01',
  manager: 'Bob',
};

objectResults.push(
  benchmark('Medium object (10 fields)', () => {
    validate(MediumUser, mediumUserData);
  })
);

// Nested object
const NestedUser = v.object({
  name: v.string(),
  profile: v.object({
    bio: v.string(),
    location: v.string(),
  }),
});

const nestedUserData = {
  name: 'Alice',
  profile: {
    bio: 'Software engineer',
    location: 'San Francisco',
  },
};

objectResults.push(
  benchmark('Nested object (2 levels)', () => {
    validate(NestedUser, nestedUserData);
  })
);

printResults(objectResults);

// ============================================================================
// Array Validators
// ============================================================================

console.log('\n📊 Benchmarking Array Validators...\n');

const arrayResults: BenchmarkResult[] = [];

// Small array
const NumberArray = v.array(v.number());
const smallArray = [1, 2, 3, 4, 5];

arrayResults.push(
  benchmark('Array of numbers (5 items)', () => {
    validate(NumberArray, smallArray);
  })
);

// Medium array
const mediumArray = Array.from({ length: 100 }, (_, i) => i);

arrayResults.push(
  benchmark('Array of numbers (100 items)', () => {
    validate(NumberArray, mediumArray);
  })
);

// Large array
const largeArray = Array.from({ length: 1000 }, (_, i) => i);

arrayResults.push(
  benchmark('Array of numbers (1000 items)', () => {
    validate(NumberArray, largeArray);
  })
);

// Array of objects
const UserArray = v.array(SimpleUser);
const userArray = [
  { name: 'Alice', age: 30, active: true },
  { name: 'Bob', age: 25, active: false },
  { name: 'Charlie', age: 35, active: true },
];

arrayResults.push(
  benchmark('Array of objects (3 items)', () => {
    validate(UserArray, userArray);
  })
);

printResults(arrayResults);

// ============================================================================
// Compiled Validators
// ============================================================================

console.log('\n📊 Benchmarking Compiled Validators...\n');

const compiledResults: BenchmarkResult[] = [];

// String: compiled vs non-compiled
const validateStringCompiled = v.compile(StringValidator);

const nonCompiledString = benchmark('String (non-compiled)', () => {
  validate(StringValidator, 'hello');
});

const compiledString = benchmark('String (compiled)', () => {
  validateStringCompiled('hello');
});

compiledResults.push(nonCompiledString);
compiledResults.push(compiledString);

console.log('\nString validation:');
compareResults(nonCompiledString, compiledString);

// Object: compiled vs non-compiled
const validateUserCompiled = v.compile(SimpleUser);

const nonCompiledUser = benchmark('Object (non-compiled)', () => {
  validate(SimpleUser, simpleUserData);
});

const compiledUser = benchmark('Object (compiled)', () => {
  validateUserCompiled(simpleUserData);
});

compiledResults.push(nonCompiledUser);
compiledResults.push(compiledUser);

console.log('\nObject validation:');
compareResults(nonCompiledUser, compiledUser);

printResults(compiledResults);

// ============================================================================
// Optional & Transform Validators
// ============================================================================

console.log('\n📊 Benchmarking Optional & Transform Validators...\n');

const optionalResults: BenchmarkResult[] = [];

// Optional string
const OptionalString = v.string().optional();

optionalResults.push(
  benchmark('Optional string (present)', () => {
    validate(OptionalString, 'hello');
  })
);

optionalResults.push(
  benchmark('Optional string (undefined)', () => {
    validate(OptionalString, undefined);
  })
);

// Transform
const TransformString = v.string().transform((s) => s.toUpperCase());

optionalResults.push(
  benchmark('String with transform', () => {
    validate(TransformString, 'hello');
  })
);

// Default value
const DefaultNumber = v.number().default(42);

optionalResults.push(
  benchmark('Number with default', () => {
    validate(DefaultNumber, undefined);
  })
);

printResults(optionalResults);

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('BENCHMARK SUMMARY');
console.log('='.repeat(80) + '\n');

const allResults = [
  ...primitiveResults,
  ...objectResults,
  ...arrayResults,
  ...compiledResults,
  ...optionalResults,
];

// Find fastest and slowest
const fastest = allResults.reduce((a, b) => (a.opsPerSec > b.opsPerSec ? a : b));
const slowest = allResults.reduce((a, b) => (a.opsPerSec < b.opsPerSec ? a : b));

console.log(`Fastest: ${fastest.name} (${fastest.opsPerSec.toLocaleString()} ops/sec)`);
console.log(`Slowest: ${slowest.name} (${slowest.opsPerSec.toLocaleString()} ops/sec)`);
console.log(
  `Range: ${(fastest.opsPerSec / slowest.opsPerSec).toFixed(1)}x difference`
);

console.log('\n' + '='.repeat(80) + '\n');

console.log('💡 Performance Tips:');
console.log('   - Use v.compile() for validators used in hot paths');
console.log('   - Primitives are fastest, use them when possible');
console.log('   - Array validation cost scales linearly with size');
console.log('   - Object validation cost scales with field count');
console.log('');
