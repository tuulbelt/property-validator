/**
 * Phase 10: Complex Nested Object Analysis
 *
 * Goal: Understand why complex nested objects are still 2x slower than valibot
 */

import { bench, group, run, baseline } from 'tatami-ng';
import { v, validate } from '../src/index.ts';

// Complex nested schema - same as in v080-full-comparison
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

// Test data
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

// Break down: each level
const pvTopLevel = v.object({
  id: v.number(),
  name: v.string(),
});

const pvWithMetadata = v.object({
  id: v.number(),
  name: v.string(),
  metadata: v.object({
    tags: v.array(v.string()),
    priority: v.string(),
    createdAt: v.number(),
  }),
});

// Test data for breakdown
const topLevelData = { id: 1, name: 'Test' };
const withMetadataData = {
  id: 1,
  name: 'Test',
  metadata: {
    tags: ['tag1', 'tag2', 'tag3'],
    priority: 'high',
    createdAt: Date.now(),
  },
};

let result: any;

console.log('\n=== Complex Nested Object Breakdown ===\n');

// Check if _compiled is exposed
console.log('Top level _compiled:', !!(pvTopLevel as any)._compiled);
console.log('With metadata _compiled:', !!(pvWithMetadata as any)._compiled);
console.log('Full complex _compiled:', !!(pvComplexNested as any)._compiled);
console.log('');

group('Breakdown by Nesting Level', () => {
  baseline('2 props (id, name)', () => {
    result = validate(pvTopLevel, topLevelData);
  });

  bench('5 props + nested metadata (3 props)', () => {
    result = validate(pvWithMetadata, withMetadataData);
  });

  bench('Full complex (with optional, union, array)', () => {
    result = validate(pvComplexNested, complexNestedData);
  });
});

group('Validation Paths', () => {
  baseline('validate() API', () => {
    result = validate(pvComplexNested, complexNestedData);
  });

  bench('validator.validate() direct', () => {
    result = pvComplexNested.validate(complexNestedData);
  });
});

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
