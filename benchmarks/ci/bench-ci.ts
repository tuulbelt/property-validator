#!/usr/bin/env node --import tsx
/**
 * CI Benchmark Script
 *
 * Outputs JSON benchmark results for CI regression detection.
 * Results can be compared against baselines to detect performance regressions.
 *
 * Usage:
 *   npm run bench:ci              # Run and output JSON
 *   npm run bench:ci > results.json  # Save results to file
 *   npm run bench:compare         # Compare against baseline
 */

import { bench, group, run } from 'tatami-ng';
import { v, validate, check, compileCheck } from '../../src/index.ts';

// ============================================================================
// Schemas (created once, reused)
// ============================================================================

const StringSchema = v.string();
const NumberSchema = v.number();

const SimpleObjectSchema = v.object({
  name: v.string(),
  age: v.number(),
  email: v.string(),
});

const ComplexNestedSchema = v.object({
  id: v.number(),
  name: v.string(),
  metadata: v.object({
    tags: v.array(v.string()),
    priority: v.union([v.literal('low'), v.literal('medium'), v.literal('high')]),
    createdAt: v.number(),
  }),
  settings: v.optional(v.object({
    theme: v.string(),
    notifications: v.boolean(),
  })),
});

const Array10Schema = v.array(v.number());
const Array100Schema = v.array(v.number());

const UnionSchema = v.union([v.string(), v.number(), v.boolean()]);

// Pre-compiled validators
const checkString = compileCheck(StringSchema);
const checkNumber = compileCheck(NumberSchema);
const checkSimpleObject = compileCheck(SimpleObjectSchema);
const checkComplexNested = compileCheck(ComplexNestedSchema);
const checkArray10 = compileCheck(Array10Schema);
const checkArray100 = compileCheck(Array100Schema);
const checkUnion = compileCheck(UnionSchema);

// ============================================================================
// Test Data
// ============================================================================

const validString = 'hello world';
const validNumber = 42;
const validSimpleObject = { name: 'Alice', age: 30, email: 'alice@example.com' };
const validComplexNested = {
  id: 1,
  name: 'Test',
  metadata: {
    tags: ['foo', 'bar'],
    priority: 'high' as const,
    createdAt: Date.now(),
  },
  settings: {
    theme: 'dark',
    notifications: true,
  },
};
const validArray10 = Array(10).fill(42);
const validArray100 = Array(100).fill(42);
const validUnionString = 'hello';
const invalidSimpleObject = { name: 'Alice', age: 'thirty', email: 'alice@example.com' };

// Prevent Dead Code Elimination
let result: any;

// ============================================================================
// CI Benchmark Suite - Key Scenarios
// ============================================================================

// Core validation scenarios for regression detection
group('ci:primitives', () => {
  bench('string:validate', () => {
    result = validate(StringSchema, validString);
  });
  bench('string:check', () => {
    result = check(StringSchema, validString);
  });
  bench('string:compileCheck', () => {
    result = checkString(validString);
  });
  bench('number:validate', () => {
    result = validate(NumberSchema, validNumber);
  });
  bench('number:check', () => {
    result = check(NumberSchema, validNumber);
  });
  bench('number:compileCheck', () => {
    result = checkNumber(validNumber);
  });
});

group('ci:objects', () => {
  bench('simple:validate', () => {
    result = validate(SimpleObjectSchema, validSimpleObject);
  });
  bench('simple:check', () => {
    result = check(SimpleObjectSchema, validSimpleObject);
  });
  bench('simple:compileCheck', () => {
    result = checkSimpleObject(validSimpleObject);
  });
  bench('complex:validate', () => {
    result = validate(ComplexNestedSchema, validComplexNested);
  });
  bench('complex:check', () => {
    result = check(ComplexNestedSchema, validComplexNested);
  });
  bench('complex:compileCheck', () => {
    result = checkComplexNested(validComplexNested);
  });
});

group('ci:arrays', () => {
  bench('array10:validate', () => {
    result = validate(Array10Schema, validArray10);
  });
  bench('array10:check', () => {
    result = check(Array10Schema, validArray10);
  });
  bench('array10:compileCheck', () => {
    result = checkArray10(validArray10);
  });
  bench('array100:validate', () => {
    result = validate(Array100Schema, validArray100);
  });
  bench('array100:check', () => {
    result = check(Array100Schema, validArray100);
  });
  bench('array100:compileCheck', () => {
    result = checkArray100(validArray100);
  });
});

group('ci:unions', () => {
  bench('union:validate', () => {
    result = validate(UnionSchema, validUnionString);
  });
  bench('union:check', () => {
    result = check(UnionSchema, validUnionString);
  });
  bench('union:compileCheck', () => {
    result = checkUnion(validUnionString);
  });
});

group('ci:invalid', () => {
  bench('invalid:validate', () => {
    result = validate(SimpleObjectSchema, invalidSimpleObject);
  });
  bench('invalid:check', () => {
    result = check(SimpleObjectSchema, invalidSimpleObject);
  });
  bench('invalid:compileCheck', () => {
    result = checkSimpleObject(invalidSimpleObject);
  });
});

// ============================================================================
// Run with JSON output for CI
// ============================================================================

const results = await run({
  units: false,
  silent: true,   // Suppress console output
  json: true,     // Return JSON object
  samples: 128,   // Fewer samples for faster CI (still statistically significant)
  time: 500_000_000, // 500ms per benchmark (faster for CI)
  warmup: true,
  latency: true,
  throughput: true,
});

// Output structured JSON for CI consumption
const output = {
  version: '0.8.5',
  timestamp: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  results: results,
};

console.log(JSON.stringify(output, null, 2));
