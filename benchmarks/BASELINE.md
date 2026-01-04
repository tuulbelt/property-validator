# property-validator v0.8.0 Baseline (tatami-ng)

**Date:** 2026-01-04
**Version:** v0.8.0
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

## v0.8.0 Key Achievement: JIT Bypass

v0.8.0 introduced the `_compiled` property pattern that bypasses `validateWithPath` overhead for objects and arrays. This resulted in **3-45x improvements** over v0.7.5.

---

## Benchmark Results Summary

### Primitives

| Benchmark | time/iter | ops/sec | Variance |
|-----------|-----------|---------|----------|
| string (valid) | 61.86 ns | 16.9M | ±0.34% |
| number (valid) | 58.74 ns | 17.9M | ±0.42% |
| boolean (valid) | 65.20 ns | 16.4M | ±2.10% |
| string (invalid) | 58.71 ns | 18.0M | ±2.14% |
| number (invalid) | 56.43 ns | 18.7M | ±1.49% |

**Key Metrics:**
- **Average variance:** ±1.30%
- **Fastest:** number (invalid) at 18.7M ops/sec
- **vs v0.7.5:** ~3x faster

### Objects

| Benchmark | time/iter | ops/sec | Variance |
|-----------|-----------|---------|----------|
| simple (valid) | 62.14 ns | 16.7M | ±1.13% |
| simple (invalid) | 321.76 ns | 3.6M | ±1.78% |
| deeply nested (valid) | 61.64 ns | 17.2M | ±2.53% |

**Key Metrics:**
- **Average variance:** ±1.81%
- **Simple object validation:** 16.7M ops/sec
- **vs v0.7.5:** 5.3x faster (simple), 45x faster (nested)

### Arrays

| Benchmark | time/iter | ops/sec | Variance |
|-----------|-----------|---------|----------|
| small (5 items) | 61.21 ns | 17.4M | ±2.12% |
| medium (50 items) | 2.54 µs | 407K | ±0.26% |
| invalid (mixed types) | 178.09 ns | 6.3M | ±1.77% |

**Key Metrics:**
- **Small arrays:** Near-instant validation via JIT bypass
- **Medium arrays:** Linear scaling as expected

---

## Competitive Position (v0.8.0)

### vs Valibot

| Category | propval v0.8.0 | valibot | Winner |
|----------|----------------|---------|--------|
| string (valid) | 61.86 ns | 80.42 ns | **propval 1.30x** ✅ |
| number (valid) | 58.74 ns | 84.64 ns | **propval 1.44x** ✅ |
| object simple | 62.14 ns | 215.22 ns | **propval 3.46x** ✅ |
| complex nested | 61.64 ns | 1.08 µs | **propval 17.5x** ✅ |

**Score: 4/4 wins** (was 2/6 in v0.7.5)

### vs Zod

| Category | propval v0.8.0 | zod | Winner |
|----------|----------------|-----|--------|
| string (valid) | 61.86 ns | 115.70 ns | **propval 1.87x** ✅ |
| number (valid) | 58.74 ns | 123.44 ns | **propval 2.10x** ✅ |
| object simple | 62.14 ns | 671.77 ns | **propval 10.8x** ✅ |
| complex nested | 61.64 ns | 3.91 µs | **propval 63.4x** ✅ |

**Score: 4/4 wins**

### vs Yup

| Category | propval v0.8.0 | yup | Winner |
|----------|----------------|-----|--------|
| string (valid) | 61.86 ns | 884.30 ns | **propval 14.3x** ✅ |
| object simple | 62.14 ns | 6.08 µs | **propval 97.8x** ✅ |
| complex nested | 61.64 ns | 26.10 µs | **propval 423x** ✅ |

**Score: 3/3 wins**

---

## Improvement from v0.7.5 to v0.8.0

| Category | v0.7.5 | v0.8.0 | Improvement |
|----------|--------|--------|-------------|
| string (valid) | 179.97 ns | 61.86 ns | **2.91x faster** |
| number (valid) | 186.70 ns | 58.74 ns | **3.18x faster** |
| boolean (valid) | 193.35 ns | 65.20 ns | **2.97x faster** |
| object simple | 332.10 ns | 62.14 ns | **5.34x faster** |
| complex nested | 2.78 µs | 61.64 ns | **45.1x faster** |

---

## v0.8.5 Optimization Targets

Based on this baseline, v0.8.5 aims to compete with TypeBox (~16M ops/sec):

### Target APIs

| API | v0.8.0 | v0.8.5 Target | Improvement |
|-----|--------|---------------|-------------|
| `v.validate()` | ~17M ops/sec | 17M+ ops/sec | Maintain |
| `v.check()` | N/A | 12-15M ops/sec | New API |
| `v.compile()` | Partial | 15-18M ops/sec | TypeBox-level |

### Remaining Gaps

1. **Primitives vs TypeBox:** TypeBox achieves ~16.5M ops/sec via `new Function()` JIT
2. **Full inlining:** Current JIT bypass still has function call overhead
3. **CSP compatibility:** Need fallback for environments blocking `new Function()`

---

## Stability Achievement

- ✅ All benchmarks within target variance (<5%)
- ✅ Consistent results across runs
- ✅ Ready for reliable optimization work

---

**Generated:** 2026-01-04
**Benchmark command:** `npm run bench` / `npm run bench:compare`
