# Property Validator v0.9.2 Baseline Comparison

**Last Updated:** 2026-01-05
**Benchmark Framework:** tatami-ng v0.8.18
**Node.js:** v22.21.1
**Configuration:** 256 samples × 2 seconds per benchmark
**Variance Target:** <5%

---

## Executive Summary

property-validator v0.9.2 demonstrates **excellent performance** compared to established validation libraries (Zod, Valibot, TypeBox).

**Key Findings:**
- ✅ **1.7-10x faster** than Zod across all categories
- ✅ **1.1-7.6x faster** than Valibot across all categories
- ⚠️ **Close to TypeBox JIT** — within 20-60% on most scenarios

**vs Zod:** 5/5 wins ✅
**vs Valibot:** 5/5 wins ✅
**vs TypeBox JIT:** 0/5 wins (TypeBox uses `new Function()` JIT)

**Architecture Note:** TypeBox achieves peak performance via `new Function()` JIT compilation, which is blocked in CSP-restricted environments. Property Validator works everywhere including strict CSP environments while remaining competitive.

---

## Detailed Comparison Tables

### 1. Primitives (String Validation - Valid)

| Library | Time/Iter | Ops/Sec | vs propval |
|---------|-----------|---------|------------|
| **property-validator** | 69 ns | 14.5M | 1.0x (baseline) |
| **TypeBox JIT** | 58 ns | 17.2M | **1.2x faster** |
| **Valibot** | 84 ns | 11.9M | 1.2x slower |
| **Zod** | 120 ns | 8.3M | 1.7x slower |

**Analysis:** TypeBox JIT is fastest for primitives. Property Validator beats Valibot (1.2x) and Zod (1.7x).

---

### 2. Simple Objects (Valid)

| Library | Time/Iter | Ops/Sec | vs propval |
|---------|-----------|---------|------------|
| **property-validator** | 67 ns | 14.9M | 1.0x (baseline) |
| **TypeBox JIT** | 59 ns | 16.9M | **1.1x faster** |
| **Valibot** | 220 ns | 4.5M | 3.3x slower |
| **Zod** | 668 ns | 1.5M | 10.0x slower |

**Analysis:** Property Validator is virtually tied with TypeBox JIT. Significantly faster than Valibot (3.3x) and Zod (10x).

---

### 3. Complex Nested Objects (Valid)

| Library | Time/Iter | Ops/Sec | vs propval |
|---------|-----------|---------|------------|
| **property-validator** | 162 ns | 6.2M | 1.0x (baseline) |
| **TypeBox JIT** | 118 ns | 8.5M | **1.4x faster** |
| **Valibot** | 1.11 µs | 0.9M | 6.9x slower |
| **Zod** | 4.14 µs | 0.24M | 25.6x slower |

**Analysis:** TypeBox leads on complex nested objects. Property Validator is massively faster than Valibot (6.9x) and Zod (25.6x).

---

### 4. Unions (String Match - 1st Option)

| Library | Time/Iter | Ops/Sec | vs propval |
|---------|-----------|---------|------------|
| **property-validator** | 85 ns | 11.8M | 1.0x (baseline) |
| **TypeBox JIT** | 60 ns | 16.7M | **1.4x faster** |
| **Valibot** | 93 ns | 10.8M | 1.1x slower |
| **Zod** | 220 ns | 4.5M | 2.6x slower |

**Analysis:** Property Validator is competitive with TypeBox on unions. Faster than Valibot (1.1x) and Zod (2.6x).

---

### 5. Arrays (100 Items - Valid)

| Library | Time/Iter | Ops/Sec | vs propval |
|---------|-----------|---------|------------|
| **property-validator** | 197 ns | 5.1M | 1.0x (baseline) |
| **TypeBox JIT** | 122 ns | 8.2M | **1.6x faster** |
| **Valibot** | 1.49 µs | 0.67M | 7.6x slower |
| **Zod** | 5.06 µs | 0.20M | 25.7x slower |

**Analysis:** TypeBox leads on arrays. Property Validator is much faster than Valibot (7.6x) and Zod (25.7x).

---

## Performance Summary by Category

| Category | vs Zod | vs Valibot | vs TypeBox JIT |
|----------|--------|------------|----------------|
| **Primitives** | 1.7x faster ✅ | 1.2x faster ✅ | 1.2x slower |
| **Simple Objects** | 10.0x faster ✅ | 3.3x faster ✅ | 1.1x slower |
| **Complex Nested** | 25.6x faster ✅ | 6.9x faster ✅ | 1.4x slower |
| **Unions** | 2.6x faster ✅ | 1.1x faster ✅ | 1.4x slower |
| **Arrays (100)** | 25.7x faster ✅ | 7.6x faster ✅ | 1.6x slower |

---

## API Tiers Comparison (v0.9.2)

Property Validator offers three API tiers for different use cases:

| Scenario | validate() | check() | compileCheck() |
|----------|------------|---------|----------------|
| Primitives (String) | 69 ns | 62 ns | 62 ns |
| Primitives (Number) | 66 ns | 62 ns | 58 ns |
| Simple Object | 67 ns | 64 ns | 65 ns |
| Complex Nested | 162 ns | 145 ns | 138 ns |
| Array (10) | 74 ns | 68 ns | 68 ns |
| Array (100) | 197 ns | 183 ns | 180 ns |
| Union (String) | 85 ns | 76 ns | 63 ns |
| Invalid Data | 384 ns | 62 ns | 60 ns |

**Key Insight:** For invalid data, `check()` and `compileCheck()` are **6.2x faster** than `validate()` because they skip the error path entirely.

---

## Architectural Differences

### property-validator
- **Approach:** JIT-compiled validators with closure-based fast path
- **API Tiers:** `validate()` (detailed errors), `check()` (boolean), `compileCheck()` (pre-compiled)
- **CSP:** Works in all environments (no `new Function()`)
- **Strengths:** Great DX, flexible API, security limits, CSP-compatible
- **Trade-offs:** ~20-60% slower than TypeBox JIT on most scenarios

### TypeBox
- **Approach:** `new Function()` JIT compilation for maximum speed
- **API:** `Value.Check()` (dynamic), `TypeCompiler.Check()` (compiled)
- **CSP:** Blocked in CSP-restricted environments (uses `new Function()`)
- **Strengths:** Peak raw performance
- **Trade-offs:** CSP limitations, less detailed error messages

### Valibot
- **Approach:** Modular validation pipelines
- **API:** `safeParse()` returning rich results
- **Strengths:** Small bundle size, good tree-shaking
- **Trade-offs:** 1.1-7.6x slower than property-validator

### Zod
- **Approach:** Centralized validation engine
- **API:** `safeParse()` with detailed error objects
- **Strengths:** Rich error messages, excellent TypeScript integration
- **Trade-offs:** 1.7-25.7x slower than property-validator

---

## Variance Analysis

All libraries achieved excellent measurement stability with tatami-ng:

| Library | Average Variance | Notes |
|---------|------------------|-------|
| **property-validator** | ±0.5-1.5% | ✅ Excellent |
| **TypeBox** | ±0.3-1.2% | ✅ Excellent |
| **Valibot** | ±0.4-1.8% | ✅ Excellent |
| **Zod** | ±0.3-2.5% | ✅ Very Good |

---

## When to Use Which Library

| Requirement | Recommendation |
|-------------|----------------|
| Maximum raw speed | TypeBox (if no CSP) |
| CSP-restricted environment | Property Validator |
| Need detailed errors + good perf | Property Validator |
| Smallest bundle size | Valibot |
| Rich TypeScript ecosystem | Zod |
| High-throughput + CSP compatibility | Property Validator + `compileCheck()` |

---

## Future Optimization Targets

Property Validator v0.9.5+ could potentially match TypeBox through:

1. **JIT Phase 2:** Inlined primitive validation via `new Function()` (opt-in, with CSP fallback)
2. **Compiled Union Fast Path:** Pre-analyze discriminant keys for O(1) matching
3. **Array JIT Unrolling:** Generate unrolled loops for fixed-size arrays

Current architecture prioritizes DX and CSP compatibility over raw speed, which is the right trade-off for most applications.

---

## Conclusion

Property Validator v0.9.2 delivers:

- ✅ **Competitive with TypeBox JIT** (within 20-60%)
- ✅ **Faster than Valibot** across all categories (1.1-7.6x)
- ✅ **Much faster than Zod** across all categories (1.7-25.7x)
- ✅ **CSP-compatible** (works everywhere)
- ✅ **Three API tiers** for speed vs. detail trade-offs

For most applications, the ~20-60% speed difference vs TypeBox JIT is negligible compared to I/O latency, while Property Validator's DX advantages (detailed errors, CSP compatibility, flexible APIs) provide significant practical benefits.

---

**References:**
- [tatami-ng Benchmarking Guide](https://github.com/poolifier/tatami-ng)
- [TypeBox Repository](https://github.com/sinclairzx81/typebox)
- [Valibot Repository](https://github.com/fabian-hiller/valibot)
- [Zod Repository](https://github.com/colinhacks/zod)
