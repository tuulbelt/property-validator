#!/usr/bin/env node --import tsx
/**
 * Complete breakdown of property-validator validation scenarios
 * Shows what happens at compile-time vs runtime, and what returns boolean vs Result<T>
 */

import { v, validate, compile } from '../src/index.ts';

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║  Property-Validator: Validation Scenarios & Error Handling      ║');
console.log('╚══════════════════════════════════════════════════════════════════╝');
console.log('');

// ==============================================================================
// PART 1: TWO VALIDATION APIS
// ==============================================================================

console.log('═'.repeat(70));
console.log('PART 1: Two Different Validation APIs');
console.log('═'.repeat(70));
console.log('');

const UserSchema = v.object({
  name: v.string(),
  age: v.number(),
});

const validData = { name: 'Alice', age: 30 };
const invalidData = { name: 123, age: 30 };

console.log('API 1: validator.validate(data) → boolean (fast path)');
console.log('─'.repeat(70));
const result1 = UserSchema.validate(validData);
console.log('UserSchema.validate(validData):', result1);
console.log('  Return type: boolean');
console.log('  Error info: NO (just true/false)');
console.log('  Performance: FAST (type guard, no allocations)');
console.log('');

const result2 = UserSchema.validate(invalidData);
console.log('UserSchema.validate(invalidData):', result2);
console.log('  Return type: boolean');
console.log('  Error info: NO (just false)');
console.log('');

console.log('API 2: validate(validator, data) → Result<T> (rich errors)');
console.log('─'.repeat(70));
const result3 = validate(UserSchema, validData);
console.log('validate(UserSchema, validData):');
console.log('  ok:', result3.ok);
console.log('  value:', result3.ok ? result3.value : 'N/A');
console.log('  Return type: { ok: true, value: T } | { ok: false, error: string, details?: ValidationError }');
console.log('  Error info: YES (detailed error messages)');
console.log('  Performance: SLOWER (allocates Result object)');
console.log('');

const result4 = validate(UserSchema, invalidData);
console.log('validate(UserSchema, invalidData):');
console.log('  ok:', result4.ok);
if (!result4.ok) {
  console.log('  error:', result4.error);
  if (result4.details) {
    console.log('  details.path:', result4.details.path);
    console.log('  details.expected:', result4.details.expected);
    console.log('  details.code:', result4.details.code);
    console.log('  formatted (text):', result4.details.format('text'));
  }
}
console.log('');

// ==============================================================================
// PART 2: COMPILE-TIME vs RUNTIME
// ==============================================================================

console.log('═'.repeat(70));
console.log('PART 2: Compile-Time vs Runtime');
console.log('═'.repeat(70));
console.log('');

console.log('COMPILE-TIME (when schema is created):');
console.log('─'.repeat(70));
console.log('✅ v.string()              → Creates validator object');
console.log('✅ v.number()              → Creates validator object');
console.log('✅ v.object({ ... })       → Creates validator + compiles validateFn');
console.log('✅ v.array(validator)      → Pre-compiles array validator');
console.log('                              - For primitives: inline type checks');
console.log('                              - For objects: compiled object validator');
console.log('✅ Phase 3 optimization    → Generates specialized validation code');
console.log('                              - Code like: if (typeof obj.name !== "string") return false;');
console.log('');

console.log('RUNTIME (when .validate() or validate() is called):');
console.log('─'.repeat(70));
console.log('✅ .validate(data)         → Runs compiled validateFn (returns boolean)');
console.log('✅ validate(validator, data) → Runs _validateWithPath (returns Result<T>)');
console.log('                              - Tracks path for nested errors');
console.log('                              - Creates ValidationError objects');
console.log('                              - Allocates Result object');
console.log('');

// ==============================================================================
// PART 3: WHAT HAS RICH ERRORS?
// ==============================================================================

console.log('═'.repeat(70));
console.log('PART 3: Which Operations Have Rich Errors?');
console.log('═'.repeat(70));
console.log('');

console.log('┌────────────────────────────────────┬──────────────┬──────────────┐');
console.log('│ Operation                          │ .validate()  │ validate()   │');
console.log('├────────────────────────────────────┼──────────────┼──────────────┤');
console.log('│ v.string()                         │ boolean      │ Result<T>    │');
console.log('│ v.number()                         │ boolean      │ Result<T>    │');
console.log('│ v.boolean()                        │ boolean      │ Result<T>    │');
console.log('│ v.object({ ... })                  │ boolean      │ Result<T>    │');
console.log('│ v.array(v.string())                │ boolean      │ Result<T>    │');
console.log('│ v.array(v.object({ ... }))         │ boolean      │ Result<T>    │');
console.log('│ v.union([...])                     │ boolean      │ Result<T>    │');
console.log('│ v.tuple([...])                     │ boolean      │ Result<T>    │');
console.log('│ v.lazy(() => ...)                  │ boolean      │ Result<T>    │');
console.log('│ .refine(...)                       │ boolean      │ Result<T>    │');
console.log('│ .transform(...)                    │ boolean      │ Result<T>    │');
console.log('│ .optional()                        │ boolean      │ Result<T>    │');
console.log('│ .nullable()                        │ boolean      │ Result<T>    │');
console.log('│ .default(...)                      │ boolean      │ Result<T>    │');
console.log('└────────────────────────────────────┴──────────────┴──────────────┘');
console.log('');

console.log('Key Insight:');
console.log('  - .validate() ALWAYS returns boolean (ALL operations)');
console.log('  - validate() ALWAYS returns Result<T> (ALL operations)');
console.log('  - The choice is yours: speed vs error details');
console.log('');

// ==============================================================================
// PART 4: PHASE 3 IMPACT
// ==============================================================================

console.log('═'.repeat(70));
console.log('PART 4: Phase 3 Impact on Each API');
console.log('═'.repeat(70));
console.log('');

console.log('Phase 3 Generated Code (compile-time):');
console.log('─'.repeat(70));
console.log('For v.object({ name: v.string(), age: v.number() }):');
console.log('');
console.log('  // Generated at COMPILE-TIME (schema creation)');
console.log('  function validateFn(data) {');
console.log('    if (typeof data !== "object" || data === null) return false;');
console.log('    const obj = data;');
console.log('    if (typeof obj.name !== "string") return false;');
console.log('    if (typeof obj.age !== "number" || Number.isNaN(obj.age)) return false;');
console.log('    return true;');
console.log('  }');
console.log('');
console.log('This generated code is used by:');
console.log('  ✅ .validate(data) → Runs generated code directly (super fast)');
console.log('  ❌ validate(data)  → Uses _validateWithPath (NOT the generated code)');
console.log('                       - Tracks path for error messages');
console.log('                       - Calls validate() recursively for each property');
console.log('                       - Returns Result<T> with rich errors');
console.log('');

console.log('Performance Impact:');
console.log('  .validate():  8,677k ops/sec (uses Phase 3 generated code)');
console.log('  validate():   ~500k ops/sec (uses _validateWithPath, NOT Phase 3)');
console.log('');

// ==============================================================================
// PART 5: COMPLETE SCENARIO LIST
// ==============================================================================

console.log('═'.repeat(70));
console.log('PART 5: Complete Validation Scenario List');
console.log('═'.repeat(70));
console.log('');

console.log('┌─────────────────────────────┬──────────────┬─────────────────────┐');
console.log('│ Scenario                    │ When         │ Returns             │');
console.log('├─────────────────────────────┼──────────────┼─────────────────────┤');
console.log('│ Schema Creation             │ COMPILE-TIME │ Validator<T> object │');
console.log('│  - v.string()               │              │                     │');
console.log('│  - v.object()               │              │                     │');
console.log('│  - v.array()                │              │                     │');
console.log('│                             │              │                     │');
console.log('│ Phase 3 Code Generation     │ COMPILE-TIME │ Generated function  │');
console.log('│  - For v.object()           │              │ (stored internally) │');
console.log('│  - For v.array(v.object())  │              │                     │');
console.log('│                             │              │                     │');
console.log('│ Fast Validation (.validate) │ RUNTIME      │ boolean             │');
console.log('│  - Uses Phase 3 generated   │              │ (NO error details)  │');
console.log('│    code for objects/arrays  │              │                     │');
console.log('│  - Inline type checks       │              │                     │');
console.log('│  - Zero allocations         │              │                     │');
console.log('│                             │              │                     │');
console.log('│ Rich Validation (validate)  │ RUNTIME      │ Result<T>           │');
console.log('│  - Uses _validateWithPath   │              │ (WITH error details)│');
console.log('│  - Tracks error path        │              │                     │');
console.log('│  - Creates ValidationError  │              │                     │');
console.log('│  - NOT using Phase 3 code   │              │                     │');
console.log('└─────────────────────────────┴──────────────┴─────────────────────┘');
console.log('');

console.log('✅ Summary:');
console.log('  - ALL validators support BOTH APIs');
console.log('  - Phase 3 only affects .validate() performance');
console.log('  - validate() still has full error details (not optimized by Phase 3)');
console.log('  - Arrays, objects, primitives - all follow same pattern');
