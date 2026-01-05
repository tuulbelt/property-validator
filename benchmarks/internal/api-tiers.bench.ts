#!/usr/bin/env node --import tsx
/**
 * Internal API Tier Comparison Benchmark
 *
 * Compares property-validator's three API tiers:
 * - validate() - Full validation with error details
 * - check() - Boolean-only validation
 * - compileCheck() - Pre-compiled boolean validation
 *
 * This benchmark helps users choose the right API for their use case.
 */

import { bench, baseline, group, run } from 'tatami-ng';
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

// ============================================================================
// Pre-compiled validators (for compileCheck)
// ============================================================================

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
const validUnionNumber = 42;

const invalidSimpleObject = { name: 'Alice', age: 'thirty', email: 'alice@example.com' };

// ============================================================================
// Prevent Dead Code Elimination
// ============================================================================

let result: any;

// ============================================================================
// Benchmark Suite
// ============================================================================

console.log('\n📊 Internal API Tier Comparison Benchmark\n');
console.log('Comparing: validate() vs check() vs compileCheck()\n');

group('Primitives - String', () => {
  baseline('validate()', () => {
    result = validate(StringSchema, validString);
  });

  bench('check()', () => {
    result = check(StringSchema, validString);
  });

  bench('compileCheck()', () => {
    result = checkString(validString);
  });
});

group('Primitives - Number', () => {
  baseline('validate()', () => {
    result = validate(NumberSchema, validNumber);
  });

  bench('check()', () => {
    result = check(NumberSchema, validNumber);
  });

  bench('compileCheck()', () => {
    result = checkNumber(validNumber);
  });
});

group('Simple Object (3 properties)', () => {
  baseline('validate()', () => {
    result = validate(SimpleObjectSchema, validSimpleObject);
  });

  bench('check()', () => {
    result = check(SimpleObjectSchema, validSimpleObject);
  });

  bench('compileCheck()', () => {
    result = checkSimpleObject(validSimpleObject);
  });
});

group('Complex Nested Object', () => {
  baseline('validate()', () => {
    result = validate(ComplexNestedSchema, validComplexNested);
  });

  bench('check()', () => {
    result = check(ComplexNestedSchema, validComplexNested);
  });

  bench('compileCheck()', () => {
    result = checkComplexNested(validComplexNested);
  });
});

group('Array (10 numbers)', () => {
  baseline('validate()', () => {
    result = validate(Array10Schema, validArray10);
  });

  bench('check()', () => {
    result = check(Array10Schema, validArray10);
  });

  bench('compileCheck()', () => {
    result = checkArray10(validArray10);
  });
});

group('Array (100 numbers)', () => {
  baseline('validate()', () => {
    result = validate(Array100Schema, validArray100);
  });

  bench('check()', () => {
    result = check(Array100Schema, validArray100);
  });

  bench('compileCheck()', () => {
    result = checkArray100(validArray100);
  });
});

group('Union (3 types)', () => {
  baseline('validate() - string', () => {
    result = validate(UnionSchema, validUnionString);
  });

  bench('check() - string', () => {
    result = check(UnionSchema, validUnionString);
  });

  bench('compileCheck() - string', () => {
    result = checkUnion(validUnionString);
  });
});

group('Invalid Data (Error Path)', () => {
  baseline('validate() - builds error', () => {
    result = validate(SimpleObjectSchema, invalidSimpleObject);
  });

  bench('check() - skips error', () => {
    result = check(SimpleObjectSchema, invalidSimpleObject);
  });

  bench('compileCheck() - skips error', () => {
    result = checkSimpleObject(invalidSimpleObject);
  });
});

// ============================================================================
// Run
// ============================================================================

await run({
  units: false,
  silent: false,
  json: false,
  samples: 256,
  time: 2_000_000_000, // 2 seconds per benchmark
  warmup: true,
  latency: true,
  throughput: true,
});

console.log('\n✅ Internal API comparison complete!');
console.log('\n📝 Key Insights:');
console.log('   • check() skips Result allocation → faster for valid data');
console.log('   • compileCheck() uses cached JIT → fastest for repeated validation');
console.log('   • Invalid data shows biggest gap (check/compileCheck skip error path)');
console.log('');
