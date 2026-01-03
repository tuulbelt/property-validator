# Property Validator Benchmarks

Performance benchmarks comparing property-validator against popular validation libraries (zod, yup).

## Quick Start

```bash
# Run property-validator benchmarks only
npm run bench

# Run full comparison (property-validator + zod + yup + valibot)
npm run bench:compare

# Run fast boolean API benchmarks (shows Phase 3 optimizations)
npm run bench:fast
```

## Two Benchmark Suites

Property-validator provides **two separate validation APIs** for different use cases. We benchmark both to give you the complete performance picture:

### Benchmark A: Rich Error API Comparison (`index.bench.ts`)

**Purpose:** Apples-to-apples comparison with competitors (zod, yup, valibot)

**APIs compared:**
- property-validator: `validate(schema, data)` → `Result<T>` (with error details)
- zod: `schema.safeParse(data)` → `{ success, data/error }`
- valibot: `safeParse(schema, data)` → `{ success, output/issues }`
- yup: `schema.validate(data)` → `Promise<T>` or throw

**Use when:** You need to know WHY validation failed (user input, API validation, debugging)

**Results:** See "Detailed Results" section below

---

### Benchmark B: Fast Boolean API (`fast-boolean-api.bench.ts`)

**Purpose:** Show Phase 3 optimization gains (code generation for boolean-only validation)

**APIs compared:**
- property-validator: `schema.validate(data)` → `boolean` ✅ (Phase 3 optimized)
- yup: `schema.isValid(data)` → `Promise<boolean>` ✅ (dedicated boolean API)
- zod: `schema.safeParse(data).success` → `boolean` ⚠️ (fallback - no dedicated API)
- valibot: `safeParse(schema, data).success` → `boolean` ⚠️ (fallback - no dedicated API)

**Use when:** You don't care WHY validation failed, just true/false (hot paths, performance-critical code)

**Performance:**
- **Arrays:** property-validator dominates (73-116x vs zod, 15-46x vs valibot) ✅
- **Objects:** valibot 1.2x faster (valibot 4.1M vs pv 3.5M ops/sec) ⚠️
- **Overall:** Mixed results - strongest on array validation

**Trade-off:** No error messages (just `true` or `false`)

**To run:** `npm run bench:fast`

---

**Which API should you use?**

- **Development/Debugging:** Use `validate(schema, data)` for rich error details
- **Production hot paths:** Use `schema.validate(data)` for maximum performance
- **User input validation:** Use `validate(schema, data)` to show helpful error messages
- **Internal data validation:** Use `schema.validate(data)` if you trust the data

---

## Benchmark Environment

- **Tool:** tinybench v2.9.0
- **Runtime:** Node.js v22.21.1
- **Warmup:** 5 iterations, 100ms
- **Minimum time:** 100ms per benchmark
- **Platform:** Linux (x86_64)

## Performance Summary

### Overall Winner: Competitive but Behind Valibot

Property-validator beats zod in 5/6 categories but trails valibot in most benchmarks. **Valibot wins 5/7 categories** in the main benchmark comparison.

**vs Zod (Rich Error API):**

| Category | property-validator | zod | Winner |
|----------|-------------------|-----|--------|
| **Primitives** | 3.9M ops/sec | 698k ops/sec | property-validator (5.6x faster) ✅ |
| **Objects (simple)** | 1.69M ops/sec | 1.26M ops/sec | property-validator (1.3x faster) ✅ |
| **Primitive Arrays (string[], 10)** | 888k ops/sec | 333k ops/sec | property-validator (2.7x faster) ✅ |
| **Object Arrays (UserSchema[], 10)** | 70k ops/sec | 136k ops/sec | **zod** (1.9x faster) ❌ |
| **Object Arrays (UserSchema[], 100)** | 8k ops/sec | 15k ops/sec | **zod** (1.8x faster) ❌ |
| **Unions** | 7.1M ops/sec | 4.1M ops/sec | property-validator (1.7x faster) ✅ |
| **Refinements** | 7.2M ops/sec | 474k ops/sec | property-validator (15x faster) ✅ |

**Score vs Zod: 5 wins, 2 losses (71% win rate)** 📊

**vs Valibot (Estimated from Phase 3 benchmarks):**

| Category | property-validator | valibot | Winner |
|----------|-------------------|---------|--------|
| **Primitives** | 4.1M ops/sec | 7.6M ops/sec | **valibot** (1.9x faster) ❌ |
| **Objects (simple)** | 2.4M ops/sec | 4.2M ops/sec | **valibot** (1.8x faster) ❌ |
| **Object Arrays (10)** | 137k ops/sec | 571k ops/sec | **valibot** (4.2x faster) ❌ |
| **Object Arrays (100)** | 37k ops/sec | 60k ops/sec | **valibot** (1.6x faster) ❌ |
| **Primitive Arrays** | 998k ops/sec | 2.9M ops/sec | **valibot** (2.9x faster) ❌ |
| **Unions** | 7.1M ops/sec | 1.5M ops/sec | property-validator (4.7x faster) ✅ |
| **Refinements** | 7.2M ops/sec | 5.1M ops/sec | property-validator (1.4x faster) ✅ |

**Score vs Valibot: 2 wins, 5 losses (29% win rate)** ⚠️

**Update (2026-01-02):** v0.6.0 implements hybrid compilation:
- ✅ **Primitive arrays:** Compiled to inline type checks → **2.7x faster than zod**
- ⚠️ **Object arrays:** Compiled object validators → **49% faster than v0.4.0**, but still **1.9x slower than zod**
- **Recommendation:** Object array performance needs further investigation and optimization

## Detailed Results

### Primitives

| Operation | property-validator | zod | yup | Speedup (vs zod) | Speedup (vs yup) |
|-----------|-------------------|-----|-----|------------------|------------------|
| string (valid) | 3,436,776 ops/sec | 597,235 ops/sec | 514,668 ops/sec | **5.8x** | **6.7x** |
| number (valid) | 3,797,308 ops/sec | 597,840 ops/sec | 506,047 ops/sec | **6.4x** | **7.5x** |
| boolean (valid) | 3,404,786 ops/sec | N/A | N/A | N/A | N/A |
| string (invalid) | 3,775,436 ops/sec | 375,519 ops/sec | 492,337 ops/sec | **10.1x** | **7.7x** |

**Analysis:** property-validator's primitive validation is 6-10x faster due to minimal overhead and direct type guards.

### Objects

| Operation | property-validator | zod | yup | Speedup (vs zod) | Speedup (vs yup) |
|-----------|-------------------|-----|-----|------------------|------------------|
| simple (valid) | 861,352 ops/sec | 948,709 ops/sec | 111,042 ops/sec | 0.9x (zod 10% faster) | **7.8x** |
| simple (invalid - missing) | 590,759 ops/sec | N/A | N/A | N/A | N/A |
| simple (invalid - type) | 670,783 ops/sec | 433,340 ops/sec | 27,179 ops/sec | **1.5x** | **24.7x** |
| complex nested (valid) | 195,853 ops/sec | 200,990 ops/sec | 34,770 ops/sec | 0.97x (similar) | **5.6x** |
| complex (invalid - deep) | 61,729 ops/sec | N/A | N/A | N/A | N/A |

**Analysis:** Zod and property-validator have comparable object validation performance. Both significantly outperform yup (5-25x faster).

### Arrays

**v0.6.0 Update:** Arrays now use hybrid compilation - primitives are compiled to inline checks, objects use compiled object validators.

#### Primitive Arrays (string[])

| Operation | property-validator | zod | Speedup (vs zod) |
|-----------|-------------------|-----|------------------|
| small (10 items) | 887,747 ops/sec | 333,365 ops/sec | **2.7x faster** ✅ |
| medium (100 items) | 783,802 ops/sec | N/A | N/A |
| large (1000 items) | 325,641 ops/sec | N/A | N/A |

**Analysis:** ✅ **Hybrid compilation wins** - Inline type checks eliminate allocations, making primitive arrays 2.7x faster than zod.

#### Object Arrays (UserSchema[])

| Operation | property-validator | zod | Speedup (vs zod) |
|-----------|-------------------|-----|------------------|
| small (10 items) | 69,763 ops/sec | 135,841 ops/sec | **0.51x (zod 1.9x faster)** ❌ |
| medium (100 items) | 8,241 ops/sec | 14,969 ops/sec | **0.55x (zod 1.8x faster)** ❌ |
| large (1000 items) | ~800 ops/sec | N/A | N/A |

**Analysis:** ⚠️ **Performance gap remains** - Despite object compilation optimization (+49% vs v0.4.0), zod is still 1.9x faster for object arrays.

**Root cause analysis:**
- **Before v0.6.0:** 40 allocations per 10-item array (10 WeakSets + 30 Result objects)
- **After v0.6.0:** 0 allocations with compiled object validators (+49% improvement)
- **Remaining bottleneck:** Unknown - needs profiling and investigation

**Likely causes:**
1. Closure allocation overhead in compiled validators
2. Property iteration loop performance
3. Function call overhead in fallback paths
4. Zod may use additional optimizations we haven't implemented

### Unions

| Operation | property-validator | zod | yup | Speedup (vs zod) | Speedup (vs yup) |
|-----------|-------------------|-----|-----|------------------|------------------|
| string match (1st) | 6,433,626 ops/sec | 3,451,994 ops/sec | 723,381 ops/sec | **1.9x** | **8.9x** |
| number match (2nd) | 5,634,148 ops/sec | 1,197,681 ops/sec | 736,468 ops/sec | **4.7x** | **7.7x** |
| boolean match (3rd) | 5,029,250 ops/sec | N/A | N/A | N/A | N/A |
| no match (fail all) | 1,665,988 ops/sec | N/A | N/A | N/A | N/A |

**Analysis:** property-validator's union implementation is 2-5x faster than zod, particularly when the match is not the first option.

### Optional / Nullable

| Operation | property-validator | zod | yup | Speedup (vs zod) | Speedup (vs yup) |
|-----------|-------------------|-----|-----|------------------|------------------|
| optional (present) | 2,158,354 ops/sec | 345,118 ops/sec | 203,438 ops/sec | **6.3x** | **10.6x** |
| optional (absent) | 2,269,748 ops/sec | 379,104 ops/sec | 227,528 ops/sec | **6.0x** | **10.0x** |
| nullable (non-null) | 2,140,662 ops/sec | N/A | N/A | N/A | N/A |
| nullable (null) | 2,244,072 ops/sec | N/A | N/A | N/A | N/A |

**Analysis:** property-validator is 6-10x faster for optional/nullable handling.

### Refinements

| Operation | property-validator | zod | yup | Speedup (vs zod) | Speedup (vs yup) |
|-----------|-------------------|-----|-----|------------------|------------------|
| pass (single) | 2,939,236 ops/sec | 510,739 ops/sec | 585,456 ops/sec | **5.8x** | **5.0x** |
| fail (single) | 2,475,424 ops/sec | 336,749 ops/sec | 41,627 ops/sec | **7.4x** | **59.5x** |
| pass (chained) | 7,874,232 ops/sec | N/A | N/A | N/A | N/A |
| fail (chained - 1st) | 6,679,025 ops/sec | N/A | N/A | N/A | N/A |
| fail (chained - 2nd) | 6,004,578 ops/sec | N/A | N/A | N/A | N/A |

**Analysis:** property-validator's refinement implementation is 5-15x faster than competitors, especially for chained refinements.

## Known Issues

### Compiled Schema Benchmarks (N/A Results)

The following benchmarks show "N/A" results:
- `compiled: simple object (valid)`
- `compiled: simple object (invalid)`

**Status:** Under investigation. The `compile()` function may have an issue or the benchmarks need adjustment.

## Optimization Opportunities

Based on v0.6.0 benchmarks, the following optimizations are recommended:

### High Priority
1. **Object Array Validation Performance** 🚨
   - Current: 70k ops/sec (10 items), 8k ops/sec (100 items)
   - Zod: 136k ops/sec (10 items), 15k ops/sec (100 items)
   - **Gap:** 1.9x slower than zod
   - **Progress:** v0.6.0 improved from 46k → 70k ops/sec (+49%) via object compilation
   - **Recommendation:** Profile compiled object validators to find remaining bottlenecks
     - Investigate closure allocation overhead
     - Compare property iteration performance with zod
     - Research zod's source code for additional optimizations

### Completed ✅
2. **Primitive Array Validation**
   - v0.6.0: 888k ops/sec vs zod 333k ops/sec → **2.7x faster** ✅
   - Hybrid compilation successfully eliminated all allocations

3. **Simple Object Validation**
   - v0.6.0: 1.69M ops/sec vs zod 1.26M ops/sec → **1.3x faster** ✅
   - Performance improved and now beats zod

## Interpreting Results

### ops/sec (Operations per Second)
- **Higher is better**
- 1M+ ops/sec = Extremely fast (suitable for hot paths)
- 100k+ ops/sec = Very fast (suitable for request validation)
- 10k+ ops/sec = Fast enough for most use cases
- <1k ops/sec = Consider caching or optimization

### Average (ns)
- **Lower is better**
- Nanoseconds per operation
- Useful for understanding absolute latency

### Margin (%)
- **Lower is better**
- Relative error margin (confidence interval)
- <5% = Very stable, reliable benchmark
- 5-10% = Acceptable stability
- >10% = High variance, results less reliable

## Benchmark Scenarios

### Fixtures
- **small.json**: 10 user objects (~500 bytes)
- **medium.json**: 100 user objects (~5 KB)
- **large.json**: 1000 user objects (~50 KB)

### Coverage
- ✅ Primitive types (string, number, boolean)
- ✅ Object validation (simple and complex nested)
- ✅ Array validation (small, medium, large)
- ✅ Union types
- ✅ Optional and nullable
- ✅ Refinements (single and chained)
- ⚠️ Compiled schemas (benchmarks need fixing)

## Competitor Notes

### Zod
- Synchronous validation
- Similar API design to property-validator
- **Strengths:** Array validation (4-6x faster)
- **Weaknesses:** Primitives (6x slower), refinements (7x slower)

### Yup
- Asynchronous validation by default
- Adds overhead even for simple validations
- **Strengths:** None identified in these benchmarks
- **Weaknesses:** Consistently 2-60x slower across all scenarios
- **Note:** Async overhead makes direct comparison less fair

## Updating Benchmarks

When adding new features to property-validator:

1. **Add benchmark scenarios** to `index.bench.ts`
2. **Add competitor equivalents** to `competitors/zod.bench.ts` and `competitors/yup.bench.ts`
3. **Run comparison:** `npm run bench:compare`
4. **Update this README** with new results and analysis
5. **Document regressions:** If performance drops >20%, investigate before merging

## References

- [BENCHMARKING_STANDARDS.md](../../docs/BENCHMARKING_STANDARDS.md) - Universal Tuulbelt benchmarking framework
- [tinybench Documentation](https://github.com/tinylibs/tinybench)
- [Zod Performance](https://zod.dev)
- [Yup Documentation](https://github.com/jquense/yup)

---

**Last Updated:** 2026-01-02
**Benchmark Version:** v0.6.0
**property-validator Version:** v0.6.0
