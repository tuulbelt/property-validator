/**
 * Phase 11: Union Performance Investigation
 *
 * v0.7.5: Unions were 4.5x faster than valibot
 * v0.8.0: Unions are 1.12x SLOWER than valibot
 *
 * This is a significant regression that needs investigation.
 */

import { bench, group, run, baseline } from 'tatami-ng';
import { v, validate } from '../src/index.js';
import * as valibot from 'valibot';

// Test unions with different types
const pvUnion3 = v.union([v.string(), v.number(), v.boolean()]);
const vbUnion3 = valibot.union([valibot.string(), valibot.number(), valibot.boolean()]);

// Literal unions (common pattern)
const pvLiteralUnion = v.union([v.literal('a'), v.literal('b'), v.literal('c')]);
const vbLiteralUnion = valibot.union([valibot.literal('a'), valibot.literal('b'), valibot.literal('c')]);

// Object unions (discriminated)
const pvObjectUnion = v.union([
  v.object({ type: v.literal('a'), value: v.string() }),
  v.object({ type: v.literal('b'), value: v.number() }),
]);
const vbObjectUnion = valibot.union([
  valibot.object({ type: valibot.literal('a'), value: valibot.string() }),
  valibot.object({ type: valibot.literal('b'), value: valibot.number() }),
]);

// Test data - try different positions
const stringData = 'test';  // First in union
const numberData = 42;      // Second in union
const boolData = true;      // Third in union

let result: any;

console.log('\n=== Phase 11: Union Performance Analysis ===\n');

// Check union internals
console.log('Union validator internals:');
console.log('  _compiled:', !!(pvUnion3 as any)._compiled);
console.log('  _validateWithPath:', !!(pvUnion3 as any)._validateWithPath);
console.log('  _hasRefinements:', !!(pvUnion3 as any)._hasRefinements);
console.log('  _transform:', !!(pvUnion3 as any)._transform);
console.log('');

// Test each variant position
group('3-Type Union: Match Position', () => {
  baseline('propval - string (1st position)', () => {
    result = validate(pvUnion3, stringData);
  });

  bench('propval - number (2nd position)', () => {
    result = validate(pvUnion3, numberData);
  });

  bench('propval - boolean (3rd position)', () => {
    result = validate(pvUnion3, boolData);
  });
});

group('3-Type Union: propval vs valibot (string)', () => {
  baseline('property-validator', () => {
    result = validate(pvUnion3, stringData);
  });

  bench('valibot', () => {
    result = valibot.safeParse(vbUnion3, stringData);
  });
});

group('3-Type Union: propval vs valibot (number - 2nd)', () => {
  baseline('property-validator', () => {
    result = validate(pvUnion3, numberData);
  });

  bench('valibot', () => {
    result = valibot.safeParse(vbUnion3, numberData);
  });
});

group('Literal Union (3 options)', () => {
  baseline('property-validator', () => {
    result = validate(pvLiteralUnion, 'b');
  });

  bench('valibot', () => {
    result = valibot.safeParse(vbLiteralUnion, 'b');
  });
});

group('Object Union (discriminated)', () => {
  baseline('property-validator', () => {
    result = validate(pvObjectUnion, { type: 'a', value: 'hello' });
  });

  bench('valibot', () => {
    result = valibot.safeParse(vbObjectUnion, { type: 'a', value: 'hello' });
  });
});

// Direct validator.validate() comparison
group('Direct .validate() vs validate() API', () => {
  baseline('validate() API', () => {
    result = validate(pvUnion3, stringData);
  });

  bench('validator.validate() direct', () => {
    result = pvUnion3.validate(stringData);
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
