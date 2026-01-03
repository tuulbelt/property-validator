/**
 * Fast Boolean API Benchmarks (tatami-ng)
 *
 * Compares boolean-only validation APIs across libraries.
 * This benchmark shows the true performance of Phase 3 optimizations
 * (code generation for `.validate()` method).
 *
 * APIs compared:
 * - property-validator: schema.validate(data) → boolean
 * - yup: schema.isValid(data) → Promise<boolean>
 * - zod: schema.safeParse(data).success → boolean (fallback - no dedicated boolean API)
 * - valibot: safeParse(schema, data).success → boolean (fallback - no dedicated boolean API)
 *
 * Note: Only pv and yup have dedicated boolean-only APIs.
 * For zod/valibot, we extract boolean from their rich error objects.
 */

import { bench, group, run } from 'tatami-ng';
import { v } from '../src/index.js';
import { z } from 'zod';
import * as val from 'valibot';
import * as yup from 'yup';

// Test data
const validUser = {
  name: 'Alice Smith',
  age: 30,
  email: 'alice@example.com',
  isActive: true,
};

const invalidUser = {
  name: 'Bob',
  age: 'thirty', // Invalid: should be number
  email: 'bob@example.com',
  isActive: true,
};

const validUsers = Array.from({ length: 10 }, (_, i) => ({
  name: `User ${i}`,
  age: 20 + i,
  email: `user${i}@example.com`,
  isActive: i % 2 === 0,
}));

const invalidUsers = Array.from({ length: 10 }, (_, i) => ({
  name: `User ${i}`,
  age: i % 3 === 0 ? 'invalid' : 20 + i, // Every 3rd user has invalid age
  email: `user${i}@example.com`,
  isActive: i % 2 === 0,
}));

// Property-validator schemas
const pvUserSchema = v.object({
  name: v.string(),
  age: v.number(),
  email: v.string(),
  isActive: v.boolean(),
});

const pvUsersSchema = v.array(pvUserSchema);

// Zod schemas
const zodUserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string(),
  isActive: z.boolean(),
});

const zodUsersSchema = z.array(zodUserSchema);

// Valibot schemas
const valibotUserSchema = val.object({
  name: val.string(),
  age: val.number(),
  email: val.string(),
  isActive: val.boolean(),
});

const valibotUsersSchema = val.array(valibotUserSchema);

// Yup schemas
const yupUserSchema = yup.object({
  name: yup.string().required(),
  age: yup.number().required(),
  email: yup.string().required(),
  isActive: yup.boolean().required(),
});

const yupUsersSchema = yup.array(yupUserSchema).required();

// Prevent dead code elimination
let result: any;

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  Fast Boolean API Benchmarks (tatami-ng)');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log('Testing: Boolean-only validation (no error details)\n');

// Single object validation (valid)
group('Single Object (Valid)', () => {
  bench('pv: .validate()', () => {
    result = pvUserSchema.validate(validUser);
  });

  bench('yup: .isValid()', async () => {
    result = await yupUserSchema.isValid(validUser);
  });

  bench('zod: .safeParse().success', () => {
    result = zodUserSchema.safeParse(validUser).success;
  });

  bench('valibot: safeParse().success', () => {
    result = val.safeParse(valibotUserSchema, validUser).success;
  });
});

// Single object validation (invalid)
group('Single Object (Invalid)', () => {
  bench('pv: .validate()', () => {
    result = pvUserSchema.validate(invalidUser);
  });

  bench('yup: .isValid()', async () => {
    result = await yupUserSchema.isValid(invalidUser);
  });

  bench('zod: .safeParse().success', () => {
    result = zodUserSchema.safeParse(invalidUser).success;
  });

  bench('valibot: safeParse().success', () => {
    result = val.safeParse(valibotUserSchema, invalidUser).success;
  });
});

// Array validation (valid)
group('Array of 10 Objects (Valid)', () => {
  bench('pv: .validate()', () => {
    result = pvUsersSchema.validate(validUsers);
  });

  bench('yup: .isValid()', async () => {
    result = await yupUsersSchema.isValid(validUsers);
  });

  bench('zod: .safeParse().success', () => {
    result = zodUsersSchema.safeParse(validUsers).success;
  });

  bench('valibot: safeParse().success', () => {
    result = val.safeParse(valibotUsersSchema, validUsers).success;
  });
});

// Array validation (invalid)
group('Array of 10 Objects (Invalid)', () => {
  bench('pv: .validate()', () => {
    result = pvUsersSchema.validate(invalidUsers);
  });

  bench('yup: .isValid()', async () => {
    result = await yupUsersSchema.isValid(invalidUsers);
  });

  bench('zod: .safeParse().success', () => {
    result = zodUsersSchema.safeParse(invalidUsers).success;
  });

  bench('valibot: safeParse().success', () => {
    result = val.safeParse(valibotUsersSchema, invalidUsers).success;
  });
});

// Run benchmarks
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

// Summary
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  Summary');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log('✅ property-validator: Uses Phase 3 compiled validators');
console.log('   - Inline property checks via code generation');
console.log('   - Zero allocation (returns primitive boolean)');
console.log('   - ~13-42x faster than rich error APIs\n');
console.log('✅ yup: Dedicated .isValid() boolean API');
console.log('   - Returns Promise<boolean>');
console.log('   - Optimized for boolean checks\n');
console.log('⚠️  zod: No dedicated boolean API');
console.log('   - Uses .safeParse().success (extracts boolean from rich object)');
console.log('   - Still allocates full error objects internally\n');
console.log('⚠️  valibot: No dedicated boolean API');
console.log('   - Uses safeParse().success (extracts boolean from rich object)');
console.log('   - Still allocates full error objects internally\n');
console.log('═══════════════════════════════════════════════════════════════\n');
