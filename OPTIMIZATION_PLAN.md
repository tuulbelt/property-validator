# Property Validator Optimization Plan

**Created:** 2026-01-02
**Last Updated:** 2026-01-04
**Goal:** Surpass Valibot, approach ArkType-tier performance (~10M ops/sec)

---

## Executive Summary

| Version | Focus | Status |
|---------|-------|--------|
| v0.6.0 | Baseline | ✅ 5/6 wins vs Zod |
| v0.7.0 | Compilation + Fast Paths | ✅ 6/6 wins vs Zod |
| v0.7.5 | Profiling-Driven Micro-Optimizations | ✅ Valibot-competitive (2 wins, 3 losses) |
| **v0.8.0** | **JIT Compilation** | 📋 SURPASS Valibot (6/6 target) |
| v0.9.0 | Modular Design | 📋 Bundle size: 13.5 kB → 1-2 kB |
| v1.0.0 | Stable Release | 📋 Feature-complete + optimized |

---

## Performance Tiers (TypeScript Validators)

Based on [moltar/typescript-runtime-type-benchmarks](https://github.com/moltar/typescript-runtime-type-benchmarks):

| Tier | Library | Ops/sec | Approach |
|------|---------|---------|----------|
| **Ultra** | TypeBox | 16.5M | JIT (`new Function()`) |
| **Ultra** | Typia | 9.6M | AOT (TS transformer) |
| **Ultra** | ArkType | ~10M | JIT + shift-reduce parser |
| **Fast** | Valibot | 4.1M | Closure-based, modular |
| **Fast** | **propval v0.7.5** | ~5M | Closure-based, compiled |
| **Baseline** | Zod | 2.0M | Closure-based |

**Key Insight:** JIT compilation (`new Function()`) achieves 2.5-4x improvement over closures without requiring build steps.

---

## v0.7.5 Summary (COMPLETE)

### What We Built (6 Phases)

| Phase | Optimization | Result |
|-------|--------------|--------|
| 1 | Skip empty refinement loop | +8-20% ✅ |
| 2 | Eliminate Fast API Result allocation | +12-22% ✅ |
| 3 | Inline primitive validation | ❌ REJECTED (-24% union regression) |
| 4 | Lazy path building (`string[]` → `PathSegment[]`) | +24-30% ✅ |
| 5 | Shared primitive validator functions | No runtime benefit ✅ |
| 6 | Pre-compiled object validators + fast path | **+214% (+3.1x)** ✅ |

### v0.7.5 vs Competition

**vs Zod: 6/6 categories won** ✅

**vs Valibot:**

| Category | propval | valibot | Winner |
|----------|---------|---------|--------|
| Simple objects | 120 ns | 207 ns | **propval 1.7x** ✅ |
| Unions | 107 ns | 450 ns | **propval 4.5x** ✅ |
| Primitives | 180 ns | 101 ns | valibot 1.8x |
| Complex nested | 2.5 µs | 1.05 µs | valibot 2.4x |
| Primitive arrays | 1.1 µs | 296 ns | valibot 3.8x |

**Score: 2 wins, 3 losses**

### Key Learnings

1. **Phase 3 taught us:** Any code at `validate()` entry affects ALL validators including unions (our strength)
2. **Phase 6 taught us:** Optimizations WITHIN specific validator types avoid global regressions
3. **tatami-ng:** Provides ±0.86% variance vs tinybench's ±19.4% - essential for reliable optimization work

---

## v0.8.0: JIT Compilation (SURPASS Valibot)

**Status:** 📋 Planning Complete, Ready for Implementation
**Goal:** Surpass Valibot in ALL 6 categories, approach ArkType-tier (~10M ops/sec)

### Why JIT Beats Closures

From [Typia's research](https://dev.to/samchon/typia-15000x-faster-validator-and-its-histories-1fmg):

> "In the V8 engine, priority of optimization is the lowest for JIT-compiled code [via eval], which is the principle reason why typia is faster than ajv and typebox libraries."

**Correction:** V8 optimization priority is actually:
1. **AOT** (Typia) - analyzed at compile time, fully optimized
2. **Static code** - written by hand, well optimized
3. **JIT via `new Function()`** - compiled once, good optimization
4. **Closures** - scope chain lookup, harder to optimize

TypeBox and ArkType use `new Function()` to achieve 2.5-4x speedup over closure-based validators like Zod/Valibot.

### Architectural Approach

**Current (closure-based):**
```typescript
const validateString = (data: unknown) => typeof data === 'string';
const validateObject = (data: unknown) => {
  for (let i = 0; i < keys.length; i++) {
    if (!validators[i](data[keys[i]])) return false;
  }
  return true;
};
```

**v0.8.0 (JIT-compiled):**
```typescript
// Generated at schema definition time
const validateUser = new Function('data', `
  if (typeof data !== 'object' || data === null) return false;
  if (typeof data.name !== 'string') return false;
  if (typeof data.age !== 'number' || Number.isNaN(data.age)) return false;
  if (typeof data.email !== 'string') return false;
  return true;
`);
```

**Benefits:**
- Direct property access (`data.name` vs `data[keys[i]]`)
- Inlined type checks (no function call overhead)
- Monomorphic code (V8 optimizes better)
- No closure scope chain lookup

### v0.8.0 Phases

#### Phase 7: JIT Primitive Validators 🔥 HIGHEST PRIORITY

**Target:** Surpass Valibot on primitives (180 ns → 50 ns)

```typescript
// Current: 180 ns
const validateString = (data: unknown) => typeof data === 'string';

// v0.8.0: ~50 ns (target)
const validateString = new Function('data', 'return typeof data === "string"');
```

**Expected Impact:** +100-200% on primitives

#### Phase 8: JIT Object Validators 🔥 HIGH PRIORITY

**Target:** Surpass Valibot on complex objects (2.5 µs → 500 ns)

```typescript
// Generate optimized code per schema shape
function compileObjectValidator(shape) {
  const checks = Object.keys(shape).map(key =>
    `if (!v_${key}(data.${key})) return false;`
  ).join('\n');

  return new Function('data', ...validators, `
    if (typeof data !== 'object' || data === null) return false;
    ${checks}
    return true;
  `);
}
```

**Expected Impact:** +100-300% on complex objects

#### Phase 9: JIT Array Validators

**Target:** Surpass Valibot on primitive arrays (1.1 µs → 150 ns)

```typescript
// Loop unrolling for small arrays + optimized iteration
const validateArray = new Function('arr', 'validate', `
  const len = arr.length;
  for (let i = 0; i < len; i++) {
    if (!validate(arr[i])) return false;
  }
  return true;
`);
```

**Expected Impact:** +200-400% on primitive arrays

### v0.8.0 Target Performance

| Category | v0.7.5 | v0.8.0 Target | vs Valibot |
|----------|--------|---------------|------------|
| Primitives | 180 ns | **50 ns** | **2x FASTER** |
| Simple objects | 120 ns | **60 ns** | **3.5x FASTER** |
| Complex nested | 2.5 µs | **500 ns** | **2x FASTER** |
| Primitive arrays | 1.1 µs | **150 ns** | **2x FASTER** |
| Unions | 107 ns | **50 ns** | **9x FASTER** |
| Object arrays | 5.0 µs | **2 µs** | **competitive** |

**v0.8.0 Victory Condition:** Surpass Valibot in ALL 6 categories

### v0.8.0 Research Tasks

Before implementation:

- [ ] Profile current validators with `node --prof` to confirm bottlenecks
- [ ] Benchmark `new Function()` vs closure in isolation
- [ ] Study [TypeBox TypeCompiler](https://github.com/sinclairzx81/typebox) source code
- [ ] Study [ArkType](https://github.com/arktypeio/arktype) implementation
- [ ] Test JIT approach in browsers with CSP restrictions
- [ ] Measure memory impact of JIT code strings
- [ ] Design graceful fallback for CSP-restricted environments

### Implementation Risks

| Risk | Mitigation |
|------|------------|
| CSP blocks `new Function()` | Feature detection + closure fallback |
| Debugging JIT code is hard | `NO_JIT=1` env var for debug mode |
| Bundle size increase | Accept trade-off (performance > size for v0.8.0) |
| Property name edge cases | Sanitize keys, escape special characters |

---

## v0.9.0: Modular Design (Bundle Size)

**Status:** 📋 Future
**Goal:** Tree-shakable API (13.5 kB → 1-2 kB)

### Valibot's Approach

```typescript
// Current propval (imports everything)
import { v } from 'property-validator';
v.string().min(5).max(10);

// v0.9.0 modular API
import { string, minLength, maxLength, pipe } from 'property-validator/modular';
pipe(string(), minLength(5), maxLength(10));
```

### Implementation

**Dual API (backwards compatible):**
- Keep `v` namespace for existing users
- Add `property-validator/modular` entry point
- Each function independently importable

---

## v1.0.0: Stable Release

**Prerequisites:**
- ✅ v0.7.5 complete (profiling-driven optimizations)
- ⬜ v0.8.0 complete (JIT compilation - surpass Valibot)
- ⬜ v0.9.0 complete (modular design)
- ⬜ Documentation complete
- ⬜ Real-world testing
- ⬜ API frozen

**Release Criteria:**
- 537+ tests passing
- Zero runtime dependencies
- Surpasses Valibot in 6/6 categories
- Bundle size < 2 kB (modular)
- Dogfooding passes

---

## Historical Reference

### v0.6.0 → v0.7.0 Journey

**Key Optimizations:**
1. **Return original object** instead of deep copy (+239-291%)
2. **Flatten compiled properties** (parallel arrays vs objects, +8-10%)
3. **Inline property access** via `new Function()` (+61x for pre-compiled)
4. **Recursive compilation** - attempted and reverted (regression)

**Result:** Object arrays went from 1.9x slower than Zod to 1.7x FASTER

### v0.7.0 → v0.7.5 Journey

**Benchmarking Migration:**
- Migrated from tinybench (±19.4% variance) to tatami-ng (±0.86% variance)
- See `docs/BENCHMARKING_MIGRATION.md` for details

**Key Optimizations:**
- Empty refinement skip, Result allocation elimination, lazy path building, pre-compiled validators
- Phase 6 achieved +214% on simple objects

**Result:** Competitive with Valibot (2 wins, 3 losses)

---

## Research References

**Competitor Analysis:**
- [TypeBox](https://github.com/sinclairzx81/typebox) - JIT via JSON Schema
- [Typia](https://typia.io/) - AOT via TS transformer
- [ArkType](https://arktype.io/) - JIT + shift-reduce parser
- [Valibot](https://valibot.dev/) - Modular design, closure-based

**V8 Optimization:**
- [V8 Hidden Classes](https://dev.to/maxprilutskiy/hidden-classes-the-javascript-performance-secret-that-changed-everything-3p6c)
- [V8 Function Optimization](https://erdem.pl/2019/08/v-8-function-optimization/)
- [eval() vs new Function()](https://2ality.com/2014/01/eval.html)

**Benchmarks:**
- [moltar/typescript-runtime-type-benchmarks](https://github.com/moltar/typescript-runtime-type-benchmarks)
- [Typia 15,000x faster](https://dev.to/samchon/typia-15000x-faster-validator-and-its-histories-1fmg)

---

**Last Updated:** 2026-01-04
**Next Review:** After v0.8.0 Phase 7 implementation
