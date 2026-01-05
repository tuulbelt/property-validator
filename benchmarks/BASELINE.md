# property-validator v0.9.2 Baseline (tatami-ng)

**Date:** 2026-01-05
**Version:** v0.9.2
**Tool:** tatami-ng v0.8.18
**Runtime:** Node.js v22.21.1
**Platform:** Linux (x86_64)

**Configuration:**
- Samples: 256 per benchmark
- Duration: 2 seconds per benchmark
- Warm-up: Enabled (JIT optimization)
- Outlier detection: Automatic
- Target variance: <5%

---

## v0.9.2 Key Features

v0.9.2 introduces modular architecture with tree-shakeable imports and multiple entry points:
- `/v` entry point for fluent API (`v.string().email()`)
- `/lite` entry point for functional API without `v` namespace
- `/types` entry point for type definitions only
- Named exports from main entry for tree-shaking

---

## Benchmark Results Summary

### Primitives

| Benchmark | time/iter | ops/sec | Variance |
|-----------|-----------|---------|----------|
| string (valid) | 69 ns | 14.5M | ±0.86% |
| number (valid) | 66 ns | 15.2M | ±0.93% |
| boolean (valid) | 68 ns | 14.7M | ±1.07% |

**Key Metrics:**
- **Average variance:** ±0.95%
- **Fastest:** number (valid) at 15.2M ops/sec

### Objects

| Benchmark | time/iter | ops/sec | Variance |
|-----------|-----------|---------|----------|
| simple (valid) | 67 ns | 14.9M | ±1.13% |
| complex nested (valid) | 162 ns | 6.2M | ±1.54% |
| invalid data | 384 ns | 2.6M | ±1.07% |

**Key Metrics:**
- **Simple objects:** 14.9M ops/sec
- **Complex nested:** 6.2M ops/sec

### Arrays

| Benchmark | time/iter | ops/sec | Variance |
|-----------|-----------|---------|----------|
| array (10 items) | 74 ns | 13.5M | ±1.21% |
| array (100 items) | 197 ns | 5.1M | ±0.86% |

### Unions

| Benchmark | time/iter | ops/sec | Variance |
|-----------|-----------|---------|----------|
| union (string match) | 85 ns | 11.8M | ±1.07% |

---

## API Tiers Comparison (v0.9.2)

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

**Key Insight:** For invalid data, `check()` and `compileCheck()` are **6.2x faster** than `validate()`.

---

## Competitive Position (v0.9.2)

### vs Zod

| Category | propval | zod | Winner |
|----------|---------|-----|--------|
| primitives | 69 ns | 120 ns | **propval 1.7x** ✅ |
| simple object | 67 ns | 668 ns | **propval 10.0x** ✅ |
| complex nested | 162 ns | 4.14 µs | **propval 25.6x** ✅ |
| unions | 85 ns | 220 ns | **propval 2.6x** ✅ |
| arrays (100) | 197 ns | 5.06 µs | **propval 25.7x** ✅ |

**Score: 5/5 wins**

### vs Valibot

| Category | propval | valibot | Winner |
|----------|---------|---------|--------|
| primitives | 69 ns | 84 ns | **propval 1.2x** ✅ |
| simple object | 67 ns | 220 ns | **propval 3.3x** ✅ |
| complex nested | 162 ns | 1.11 µs | **propval 6.9x** ✅ |
| unions | 85 ns | 93 ns | **propval 1.1x** ✅ |
| arrays (100) | 197 ns | 1.49 µs | **propval 7.6x** ✅ |

**Score: 5/5 wins**

### vs TypeBox JIT

| Category | propval | TypeBox JIT | Winner |
|----------|---------|-------------|--------|
| primitives | 69 ns | 58 ns | TypeBox 1.2x |
| simple object | 67 ns | 59 ns | TypeBox 1.1x |
| complex nested | 162 ns | 118 ns | TypeBox 1.4x |
| unions | 85 ns | 60 ns | TypeBox 1.4x |
| arrays (100) | 197 ns | 122 ns | TypeBox 1.6x |

**Score: 0/5 wins** (TypeBox uses `new Function()` JIT)

**Note:** TypeBox achieves peak performance via `new Function()` JIT compilation, which is blocked in CSP-restricted environments. Property Validator works everywhere.

---

## Version History

| Version | Key Improvement | Impact |
|---------|-----------------|--------|
| v0.7.0 | tatami-ng migration | Reliable benchmarks (<2% variance) |
| v0.7.5 | Lazy path building | +24-30% on arrays |
| v0.8.0 | JIT bypass pattern | **3-45x faster** |
| v0.8.5 | check()/compileCheck() APIs | 6x faster for invalid data |
| v0.9.0 | Modular architecture | Tree-shakeable imports |
| v0.9.1 | Functional refinements | `string(email(), minLength(5))` |
| v0.9.2 | Multiple entry points | `/v`, `/lite`, `/types` |

---

## Stability Achievement

- ✅ All benchmarks within target variance (<5%)
- ✅ Average variance: ~1% (excellent)
- ✅ Consistent results across runs
- ✅ Ready for reliable optimization work

---

**Generated:** 2026-01-05
**Benchmark command:** `npm run bench` / `npm run bench:all`
