/**
 * Phase 9: Array comparison with Valibot
 */

import { bench, group, run, baseline } from 'tatami-ng';
import { v, validate } from '../src/index.ts';
import * as valibot from 'valibot';

// Test data - 10 element arrays
const numberArray10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const stringArray10 = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

// Test data - 100 element arrays (to match v0.7.5 baseline comparison)
const numberArray100 = Array.from({ length: 100 }, (_, i) => i);
const stringArray100 = Array.from({ length: 100 }, (_, i) => `item${i}`);

// propval validators
const propvalNumberArray = v.array(v.number());
const propvalStringArray = v.array(v.string());

// valibot validators
const valibotNumberArray = valibot.array(valibot.number());
const valibotStringArray = valibot.array(valibot.string());

let result: any;

group('Number Array (10 elements)', () => {
  baseline('property-validator', () => {
    result = validate(propvalNumberArray, numberArray10);
  });

  bench('valibot', () => {
    result = valibot.safeParse(valibotNumberArray, numberArray10);
  });
});

group('String Array (10 elements)', () => {
  baseline('property-validator', () => {
    result = validate(propvalStringArray, stringArray10);
  });

  bench('valibot', () => {
    result = valibot.safeParse(valibotStringArray, stringArray10);
  });
});

group('Number Array (100 elements)', () => {
  baseline('property-validator', () => {
    result = validate(propvalNumberArray, numberArray100);
  });

  bench('valibot', () => {
    result = valibot.safeParse(valibotNumberArray, numberArray100);
  });
});

group('String Array (100 elements)', () => {
  baseline('property-validator', () => {
    result = validate(propvalStringArray, stringArray100);
  });

  bench('valibot', () => {
    result = valibot.safeParse(valibotStringArray, stringArray100);
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
