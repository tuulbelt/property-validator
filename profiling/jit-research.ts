/**
 * v0.8.0 JIT Research - Profiling Script
 *
 * Goal: Understand where time is spent in primitive validation
 * and compare closure-based vs JIT-based approaches.
 */

import { v, validate } from '../src/index.js';

// ============================================================================
// SECTION 1: Current Closure-Based Primitive Validation
// ============================================================================

const stringValidator = v.string();
const numberValidator = v.number();
const booleanValidator = v.boolean();

// Test data
const validString = 'hello';
const validNumber = 42;
const validBoolean = true;

// Warm up
for (let i = 0; i < 10000; i++) {
  stringValidator.validate(validString);
  numberValidator.validate(validNumber);
  booleanValidator.validate(validBoolean);
}

// ============================================================================
// SECTION 2: JIT-Generated Primitive Validators (Prototype)
// ============================================================================

/**
 * JIT-compile a string validator using new Function()
 *
 * This generates:
 *   function(data) { return typeof data === 'string'; }
 */
function createJITStringValidator(): (data: unknown) => boolean {
  return new Function('data', 'return typeof data === "string"') as (data: unknown) => boolean;
}

/**
 * JIT-compile a number validator
 */
function createJITNumberValidator(): (data: unknown) => boolean {
  return new Function('data', 'return typeof data === "number" && !Number.isNaN(data)') as (data: unknown) => boolean;
}

/**
 * JIT-compile a boolean validator
 */
function createJITBooleanValidator(): (data: unknown) => boolean {
  return new Function('data', 'return typeof data === "boolean"') as (data: unknown) => boolean;
}

const jitStringValidator = createJITStringValidator();
const jitNumberValidator = createJITNumberValidator();
const jitBooleanValidator = createJITBooleanValidator();

// Warm up JIT validators
for (let i = 0; i < 10000; i++) {
  jitStringValidator(validString);
  jitNumberValidator(validNumber);
  jitBooleanValidator(validBoolean);
}

// ============================================================================
// SECTION 3: Inline Reference (What V8 Should Optimize To)
// ============================================================================

function inlineStringValidate(data: unknown): boolean {
  return typeof data === 'string';
}

function inlineNumberValidate(data: unknown): boolean {
  return typeof data === 'number' && !Number.isNaN(data);
}

function inlineBooleanValidate(data: unknown): boolean {
  return typeof data === 'boolean';
}

// Warm up inline validators
for (let i = 0; i < 10000; i++) {
  inlineStringValidate(validString);
  inlineNumberValidate(validNumber);
  inlineBooleanValidate(validBoolean);
}

// ============================================================================
// SECTION 4: Benchmarking
// ============================================================================

const ITERATIONS = 1_000_000;

function benchmark(name: string, fn: () => void): void {
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    fn();
  }
  const end = performance.now();
  const totalMs = end - start;
  const opsPerSec = ITERATIONS / (totalMs / 1000);
  const nsPerOp = (totalMs * 1_000_000) / ITERATIONS;
  console.log(`${name.padEnd(40)} ${nsPerOp.toFixed(2).padStart(8)} ns/op  ${(opsPerSec / 1_000_000).toFixed(2).padStart(6)}M ops/sec`);
}

console.log('\n=== v0.8.0 JIT Research: Primitive Validation ===\n');
console.log(`Iterations: ${ITERATIONS.toLocaleString()}\n`);

console.log('--- String Validation ---');
benchmark('Closure-based (current)', () => stringValidator.validate(validString));
benchmark('JIT (new Function)', () => jitStringValidator(validString));
benchmark('Inline function', () => inlineStringValidate(validString));

console.log('\n--- Number Validation ---');
benchmark('Closure-based (current)', () => numberValidator.validate(validNumber));
benchmark('JIT (new Function)', () => jitNumberValidator(validNumber));
benchmark('Inline function', () => inlineNumberValidate(validNumber));

console.log('\n--- Boolean Validation ---');
benchmark('Closure-based (current)', () => booleanValidator.validate(validBoolean));
benchmark('JIT (new Function)', () => jitBooleanValidator(validBoolean));
benchmark('Inline function', () => inlineBooleanValidate(validBoolean));

// ============================================================================
// SECTION 5: Full validate() API comparison
// ============================================================================

console.log('\n--- Full validate() API (with Result object) ---');
benchmark('validate(stringValidator, data)', () => validate(stringValidator, validString));

// Create a JIT-based full validator that returns Result
function createJITFullValidator() {
  const checkFn = new Function('data', 'return typeof data === "string"') as (data: unknown) => boolean;
  return (data: unknown) => {
    if (checkFn(data)) {
      return { ok: true, value: data };
    }
    return { ok: false, error: `Expected string, got ${typeof data}` };
  };
}

const jitFullValidator = createJITFullValidator();
benchmark('JIT full validator (with Result)', () => jitFullValidator(validString));

// ============================================================================
// SECTION 6: Object Validator Comparison
// ============================================================================

console.log('\n--- Object Validation (simple 2-property) ---');

const simpleObjectValidator = v.object({
  name: v.string(),
  age: v.number()
});

const validSimpleObject = { name: 'Alice', age: 30 };

// JIT object validator
function createJITObjectValidator() {
  // Generate validation code as a string
  const code = `
    if (typeof data !== 'object' || data === null) return false;
    if (typeof data.name !== 'string') return false;
    if (typeof data.age !== 'number' || Number.isNaN(data.age)) return false;
    return true;
  `;
  return new Function('data', code) as (data: unknown) => boolean;
}

const jitObjectValidator = createJITObjectValidator();

// Warm up
for (let i = 0; i < 10000; i++) {
  simpleObjectValidator.validate(validSimpleObject);
  jitObjectValidator(validSimpleObject);
}

benchmark('Closure-based object', () => simpleObjectValidator.validate(validSimpleObject));
benchmark('JIT object validator', () => jitObjectValidator(validSimpleObject));

console.log('\n--- Full validate() for objects ---');
benchmark('validate(objectValidator, data)', () => validate(simpleObjectValidator, validSimpleObject));

// JIT full object validator with Result
function createJITFullObjectValidator() {
  const checkFn = new Function('data', `
    if (typeof data !== 'object' || data === null) return false;
    if (typeof data.name !== 'string') return false;
    if (typeof data.age !== 'number' || Number.isNaN(data.age)) return false;
    return true;
  `) as (data: unknown) => boolean;

  return (data: unknown) => {
    if (checkFn(data)) {
      return { ok: true, value: data };
    }
    return { ok: false, error: 'Validation failed' };
  };
}

const jitFullObjectValidator = createJITFullObjectValidator();
benchmark('JIT full object validator', () => jitFullObjectValidator(validSimpleObject));

console.log('\n=== Summary ===');
console.log('Compare the ns/op values to see if JIT provides meaningful improvement.');
console.log('If closure-based is similar to JIT, V8 is already optimizing well.');
console.log('Focus optimization effort on areas with >2x difference.');
