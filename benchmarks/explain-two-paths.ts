#!/usr/bin/env node --import tsx
/**
 * Show the COMPLETE architecture: two validation paths and what Phase 3 affects
 */

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║  Property-Validator Architecture: Two Validation Paths          ║');
console.log('╚══════════════════════════════════════════════════════════════════╝');
console.log('');

console.log('═'.repeat(70));
console.log('HISTORY: When Were These APIs Created?');
console.log('═'.repeat(70));
console.log('');

console.log('v0.1.0 (Initial Release):');
console.log('  ✅ validator.validate(data) → boolean (type guard)');
console.log('  ✅ validate(validator, data) → Result<T> (rich errors)');
console.log('  ✅ Both APIs existed from day 1!');
console.log('');

console.log('v0.6.0 (Phase 2):');
console.log('  🔧 Optimized compileObjectValidator()');
console.log('     - Used parallel arrays: keys[], validators[]');
console.log('     - Dynamic property access: obj[keys[i]]');
console.log('     - +8-10% improvement');
console.log('');

console.log('v0.7.0 (Phase 3):');
console.log('  🔧 Further optimized compileObjectValidator()');
console.log('     - Uses new Function() to generate code');
console.log('     - Inline property access: obj.name, obj.age');
console.log('     - ONLY affects .validate() path');
console.log('');

console.log('═'.repeat(70));
console.log('ARCHITECTURE: Two Completely Separate Validation Paths');
console.log('═'.repeat(70));
console.log('');

console.log('┌────────────────────────────────────────────────────────────────┐');
console.log('│ PATH 1: .validate(data) → boolean (FAST)                      │');
console.log('└────────────────────────────────────────────────────────────────┘');
console.log('');
console.log('  schema.validate(data)');
console.log('    ↓');
console.log('  Uses: compiled function from compileObjectValidator()');
console.log('    ↓');
console.log('  Phase 3 Generated Code:');
console.log('    if (typeof data !== "object" || data === null) return false;');
console.log('    if (typeof obj.name !== "string") return false;');
console.log('    if (typeof obj.age !== "number") return false;');
console.log('    return true;');
console.log('    ↓');
console.log('  Returns: boolean');
console.log('  Performance: 8,677k ops/sec (Phase 3 optimized) 🚀');
console.log('  Errors: NO');
console.log('');

console.log('┌────────────────────────────────────────────────────────────────┐');
console.log('│ PATH 2: validate(schema, data) → Result<T> (RICH ERRORS)      │');
console.log('└────────────────────────────────────────────────────────────────┘');
console.log('');
console.log('  validate(schema, data)');
console.log('    ↓');
console.log('  validateFast(validator, data)');
console.log('    ↓');
console.log('  Checks: Does validator have _validateWithPath?');
console.log('    ↓');
console.log('  YES → validateWithPath(validator, data, ...)');
console.log('    ↓');
console.log('  validator._validateWithPath(data, path, seen, depth, options)');
console.log('    ↓');
console.log('  Manually validates each property:');
console.log('    for (const [key, fieldValidator] of Object.entries(shape)) {');
console.log('      const fieldResult = validate(fieldValidator, obj[key]);');
console.log('      if (!fieldResult.ok) {');
console.log('        return { ok: false, error: ..., details: ValidationError }');
console.log('      }');
console.log('    }');
console.log('    ↓');
console.log('  Returns: Result<T> = { ok, value/error, details }');
console.log('  Performance: ~500k ops/sec (NOT Phase 3 optimized) 🐢');
console.log('  Errors: YES (ValidationError with path, formatting, etc.)');
console.log('');

console.log('═'.repeat(70));
console.log('CRITICAL FINDING: What Does Phase 3 Optimize?');
console.log('═'.repeat(70));
console.log('');

console.log('Phase 3 Changes:');
console.log('  File: src/index.ts');
console.log('  Function: compileObjectValidator()');
console.log('  Returns: (data: unknown) => boolean');
console.log('');
console.log('Who uses this compiled function?');
console.log('  ✅ .validate(data) → Uses compiled function directly');
console.log('  ❌ validate(data)  → Uses _validateWithPath (bypasses compiled function)');
console.log('');

console.log('Why doesn\'t validate() use Phase 3 code?');
console.log('  1. validate() needs to track error paths (e.g., "user.name")');
console.log('  2. validate() needs to create ValidationError objects');
console.log('  3. Phase 3 generated code just returns boolean (no error info)');
console.log('  4. _validateWithPath manually validates each property to track path');
console.log('');

console.log('═'.repeat(70));
console.log('BENCHMARK IMPLICATIONS');
console.log('═'.repeat(70));
console.log('');

console.log('Main Benchmarks (Phase 1-3):');
console.log('  Code: validate(v.array(UserSchema), data)');
console.log('  Path: validate() → validateFast() → _validateWithPath');
console.log('  Phase 3 Used: ❌ NO');
console.log('  Performance: ~500k ops/sec');
console.log('  Comparison: Apples-to-apples with zod/valibot (all use rich errors)');
console.log('');

console.log('Fair Compiled Comparison:');
console.log('  Code: arrayValidator.validate(data)');
console.log('  Path: .validate() → compiled function');
console.log('  Phase 3 Used: ✅ YES');
console.log('  Performance: 8,677k ops/sec');
console.log('  Comparison: Boolean API vs valibot rich error API (different goals)');
console.log('');

console.log('═'.repeat(70));
console.log('ANSWER TO YOUR QUESTIONS');
console.log('═'.repeat(70));
console.log('');

console.log('Q1: Are Phase 1-3 benchmarks using schema.validate()?');
console.log('A1: NO - they use validate(schema, data), not schema.validate(data)');
console.log('');

console.log('Q2: Is .validate() a Phase 3 addition?');
console.log('A2: NO - .validate() existed since v0.1.0');
console.log('    Phase 3 only OPTIMIZED the internal compiled function');
console.log('');

console.log('Q3: Should we use the same API for all phases?');
console.log('A3: YES - for consistent benchmarking');
console.log('    Options:');
console.log('    1. Update benchmarks to use .validate() (shows Phase 3 gains)');
console.log('    2. Keep using validate() (apples-to-apples with competitors)');
console.log('    3. Have BOTH benchmarks (different use cases)');
console.log('');

console.log('Q4: Can we use Phase 3 in main benchmark?');
console.log('A4: YES - by changing from:');
console.log('      validate(v.array(UserSchema), data)    // Current');
console.log('    to:');
console.log('      v.array(UserSchema).validate(data)     // Phase 3 optimized');
console.log('    BUT this changes what we\'re measuring (boolean vs Result<T>)');
console.log('');

console.log('═'.repeat(70));
console.log('RECOMMENDATION');
console.log('═'.repeat(70));
console.log('');

console.log('Keep BOTH benchmarks:');
console.log('');
console.log('Benchmark A: "Rich Error API Comparison" (current)');
console.log('  - Use: validate(schema, data)');
console.log('  - Compare: vs zod.safeParse(), valibot.safeParse()');
console.log('  - Shows: Property-validator is competitive for rich errors');
console.log('');
console.log('Benchmark B: "Fast Boolean API" (new)');
console.log('  - Use: schema.validate(data)');
console.log('  - Compare: vs valibot.safeParse() (no boolean-only API exists)');
console.log('  - Shows: 13-42x faster when you don\'t need error details');
console.log('');

console.log('This way users can choose the right tool for their use case:');
console.log('  - Need errors? Use validate() (competitive with zod/valibot)');
console.log('  - Need speed? Use .validate() (13-42x faster, unique advantage)');
