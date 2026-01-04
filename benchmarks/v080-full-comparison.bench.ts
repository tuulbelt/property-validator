/**
 * v0.8.0 Full Competitive Comparison vs Valibot
 *
 * Tests all categories to verify competitive position after Phase 8 & 9
 */

import { bench, group, run, baseline } from 'tatami-ng';
import { v, validate } from '../src/index.ts';
import * as valibot from 'valibot';

// ============================================================================
// Schemas - Property Validator
// ============================================================================

const pvString = v.string();
const pvNumber = v.number();

const pvSimpleObject = v.object({
  name: v.string(),
  age: v.number(),
  email: v.string(),
});

const pvComplexNested = v.object({
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

const pvNumberArray = v.array(v.number());
const pvStringArray = v.array(v.string());

const pvUnion = v.union([v.string(), v.number(), v.boolean()]);

// ============================================================================
// Schemas - Valibot
// ============================================================================

const vbString = valibot.string();
const vbNumber = valibot.number();

const vbSimpleObject = valibot.object({
  name: valibot.string(),
  age: valibot.number(),
  email: valibot.string(),
});

const vbComplexNested = valibot.object({
  id: valibot.number(),
  name: valibot.string(),
  metadata: valibot.object({
    tags: valibot.array(valibot.string()),
    priority: valibot.union([valibot.literal('low'), valibot.literal('medium'), valibot.literal('high')]),
    createdAt: valibot.number(),
  }),
  settings: valibot.optional(valibot.object({
    theme: valibot.string(),
    notifications: valibot.boolean(),
  })),
});

const vbNumberArray = valibot.array(valibot.number());
const vbStringArray = valibot.array(valibot.string());

const vbUnion = valibot.union([valibot.string(), valibot.number(), valibot.boolean()]);

// ============================================================================
// Test Data
// ============================================================================

const stringData = 'hello world';
const numberData = 42;
const simpleObjectData = { name: 'Alice', age: 30, email: 'alice@example.com' };
const complexNestedData = {
  id: 1,
  name: 'Test',
  metadata: {
    tags: ['tag1', 'tag2', 'tag3'],
    priority: 'high' as const,
    createdAt: Date.now(),
  },
  settings: {
    theme: 'dark',
    notifications: true,
  },
};
const numberArray100 = Array.from({ length: 100 }, (_, i) => i);
const stringArray100 = Array.from({ length: 100 }, (_, i) => `item${i}`);
const unionData = 'test string';

let result: any;

// ============================================================================
// Benchmarks
// ============================================================================

console.log('\n🔥 v0.8.0 Full Competitive Comparison\n');

group('1. Primitives (string)', () => {
  baseline('property-validator', () => {
    result = validate(pvString, stringData);
  });
  bench('valibot', () => {
    result = valibot.safeParse(vbString, stringData);
  });
});

group('2. Primitives (number)', () => {
  baseline('property-validator', () => {
    result = validate(pvNumber, numberData);
  });
  bench('valibot', () => {
    result = valibot.safeParse(vbNumber, numberData);
  });
});

group('3. Simple Object', () => {
  baseline('property-validator', () => {
    result = validate(pvSimpleObject, simpleObjectData);
  });
  bench('valibot', () => {
    result = valibot.safeParse(vbSimpleObject, simpleObjectData);
  });
});

group('4. Complex Nested Object', () => {
  baseline('property-validator', () => {
    result = validate(pvComplexNested, complexNestedData);
  });
  bench('valibot', () => {
    result = valibot.safeParse(vbComplexNested, complexNestedData);
  });
});

group('5. Number Array [100]', () => {
  baseline('property-validator', () => {
    result = validate(pvNumberArray, numberArray100);
  });
  bench('valibot', () => {
    result = valibot.safeParse(vbNumberArray, numberArray100);
  });
});

group('6. String Array [100]', () => {
  baseline('property-validator', () => {
    result = validate(pvStringArray, stringArray100);
  });
  bench('valibot', () => {
    result = valibot.safeParse(vbStringArray, stringArray100);
  });
});

group('7. Union (3 types)', () => {
  baseline('property-validator', () => {
    result = validate(pvUnion, unionData);
  });
  bench('valibot', () => {
    result = valibot.safeParse(vbUnion, unionData);
  });
});

// Run benchmarks
await run({
  units: false,
  silent: false,
  json: false,
  samples: 256,
  time: 1_000_000_000,
  warmup: true,
  latency: true,
  throughput: true,
});
