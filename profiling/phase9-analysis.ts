/**
 * Phase 9: Array JIT Bypass Analysis
 *
 * Goal: Understand array validation overhead and identify bypass opportunities
 */

import { bench, group, run, baseline } from 'tatami-ng';
import { v, validate } from '../src/index.ts';

// Test data
const stringArray = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
const numberArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Validators
const stringArrayValidator = v.array(v.string());
const numberArrayValidator = v.array(v.number());

// Direct inline validation (theoretical maximum)
function validateStringArrayInline(data: unknown[]): boolean {
  for (let i = 0; i < data.length; i++) {
    if (typeof data[i] !== 'string') return false;
  }
  return true;
}

function validateNumberArrayInline(data: unknown[]): boolean {
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (typeof item !== 'number' || Number.isNaN(item)) return false;
  }
  return true;
}

let result: any;

group('String Array Validation Paths', () => {
  baseline('Direct inline (theoretical max)', () => {
    result = validateStringArrayInline(stringArray);
  });

  bench('validator.validate() direct', () => {
    result = stringArrayValidator.validate(stringArray);
  });

  bench('validate() full API', () => {
    result = validate(stringArrayValidator, stringArray);
  });
});

group('Number Array Validation Paths', () => {
  baseline('Direct inline (theoretical max)', () => {
    result = validateNumberArrayInline(numberArray);
  });

  bench('validator.validate() direct', () => {
    result = numberArrayValidator.validate(numberArray);
  });

  bench('validate() full API', () => {
    result = validate(numberArrayValidator, numberArray);
  });
});

// Check if _compiled is exposed
console.log('\n=== Array Validator Internal State ===');
console.log('stringArrayValidator._compiled:', (stringArrayValidator as any)._compiled);
console.log('stringArrayValidator._validateWithPath:', !!(stringArrayValidator as any)._validateWithPath);
console.log('stringArrayValidator._hasRefinements:', (stringArrayValidator as any)._hasRefinements);
console.log('stringArrayValidator._type:', (stringArrayValidator as any)._type);

// Run benchmarks
await run({
  units: false,
  silent: false,
  json: false,
  samples: 256,
  time: 1_000_000_000, // 1 second
  warmup: true,
  latency: true,
  throughput: true,
});
