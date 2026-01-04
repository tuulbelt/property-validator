/**
 * Property Validator Benchmarks
 *
 * Uses tatami-ng for performance testing.
 * Run with: npm run bench
 *
 * See: /docs/BENCHMARKING_STANDARDS.md
 */

import { group, bench, run } from 'tatami-ng';
import { v, validate } from '../src/index.ts';

// Create validators once (reused across benchmarks)
const stringValidator = v.string();
const numberValidator = v.number();
const booleanValidator = v.boolean();
const arrayValidator = v.array(v.number());
const objectValidator = v.object({
  name: v.string(),
  age: v.number(),
  active: v.boolean(),
});

// Deeply nested object validator
const deepValidator = v.object({
  level1: v.object({
    level2: v.object({
      level3: v.object({
        value: v.string(),
      }),
    }),
  }),
});

// Test data
const validObject = { name: 'Alice', age: 30, active: true };
const invalidObject = { name: 123, age: 'thirty', active: 'yes' };
const deepObject = { level1: { level2: { level3: { value: 'test' } } } };

group('Primitive Validators', () => {
  bench('string: valid input', () => {
    validate(stringValidator, 'hello world');
  });

  bench('string: invalid input', () => {
    validate(stringValidator, 12345);
  });

  bench('number: valid input', () => {
    validate(numberValidator, 42.5);
  });

  bench('number: invalid input', () => {
    validate(numberValidator, 'not a number');
  });

  bench('boolean: valid input', () => {
    validate(booleanValidator, true);
  });
});

group('Array Validators', () => {
  bench('array: small valid array (5 items)', () => {
    validate(arrayValidator, [1, 2, 3, 4, 5]);
  });

  bench('array: medium valid array (50 items)', () => {
    validate(arrayValidator, Array.from({ length: 50 }, (_, i) => i));
  });

  bench('array: invalid array (mixed types)', () => {
    validate(arrayValidator, [1, 'two', 3, 'four']);
  });
});

group('Object Validators', () => {
  bench('object: valid object', () => {
    validate(objectValidator, validObject);
  });

  bench('object: invalid object', () => {
    validate(objectValidator, invalidObject);
  });

  bench('object: deeply nested valid', () => {
    validate(deepValidator, deepObject);
  });
});

group('Validator Creation', () => {
  bench('create: string validator', () => {
    v.string();
  });

  bench('create: object validator (3 fields)', () => {
    v.object({
      name: v.string(),
      age: v.number(),
      active: v.boolean(),
    });
  });

  bench('create: array of objects validator', () => {
    v.array(
      v.object({
        id: v.number(),
        value: v.string(),
      })
    );
  });
});

await run({
  percentiles: false,
});
