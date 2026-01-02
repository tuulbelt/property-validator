# Property Validator Benchmarks

Performance benchmarks comparing property-validator against popular validation libraries (zod, yup).

## Quick Start

```bash
# Run property-validator benchmarks only
npm run bench

# Run full comparison (property-validator + zod + yup)
npm run bench:compare
```

## Benchmark Environment

- **Tool:** tinybench v2.9.0
- **Runtime:** Node.js v22.21.1
- **Warmup:** 5 iterations, 100ms
- **Minimum time:** 100ms per benchmark
- **Platform:** Linux (x86_64)

## Performance Summary

### Overall Winner: Property Validator 🏆

Property-validator delivers **2-15x faster** validation across most scenarios compared to zod and yup.

| Category | property-validator | zod | yup | Winner |
|----------|-------------------|-----|-----|--------|
| **Primitives** | 3.4 - 3.8 M ops/sec | 375k - 597k ops/sec | 492k - 514k ops/sec | property-validator (6-10x faster) |
| **Objects (simple)** | 861k ops/sec | 948k ops/sec | 111k ops/sec | zod (10% faster than pv) |
| **Objects (complex)** | 195k ops/sec | 200k ops/sec | 34k ops/sec | Similar (pv/zod ~5x faster than yup) |
| **Arrays (10 items)** | 32k ops/sec | 115k ops/sec | 10.7k ops/sec | **zod** (3.6x faster than pv) |
| **Arrays (100 items)** | 3.3k ops/sec | 14.2k ops/sec | 1.1k ops/sec | **zod** (4.3x faster than pv) |
| **Arrays (1000 items)** | 330 ops/sec | 1.4k ops/sec | 111 ops/sec | **zod** (4.2x faster than pv) |
| **Unions** | 1.6 - 6.4 M ops/sec | 1.2 - 3.4 M ops/sec | 723k - 736k ops/sec | property-validator (2-5x faster) |
| **Refinements** | 2.4 - 7.8 M ops/sec | 336k - 510k ops/sec | 41k - 585k ops/sec | property-validator (5-15x faster) |

**Update (2026-01-02):** After implementing path pooling optimizations for both arrays and objects, array performance improved by **+39%** (23k → 32k ops/sec for 10 items). However, zod remains **3.6-4.3x faster** on array validation. See [Performance Optimization Analysis](#performance-optimization-analysis) below for details on the remaining gap.

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

| Operation | property-validator | zod | yup | Speedup (vs zod) | Speedup (vs yup) |
|-----------|-------------------|-----|-----|------------------|------------------|
| small (10 items) | 23,207 ops/sec | 110,304 ops/sec | 9,867 ops/sec | **0.21x (zod 4.7x faster)** | **2.4x** |
| medium (100 items) | 2,330 ops/sec | 9,488 ops/sec | 1,038 ops/sec | **0.25x (zod 4x faster)** | **2.2x** |
| large (1000 items) | 228 ops/sec | 1,317 ops/sec | 96 ops/sec | **0.17x (zod 5.7x faster)** | **2.4x** |
| invalid (early rejection) | 590,058 ops/sec | N/A | N/A | N/A | N/A |
| invalid (late rejection) | 14,861 ops/sec | N/A | N/A | N/A | N/A |

**Analysis:** 🚨 **Performance Gap Identified** - Zod is 4-6x faster on array validation. This represents a significant optimization opportunity for property-validator.

**Likely cause:** property-validator may be performing unnecessary allocations or validation passes per array element.

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

Based on these benchmarks, the following optimizations are recommended:

### High Priority
1. **Array Validation Performance** 🚨
   - Current: 23k ops/sec (10 items), 2.3k ops/sec (100 items), 228 ops/sec (1000 items)
   - Zod: 110k ops/sec (10 items), 9.4k ops/sec (100 items), 1.3k ops/sec (1000 items)
   - **Gap:** 4-6x slower than zod
   - **Recommendation:** Profile array validator to identify unnecessary allocations or validation passes

2. **Compiled Schema Functionality**
   - Fix or investigate why compiled benchmarks return N/A
   - If working correctly, compiled schemas should provide 2-5x speedup over non-compiled

### Medium Priority
3. **Simple Object Validation**
   - Current: 861k ops/sec
   - Zod: 948k ops/sec
   - **Gap:** 10% slower than zod
   - **Recommendation:** Minor tuning possible, but gap is acceptable

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
**Benchmark Version:** v0.4.0
**property-validator Version:** v0.4.0
