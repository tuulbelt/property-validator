# property-validator v0.7.0 Baseline (tatami-ng)

**Date:** 2026-01-03
**Version:** v0.7.0
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

## Benchmark Results Summary

### Primitives

| Benchmark | time/iter | ops/sec | Variance | p50 | p75 | p99 |
|-----------|-----------|---------|----------|-----|-----|-----|
| string (valid) | 210.25 ns | 5.98M | ±1.11% | 146 ns | 235 ns | 585 ns |
| number (valid) | 218.19 ns | 5.91M | ±0.94% | 145 ns | 237 ns | 664 ns |
| boolean (valid) | 207.35 ns | 6.16M | ±0.90% | 141 ns | 226 ns | 625 ns |
| string (invalid) | 235.42 ns | 5.37M | ±0.83% | 159 ns | 277 ns | 636 ns |

**Key Metrics:**
- **Average variance:** ±0.95% (13.1x better than tinybench's ±19.4%)
- **Fastest:** boolean (valid) at 6.16M ops/sec
- **Relative performance:** boolean ~1.04x faster than string (valid)

### Objects

| Benchmark | time/iter | ops/sec | Variance | p50 | p75 | p99 |
|-----------|-----------|---------|----------|-----|-----|-----|
| simple (valid) | 386.67 ns | 3.06M | ±1.03% | 289 ns | 400 ns | 928 ns |
| simple (invalid - missing) | 537.53 ns | 2.18M | ±0.74% | 403 ns | 570 ns | 1.26 µs |
| simple (invalid - wrong type) | 469.74 ns | 2.52M | ±0.81% | 346 ns | 476 ns | 1.17 µs |
| complex nested (valid) | 3.14 µs | 343K | ±0.37% | 2.83 µs | 3.13 µs | 5.94 µs |
| complex nested (invalid - deep) | 2.19 µs | 504K | ±0.59% | 1.86 µs | 2.07 µs | 4.11 µs |

**Key Metrics:**
- **Average variance:** ±0.71%
- **Simple object validation:** 3.06M ops/sec
- **Complex nested validation:** 343K ops/sec
- **Early rejection advantage:** Invalid (deep) is ~1.43x faster than valid (deep)

### Arrays

| Benchmark | time/iter | ops/sec | Variance | p50 | p75 | p99 |
|-----------|-----------|---------|----------|-----|-----|-----|
| **Compiled (object arrays)** |
| small (10 items) | 5.63 µs | 194K | ±0.42% | 4.90 µs | 5.35 µs | 11.95 µs |
| medium (100 items) | 52.49 µs | 20.5K | ±0.49% | 45.92 µs | 50.47 µs | 194.21 µs |
| large (1000 items) | 505.74 µs | 2.03K | ±0.61% | 472.09 µs | 499.27 µs | 892.75 µs |
| **Mixed arrays** |
| small (10 items) | 3.18 µs | 344K | ±0.43% | 2.83 µs | 3.16 µs | 6.27 µs |
| medium (100 items) | 19.46 µs | 55.7K | ±0.45% | 17.30 µs | 18.97 µs | 40.21 µs |
| large (1000 items) | 176.95 µs | 5.93K | ±0.54% | 162.09 µs | 178.91 µs | 395.73 µs |
| **Optimized (primitive arrays)** |
| string[] small (10 items) | 1.10 µs | 1.02M | ±0.68% | 946 ns | 1.13 µs | 2.12 µs |
| string[] medium (100 items) | 2.93 µs | 370K | ±0.39% | 2.57 µs | 2.82 µs | 5.70 µs |
| string[] large (1000 items) | 17.54 µs | 60.2K | ±0.41% | 16.06 µs | 16.85 µs | 31.87 µs |
| number[] small (10 items) | 1.03 µs | 1.07M | ±0.71% | 901 ns | 1.03 µs | 1.83 µs |
| boolean[] small (10 items) | 1.04 µs | 1.06M | ±0.69% | 906 ns | 1.05 µs | 1.89 µs |
| **Invalid arrays** |
| early rejection | 1.18 µs | 932K | ±0.70% | 1.03 µs | 1.19 µs | 2.16 µs |
| late rejection | 3.14 µs | 352K | ±0.40% | 2.71 µs | 3.01 µs | 6.38 µs |

**Key Metrics:**
- **Average variance:** ±0.53%
- **Optimized arrays:** 5.2-5.7x faster than compiled object arrays
- **Primitive arrays:** 1M+ ops/sec for small arrays
- **Scaling:** Linear (10x items → ~10x time)

### Unions

| Benchmark | time/iter | ops/sec | Variance | p50 | p75 | p99 |
|-----------|-----------|---------|----------|-----|-----|-----|
| string (1st option) | 113.50 ns | 10.36M | ±1.31% | 90 ns | 95 ns | 367 ns |
| number (2nd option) | 132.79 ns | 9.07M | ±1.24% | 100 ns | 107 ns | 436 ns |
| boolean (3rd option) | 142.60 ns | 8.51M | ±1.42% | 106 ns | 115 ns | 455 ns |
| no match (all fail) | 453.57 ns | 2.54M | ±0.83% | 352 ns | 457 ns | 1.04 µs |

**Key Metrics:**
- **Average variance:** ±1.20%
- **Position matters:** 1st option is 1.26x faster than 3rd
- **Fastest union:** 10.36M ops/sec (1st option match)
- **All-fail overhead:** 4.00x slower than 1st option

### Optional/Nullable

| Benchmark | time/iter | ops/sec | Variance | p50 | p75 | p99 |
|-----------|-----------|---------|----------|-----|-----|-----|
| optional: present | 379.06 ns | 3.33M | ±0.77% | 308 ns | 405 ns | 938 ns |
| optional: absent | 370.93 ns | 3.46M | ±0.81% | 300 ns | 402 ns | 933 ns |
| nullable: non-null | 395.18 ns | 3.27M | ±0.85% | 312 ns | 434 ns | 1.01 µs |
| nullable: null | 368.18 ns | 3.59M | ±0.84% | 300 ns | 408 ns | 948 ns |

**Key Metrics:**
- **Average variance:** ±0.82%
- **Absent values faster:** ~1.04x faster than present values
- **Null values faster:** ~1.07x faster than optional present

### Refinements

| Benchmark | time/iter | ops/sec | Variance | p50 | p75 | p99 |
|-----------|-----------|---------|----------|-----|-----|-----|
| pass (single) | 232.11 ns | 5.46M | ±1.04% | 158 ns | 247 ns | 662 ns |
| fail (single) | 273.32 ns | 4.58M | ±0.89% | 188 ns | 290 ns | 753 ns |
| pass (chained) | 92.58 ns | 12.59M | ±1.32% | 75 ns | 80 ns | 259 ns |
| fail (chained - 1st) | 105.68 ns | 11.42M | ±1.29% | 83 ns | 87 ns | 390 ns |
| fail (chained - 2nd) | 108.09 ns | 10.66M | ±1.37% | 87 ns | 97 ns | 288 ns |

**Key Metrics:**
- **Average variance:** ±1.18%
- **Chained faster:** 2.51x faster than single refinement
- **Fast path optimization:** Chained refinements benefit from early exits

### Compiled

| Benchmark | time/iter | ops/sec | Variance | p50 | p75 | p99 |
|-----------|-----------|---------|----------|-----|-----|-----|
| simple object (valid) | 416.20 ns | 2.92M | ±1.09% | 295 ns | 465 ns | 1.02 µs |
| simple object (invalid) | 484.68 ns | 2.43M | ±0.69% | 363 ns | 489 ns | 1.14 µs |

**Key Metrics:**
- **Average variance:** ±0.89%
- **Compilation advantage:** Compiled validators ~4.5% slower than optimized (2.92M vs 3.06M)

---

## Overall Statistics

**Variance Analysis:**
- **Average variance across all benchmarks:** ±0.86%
- **Maximum variance:** ±1.42% (union: boolean match 3rd option)
- **Minimum variance:** ±0.37% (object: complex nested valid)
- **Target variance:** <5% ✅ ACHIEVED (13.1x better than tinybench's ±19.4%)

**Performance Tiers:**
1. **Refinements (chained pass):** 12.59M ops/sec
2. **Unions (1st match):** 10.36M ops/sec
3. **Primitives (boolean):** 6.16M ops/sec
4. **Objects (simple):** 3.06M ops/sec
5. **Arrays (primitive, small):** 1.07M ops/sec
6. **Arrays (object, small):** 194K ops/sec
7. **Objects (complex nested):** 343K ops/sec

**Optimization Opportunities (for v0.7.5):**
Based on this baseline, the following areas show potential for optimization:
1. **Refinement loop overhead** - Empty refinement checks still iterate (Phase 1)
2. **Fast API Result allocation** - Object creation on every validation (Phase 2)
3. **Primitive validator closures** - Function call overhead (Phase 3)
4. **Path building** - String concatenation overhead (Phase 4)

**Stability Achievement:**
- ✅ All benchmarks within target variance (<5%)
- ✅ 13.1x more stable than tinybench
- ✅ Ready for reliable optimization work

---

## Comparison vs Competitors

**See:** `BASELINE_COMPARISON.md` for complete head-to-head comparison with zod, yup, and valibot.

**Quick Summary:**
- **vs valibot:** 2.1x slower on primitives (optimization target), 4.3x faster on unions
- **vs zod:** 5.9x faster on primitives, 1.9x faster on objects
- **vs yup:** 7.2x faster on primitives, 16.4x faster on objects

**v0.7.5 Goal:** Close the 1.6-3.1x performance gap with valibot while maintaining significant lead over zod/yup.

---

## Baseline Usage

This baseline serves as the reference point for:
1. **v0.7.5 optimization work** - Measure improvements against these numbers
2. **Regression testing** - Ensure future changes don't degrade performance
3. **Competitor comparison** - Documented in `BASELINE_COMPARISON.md`

**Next Steps:**
1. Implement v0.7.5 Phase 1: Skip empty refinement loop
2. Benchmark after Phase 1 and compare to this baseline
3. Document improvements in OPTIMIZATION_PLAN.md
4. Iterate through remaining phases

---

**Generated:** 2026-01-03
**Benchmark command:** `npm run bench`
**Raw output:** `/tmp/pv-v0.7.0-complete-comparison.txt`
