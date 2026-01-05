# v0.8.5+ Performance Roadmap: Competing with TypeBox

**Date:** 2026-01-05
**Status:** Phase 4 Complete - Array optimization achieved near-parity with TypeBox on small arrays
**Goal:** Achieve TypeBox-level performance (~16M ops/sec) while maintaining Zod-like DX

---

## Current State (v0.8.0)

| Library | ops/sec (primitives) | ops/sec (objects) | Approach |
|---------|---------------------|-------------------|----------|
| **TypeBox** | ~16.5M | ~5M | JIT (`new Function()`) + TypeCompiler |
| **Typia** | ~9.6M | ~9M | AOT (TypeScript transformer) |
| **ArkType** | ~10M | ~8M | JIT (shift-reduce parser) |
| **property-validator v0.8.0** | ~5M | ~15M | Hybrid (JIT bypass for objects/arrays) |
| **Valibot** | ~4.1M | ~5M | Closure-based |
| **Zod** | ~2M | ~2M | Closure-based |

**v0.8.0 Achievements:**
- ✅ 3-6x faster than valibot on objects/arrays
- ✅ Competitive on primitives (~1.02x of valibot)
- ✅ JIT bypass pattern working well
- ❌ Still gap to TypeBox on primitives

**The Gap:** TypeBox is ~3x faster on primitives, ~2-3x on simple objects

---

## Performance Ceiling Analysis

### Why TypeBox is Faster

1. **Zero Wrapper Overhead**
   - TypeBox generates raw boolean expressions
   - No Result object allocation
   - No error path until explicitly requested

2. **Direct Property Access**
   - `value.name` not `validator.validate(value.name)`
   - No function call overhead for nested properties

3. **Compile-Once Pattern**
   - Schema compiled to optimized code once at startup
   - Zero compilation cost at validation time

4. **AND-Chain Optimization**
   ```javascript
   // TypeBox generates:
   return typeof value.name === 'string' && typeof value.age === 'number';

   // We currently do:
   if (!validator._compiled(data)) { ... }
   ```

### Why Typia is Faster

1. **AOT Compilation**
   - Validation code generated at build time
   - No `new Function()` runtime overhead
   - Tree-shaking removes unused validators

2. **TypeScript-First**
   - Types and validators are the same thing
   - Zero runtime schema definition

3. **Build Step Trade-off**
   - Requires TypeScript transformer
   - Not zero-dependency

---

## Strategy Options

### Option A: Full JIT Compilation (TypeBox Path)

**Approach:** Generate raw validation code using `new Function()`

**Pros:**
- Maximum performance potential
- No build step required
- Can achieve TypeBox-level speeds

**Cons:**
- Complex implementation
- CSP compatibility concerns (need fallback)
- Debugging compiled code is harder

**Performance Target:** 10-15M ops/sec

### Option B: AOT Compilation (Typia Path)

**Approach:** TypeScript transformer generates validation code at build time

**Pros:**
- Maximum performance
- Tree-shakeable
- No runtime overhead

**Cons:**
- **Violates Tuulbelt zero-dependency principle**
- Requires build step
- Complex toolchain integration

**Recommendation:** ❌ Skip - doesn't fit Tuulbelt philosophy

### Option C: Hybrid APIs (Recommended)

**Approach:** Multiple API surfaces for different performance needs

```typescript
// API 1: Standard API (current - great DX, good performance)
const result = v.validate(schema, data);
if (!result.ok) console.log(result.error);

// API 2: Fast API (no error details, maximum speed)
const isValid = v.check(schema, data);  // Returns boolean only

// API 3: Compiled API (pre-compile for hot paths)
const checker = v.compile(schema);  // Returns (data) => boolean
const isValid = checker(data);

// API 4: Strict API (throws on invalid)
const value = v.parse(schema, data);  // Returns T or throws
```

**Pros:**
- DX preserved for most users
- Power users get maximum performance
- Progressive disclosure of complexity

**Cons:**
- Multiple APIs to learn/maintain
- Users must choose right API for use case

**Performance Target:**
- `v.validate()`: 5-8M ops/sec (current)
- `v.check()`: 12-15M ops/sec
- `v.compile()`: 15-18M ops/sec

---

## v0.8.5 Implementation Plan

### Phase 1: v.check() - Boolean-Only Fast Path

**Goal:** Maximum speed validation without error details

```typescript
// New API
const isValid = v.check(UserSchema, data);

// Implementation
function check<T>(validator: Validator<T>, data: unknown): boolean {
  // Use _compiled directly - no Result allocation
  if (validator._compiled) {
    return validator._compiled(data);
  }
  return validator.validate(data);
}
```

**Expected Improvement:**
- Skip Result allocation (~10-20 ns overhead)
- Skip error path entirely
- Target: 12-15M ops/sec for simple objects

### Phase 2: Inlined Primitive JIT

**Goal:** Generate type-specific validation code

Current (v0.8.0):
```typescript
validator._compiled = (data) => typeof data === 'string';
```

v0.8.5:
```typescript
// At schema creation, for string():
const code = `return typeof data === 'string'`;
validator._compiled = new Function('data', code);
```

**Why this helps:**
- V8 can better optimize standalone functions
- No closure scope to maintain
- Direct return of primitive

**Expected Improvement:** +30-50% on primitive validation

### Phase 3: Fully Inlined Object Validation

**Goal:** Generate single-function validation for entire schema

Current (v0.8.0):
```typescript
// For { name: string, age: number }
const checks = [
  (data) => typeof data.name === 'string',
  (data) => typeof data.age === 'number'
];
validator._compiled = (data) => {
  return typeof data === 'object' && data !== null &&
         checks[0](data) && checks[1](data);
};
```

v0.8.5:
```typescript
// Generate:
const code = `
  return (
    typeof data === 'object' && data !== null &&
    typeof data.name === 'string' &&
    typeof data.age === 'number'
  )
`;
validator._compiled = new Function('data', code);
```

**Why this helps:**
- Zero function call overhead
- Single boolean expression
- V8 can inline entire check

**Expected Improvement:** +50-100% on object validation

### Phase 4: v.compile() - Pre-Compiled Validators

**Goal:** Explicit compilation for hot paths

```typescript
// User API
const checkUser = v.compile(UserSchema);

// Usage (maximum speed)
for (const user of users) {
  if (checkUser(user)) {
    processUser(user);
  }
}
```

**Implementation:**
```typescript
function compile<T>(validator: Validator<T>): (data: unknown) => boolean {
  if (validator._compiled) {
    return validator._compiled;
  }
  // Force JIT compilation if not already done
  return forceCompile(validator);
}
```

**Expected Performance:** 15-18M ops/sec (TypeBox territory)

---

## Performance Targets Summary

| API | Current (v0.8.0) | Target (v0.8.5) | Improvement |
|-----|------------------|-----------------|-------------|
| `v.validate()` | ~5M ops/sec | 8M ops/sec | +60% |
| `v.check()` | N/A | 12-15M ops/sec | New |
| `v.compile()` | Partial | 15-18M ops/sec | TypeBox-level |

---

## DX Preservation Strategy

### 1. Recommend `validate()` as Default

```markdown
## Quick Start

```typescript
import { v, validate } from 'property-validator';

const User = v.object({ name: v.string(), age: v.number() });
const result = validate(User, data);

if (result.ok) {
  console.log(result.value.name);  // Full type inference
} else {
  console.log(result.error);  // Helpful error message
}
```
```

### 2. Document Performance APIs Separately

```markdown
## Performance Optimization

For hot paths where validation happens thousands of times per second,
use the performance APIs:

### `v.check()` - Boolean-only validation
Returns `true`/`false` without error details. ~2x faster than `validate()`.

### `v.compile()` - Pre-compiled validation
Creates a standalone check function. ~3x faster than `validate()`.
```

### 3. API Decision Matrix

| Use Case | API | Why |
|----------|-----|-----|
| Form validation | `validate()` | Need error messages for UX |
| API request validation | `validate()` | Need detailed errors for debugging |
| Hot loop (known-good data) | `check()` | Speed matters, errors unlikely |
| Startup validation | `compile()` | Validate same schema millions of times |
| Data pipeline | `compile()` | Maximum throughput |

---

## Risk Assessment

### Low Risk
- ✅ New APIs don't break existing code
- ✅ CSP fallback already proven in v0.8.0
- ✅ Incremental implementation possible

### Medium Risk
- ⚠️ Three APIs may confuse users (mitigate with docs)
- ⚠️ JIT compilation edge cases (extensive testing needed)

### High Risk
- ❌ None identified

---

## Success Criteria

**v0.8.5 is successful if:**

1. **Performance:**
   - `v.check()` achieves 12M+ ops/sec on simple objects
   - `v.compile()` achieves 15M+ ops/sec (TypeBox territory)
   - `v.validate()` doesn't regress

2. **DX:**
   - Existing code works without changes
   - Error messages still helpful
   - TypeScript inference still works

3. **Reliability:**
   - All 537+ tests pass
   - CSP fallback works in browsers
   - No memory leaks from JIT code

---

## Implementation Timeline

**Phase 1 (v0.8.5-alpha): ✅ COMPLETE**
- [x] Implement `v.check()`
- [x] Benchmark vs `v.validate()`
- [x] Add TypeBox competitor benchmarks

**Phase 1 Results (2026-01-05):**

| Scenario | validate() | check() | Improvement |
|----------|------------|---------|-------------|
| Primitive string | 63.92 ns | 55.70 ns | **+15% faster** |
| Primitive number | 65.98 ns | 60.11 ns | **+9% faster** |
| Simple object | 62.54 ns | 55.53 ns | **+13% faster** |
| Complex nested | 169.49 ns | 190.90 ns | **-12% regression** ⚠️ |
| Invalid object (early reject) | 377.95 ns | 57.77 ns | **+6.54x faster** ✅ |
| Array 10 objects | 250.31 ns | 220.45 ns | **+14% faster** |
| Array 100 objects | 2.10 µs | 2.05 µs | **+2% faster** |
| Array 10 strings | 171.08 ns | 161.89 ns | **+6% faster** |
| Array 100 strings | 1.39 µs | 1.24 µs | **+12% faster** |
| Union string | 82.97 ns | 69.57 ns | **+19% faster** |
| Union number | 88.42 ns | 84.33 ns | **+5% faster** |
| Union boolean | 89.25 ns | 79.74 ns | **+12% faster** |

**Phase 1 Analysis:**
- ✅ Big win on invalid data: 6.54x faster (skips error path entirely)
- ✅ Consistent 5-19% improvement on primitives, arrays, unions
- ⚠️ Regression on complex nested valid objects (-12%)
- The regression is due to nested validators not benefiting from _compiled bypass
- Phase 2-3 JIT improvements should address this

**Phase 2 (v0.8.5-beta): ✅ COMPLETE**
- [x] JIT compilation for unions using `new Function()`
- [x] Inline type checks for primitives and literals
- [x] Benchmark vs TypeBox TypeCompiler

**Phase 2 Results (2026-01-05):**

| Scenario | Phase 1 check() | Phase 2 JIT | Improvement | vs TypeBox Compiled |
|----------|-----------------|-------------|-------------|---------------------|
| Union String (1st) | 69.57 ns | 63.90 ns | **+9% faster** | 1.15x slower |
| Union Number (2nd) | 84.33 ns | 64.64 ns | **+30% faster** | 1.11x slower |

**Phase 2 Head-to-Head Results:**

| Category | property-validator | valibot | TypeBox Compiled | vs TypeBox | vs valibot |
|----------|-------------------|---------|------------------|------------|------------|
| String (prim) | 57.90 ns | 58.19 ns | 56.65 ns | 1.02x slower | ✅ 1.01x faster |
| Number (prim) | 57.40 ns | 61.29 ns | 59.70 ns | ✅ 1.04x faster | ✅ 1.07x faster |
| Simple Object | 55.90 ns | 169.87 ns | 56.11 ns | ✅ 1.00x (equal) | ✅ 3.04x faster |
| Complex Nested | 59.31 ns | 604.83 ns | 58.47 ns | 1.01x slower | ✅ 10.20x faster |
| Array 10 | 63.67 ns | 196.19 ns | 59.94 ns | 1.06x slower | ✅ 3.08x faster |
| Array 100 | 147.30 ns | 1.19 µs | 105.88 ns | 1.39x slower | ✅ 8.07x faster |
| Union String | 63.90 ns | 62.34 ns | 55.54 ns | 1.15x slower | 1.03x slower |
| Union Number | 64.64 ns | 186.27 ns | 58.24 ns | 1.11x slower | ✅ 2.88x faster |

**Phase 2 Analysis:**
- ✅ Gap to TypeBox Compiled narrowed from ~24-44% to 11-15% on unions
- ✅ 7/8 categories faster than valibot (Union String 1st is 1.03x slower)
- ✅ Primitives and objects essentially equal to TypeBox Compiled
- ⚠️ Arrays remain 6-39% slower than TypeBox (potential Phase 3 target)
- ⚠️ Union String 1st match still slightly slower than valibot (first-match overhead)

**Implementation Details:**
1. `generateInlineTypeCheck()` - Generates inline `typeof` expressions
2. `compileUnionValidator()` - Combines checks with `||` using `new Function()`
3. `_literalValue` stored on literal validators for JIT inlining
4. CSP fallback preserved (falls back to loop-based if `new Function()` blocked)

**Phase 3 (v0.8.5-rc): ✅ COMPLETE**
- [x] Implement `v.compileCheck()` - Pre-compiled boolean check functions
- [x] Benchmark vs check() vs TypeBox Compiled
- [x] Documentation updates

**Phase 3 Results (2026-01-05):**

Implemented `compileCheck()` - a function that pre-compiles validators into maximum-speed boolean check functions. Uses WeakMap caching for efficiency.

```typescript
// API
const checker = v.compileCheck(UserSchema);  // Returns (data: unknown) => boolean

// Usage (maximum speed)
for (const user of users) {
  if (checker(user)) {  // ~55 ns per call
    processUser(user);
  }
}
```

**compileCheck() vs check() Improvement:**

| Scenario | check() | compileCheck() | Improvement |
|----------|---------|----------------|-------------|
| String | 57.85 ns | 61.31 ns | -6% (noise) |
| Number | 60.68 ns | 59.07 ns | +3% faster |
| Simple Object | 58.00 ns | 56.91 ns | **+2% faster** |
| Complex Nested | 60.13 ns | 57.82 ns | **+4% faster** |
| Array 10 | 65.16 ns | 64.80 ns | +1% faster |
| Array 100 | 145.91 ns | 143.85 ns | +1% faster |
| Union String (1st) | 65.75 ns | 55.71 ns | **+18% faster** ✅ |
| Union Number (2nd) | 63.62 ns | 55.28 ns | **+15% faster** ✅ |

**compileCheck() vs TypeBox Compiled:**

| Scenario | compileCheck() | TypeBox Compiled | vs TypeBox |
|----------|----------------|------------------|------------|
| String | 61.31 ns | 58.95 ns | 1.04x slower |
| Number | 59.07 ns | 56.25 ns | 1.05x slower |
| Simple Object | 56.91 ns | 58.10 ns | **✅ 1.02x faster** |
| Complex Nested | 57.82 ns | 59.87 ns | **✅ 1.04x faster** |
| Array 10 | 64.80 ns | 60.85 ns | 1.07x slower |
| Array 100 | 143.85 ns | 106.47 ns | 1.35x slower |
| Union String (1st) | 55.71 ns | 55.53 ns | **✅ Equal** |
| Union Number (2nd) | 55.28 ns | 56.09 ns | **✅ 1.01x faster** |

**compileCheck() vs valibot:**

| Scenario | compileCheck() | valibot | vs valibot |
|----------|----------------|---------|------------|
| String | 61.31 ns | 61.99 ns | **✅ 1.01x faster** |
| Number | 59.07 ns | 56.40 ns | 1.05x slower |
| Simple Object | 56.91 ns | 172.53 ns | **✅ 3.03x faster** |
| Complex Nested | 57.82 ns | 652.54 ns | **✅ 11.3x faster** |
| Array 10 | 64.80 ns | 161.39 ns | **✅ 2.49x faster** |
| Array 100 | 143.85 ns | 1.01 µs | **✅ 7.02x faster** |
| Union String (1st) | 55.71 ns | 62.82 ns | **✅ 1.13x faster** |
| Union Number (2nd) | 55.28 ns | 171.91 ns | **✅ 3.11x faster** |

**Phase 3 Analysis:**
- ✅ **TypeBox-level achieved** on objects and unions
- ✅ **7/8 categories faster than valibot** (only Number primitive is 1.05x slower)
- ✅ **Unions +15-18% faster** than check() thanks to cached JIT functions
- ✅ **Simple objects 1.02x FASTER than TypeBox Compiled**
- ⚠️ Arrays remain 7-35% slower than TypeBox (different optimization approach)

**Implementation Details:**
1. `compileCheck<T>(validator)` - Returns `(data: unknown) => boolean`
2. WeakMap caching - Same compiled function returned for same schema
3. Uses `_compiled` property when available (JIT optimized)
4. Fallback to `validator.validate()` result for edge cases
5. Added to `v` object export as `v.compileCheck()`

**Phase 4: Array JIT Optimization (COMPLETE)**

**Goal:** Close the array performance gap with TypeBox

**The Problem:**
Arrays were 1.08-1.39x slower than TypeBox Compiled because:
1. Wrapper function overhead: `_compiled = (data) => Array.isArray(data) && compiledValidate(data)`
2. Repeated `data.length` property access in loop
3. Closure-based approach instead of pure JIT

**Implementation:**
```typescript
// Phase 4: Complete JIT function with inlined Array.isArray and cached length
function compileArrayValidatorJIT<T>(itemValidator: Validator<T>) {
  const inlineCheck = generateInlineTypeCheck(itemValidator, 'data[i]');

  if (inlineCheck !== null) {
    const fnBody = `
      if (!Array.isArray(data)) return false;
      const len = data.length;
      for (let i = 0; i < len; i++) {
        if (!(${inlineCheck})) return false;
      }
      return true;
    `;
    return new Function('data', fnBody);
  }
  return null;
}
```

**Key Optimizations:**
1. **Complete JIT function** - Includes `Array.isArray` check, no wrapper needed
2. **Length caching** - `const len = data.length` avoids repeated property access
3. **Direct `_compiled` assignment** - No intermediate arrow function closure

**Phase 4 Results:**

| Scenario | Before Phase 4 | After Phase 4 | Improvement |
|----------|----------------|---------------|-------------|
| Array 10 strings | 1.08x slower | **1.02x slower** | Near parity! |
| Array 100 strings | 1.39x slower | **1.32x slower** | 7% gain |

**Full Benchmark Results (vs TypeBox Compiled):**

| Category | pv check() | TypeBox Compiled | Comparison |
|----------|-----------|------------------|------------|
| Primitive: String | 56.60 ns | 54.79 ns | 1.03x slower |
| Primitive: Number | 55.64 ns | 56.91 ns | **1.02x faster** ✅ |
| Object: Simple | 54.11 ns | 59.45 ns | **1.10x faster** ✅ |
| Object: Complex | 61.24 ns | 59.89 ns | 1.02x slower |
| Array: 10 strings | 63.09 ns | 62.04 ns | 1.02x slower |
| Array: 100 strings | 142.99 ns | 108.60 ns | 1.32x slower |
| Union: String (1st) | 68.10 ns | 60.13 ns | 1.13x slower |
| Union: Number (2nd) | 64.82 ns | 54.73 ns | 1.18x slower |

**vs Valibot (all wins):**
- Objects: 3.15-9.48x faster ✅
- Arrays: 2.25-7.83x faster ✅
- Unions: 1.59-2.79x faster ✅
- Primitives: 1.10-1.16x faster ✅

**Remaining Gap Analysis:**
Large arrays (100+ items) are still ~32% slower than TypeBox. This is likely due to:
1. TypeBox may use different iteration patterns (while loop, indices)
2. V8 hidden class optimization differences
3. Potential loop unrolling in TypeBox

**Conclusion:**
Phase 4 successfully closed the gap for small arrays (near parity) and improved large arrays by 7%. The remaining gap is acceptable as we maintain full Zod-like DX and beat valibot by 7-8x on arrays.

**Phase 5 (v0.8.5 Release):**
- [ ] Final benchmarks documentation
- [ ] Performance guide documentation
- [ ] Release v0.8.5

---

## Appendix: TypeBox TypeCompiler Analysis

TypeBox's TypeCompiler is the gold standard. Key patterns:

```typescript
// 1. Generate check expressions as strings
function* FromString(schema, value) {
  yield `typeof ${value} === 'string'`;
  if (schema.minLength !== undefined) {
    yield `${value}.length >= ${schema.minLength}`;
  }
}

// 2. Combine with AND
const checks = [...FromString(schema, 'value')];
const code = `return ${checks.join(' && ')}`;

// 3. Create function
const fn = new Function('value', code);

// 4. Cache by schema
const cache = new WeakMap();
function compile(schema) {
  if (cache.has(schema)) return cache.get(schema);
  const fn = generateFunction(schema);
  cache.set(schema, fn);
  return fn;
}
```

---

## References

- [TypeBox TypeCompiler Source](https://github.com/sinclairzx81/typebox/blob/master/src/compiler/compiler.ts)
- [V8 JIT Optimization Guide](https://v8.dev/blog/jitless)
- [Property Validator v0.8.0 Research](./V0_8_0_JIT_RESEARCH.md)
