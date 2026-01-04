# v0.9.0+ Performance Roadmap: Competing with TypeBox

**Date:** 2026-01-04
**Status:** Research & Planning
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

## v0.9.0 Implementation Plan

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

v0.9.0:
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

v0.9.0:
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

| API | Current (v0.8.0) | Target (v0.9.0) | Improvement |
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

**v0.9.0 is successful if:**

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

**Phase 1 (v0.9.0-alpha):**
- [ ] Implement `v.check()`
- [ ] Benchmark vs valibot.is(), zod.safeParse().success

**Phase 2 (v0.9.0-beta):**
- [ ] Full JIT compilation for primitives
- [ ] Full JIT compilation for objects
- [ ] Benchmark vs TypeBox TypeCompiler

**Phase 3 (v0.9.0-rc):**
- [ ] Implement `v.compile()`
- [ ] Documentation updates
- [ ] CSP compatibility testing

**Phase 4 (v0.9.0):**
- [ ] Final benchmarks
- [ ] Performance guide documentation
- [ ] Release

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
