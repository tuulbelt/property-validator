# Performance Baseline - v0.7.0

**Date:** 2026-01-03
**Version:** v0.7.0 (after Phase 1-3 optimizations, before v0.7.5)
**Purpose:** Baseline for v0.7.5 micro-optimization research
**Hardware:** Standard benchmark environment
**Node.js:** v20.x

---

## 🎯 Purpose

This baseline establishes performance metrics AFTER v0.7.0 Phase 1-3 optimizations. All v0.7.5 micro-optimizations must be compared against these numbers to ensure:

1. ✅ **Zero regression** in any category
2. ✅ **Targeted improvements** based on profiling data
3. ✅ **Net positive** impact across all benchmark categories

**Abort Trigger:** >5% regression in any category without compensating gains elsewhere

---

## 📊 Baseline Performance (property-validator v0.7.0)

### Primitives

| Benchmark | ops/sec | Average (ns) | Margin | Status |
|-----------|---------|--------------|--------|--------|
| string (valid) | **2,933,305** | 340.91 | ±18.33% | 🟢 Baseline |
| number (valid) | **3,605,943** | 277.32 | ±2.77% | 🟢 Baseline |
| boolean (valid) | **3,543,817** | 282.18 | ±3.08% | 🟢 Baseline |
| string (invalid) | **3,799,580** | 263.19 | ±2.45% | 🟢 Baseline |

**Average primitive performance:** ~3.5M ops/sec

### Objects

| Benchmark | ops/sec | Average (ns) | Margin | Status |
|-----------|---------|--------------|--------|--------|
| simple (valid) | **1,794,721** | 557.19 | ±2.42% | 🟢 Baseline |
| simple (invalid - missing) | **1,696,229** | 589.54 | ±1.65% | 🟢 Baseline |
| simple (invalid - wrong type) | **1,767,436** | 565.79 | ±1.68% | 🟢 Baseline |
| complex nested (valid) | **243,158** | 4112.54 | ±2.80% | 🟢 Baseline |
| complex nested (invalid) | **445,756** | 2243.38 | ±2.56% | 🟢 Baseline |

**Valid simple object performance:** 1.79M ops/sec

### Arrays

#### Object Arrays (Compiled)

| Benchmark | ops/sec | Average (ns) | Margin | Status |
|-----------|---------|--------------|--------|--------|
| small (10 items) | **133,913** | 7467.54 | ±5.70% | 🟢 Baseline |
| medium (100 items) | **33,268** | 30058.83 | ±2.70% | 🟢 Baseline |
| large (1000 items) | **3,412** | 293097.30 | ±3.86% | 🟢 Baseline |

#### Mixed Arrays

| Benchmark | ops/sec | Average (ns) | Margin | Status |
|-----------|---------|--------------|--------|--------|
| small (10 items) | **169,033** | 5916.00 | ±3.02% | 🟢 Baseline |
| medium (100 items) | **18,469** | 54143.33 | ±3.17% | 🟢 Baseline |
| large (1000 items) | **1,938** | 515958.58 | ±2.89% | 🟢 Baseline |

#### Primitive Arrays (Optimized)

| Benchmark | ops/sec | Average (ns) | Margin | Status |
|-----------|---------|--------------|--------|--------|
| string[] small (10) | **876,638** | 1140.72 | ±1.97% | 🟢 Baseline |
| string[] medium (100) | **737,696** | 1355.57 | ±1.74% | 🟢 Baseline |
| string[] large (1000) | **312,930** | 3195.61 | ±6.27% | 🟢 Baseline |
| number[] small (10) | **852,901** | 1172.47 | ±2.18% | 🟢 Baseline |
| boolean[] small (10) | **769,171** | 1300.10 | ±9.61% | 🟢 Baseline |

#### Array Edge Cases

| Benchmark | ops/sec | Average (ns) | Margin | Status |
|-----------|---------|--------------|--------|--------|
| invalid (early rejection) | **1,631,353** | 612.99 | ±6.98% | 🟢 Baseline |
| invalid (late rejection) | **302,584** | 3304.87 | ±2.89% | 🟢 Baseline |

### Unions

| Benchmark | ops/sec | Average (ns) | Margin | Status |
|-----------|---------|--------------|--------|--------|
| string match (1st) | **7,277,880** | 137.40 | ±0.53% | 🟢 Baseline |
| number match (2nd) | **5,874,456** | 170.23 | ±2.05% | 🟢 Baseline |
| boolean match (3rd) | **5,781,090** | 172.98 | ±2.10% | 🟢 Baseline |
| no match (all fail) | **1,994,382** | 501.41 | ±2.43% | 🟢 Baseline |

**Average union performance:** ~6.2M ops/sec

### Optional & Nullable

| Benchmark | ops/sec | Average (ns) | Margin | Status |
|-----------|---------|--------------|--------|--------|
| optional: present | **2,404,536** | 415.88 | ±1.78% | 🟢 Baseline |
| optional: absent | **3,281,237** | 304.76 | ±0.32% | 🟢 Baseline |
| nullable: non-null | **2,694,238** | 371.16 | ±1.10% | 🟢 Baseline |
| nullable: null | **2,957,321** | 338.14 | ±0.79% | 🟢 Baseline |

### Refinements

| Benchmark | ops/sec | Average (ns) | Margin | Status |
|-----------|---------|--------------|--------|--------|
| pass (single) | **3,617,409** | 276.44 | ±3.03% | 🟢 Baseline |
| fail (single) | **2,772,938** | 360.63 | ±3.11% | 🟢 Baseline |
| pass (chained) | **8,855,249** | 112.93 | ±2.96% | 🟢 Baseline |
| fail (chained - 1st) | **6,436,913** | 155.35 | ±30.74% | ⚠️ High variance |
| fail (chained - 2nd) | **7,021,390** | 142.42 | ±0.84% | 🟢 Baseline |

**Average refinement performance:** ~5.7M ops/sec

---

## 📈 Performance Summary

**Strengths (vs v0.4.0):**
- ✅ Objects: 1.79M ops/sec (was 1.47M in v0.4.0) - **+22% improvement**
- ✅ Arrays: 134k ops/sec for object arrays (was ~48k in v0.4.0) - **+179% improvement**
- ✅ Primitives: 3.5M ops/sec average
- ✅ Unions: 6.2M ops/sec average
- ✅ Refinements: 5.7M ops/sec average

**v0.7.0 Optimizations Applied:**
- Phase 1: Fast API design (pre-validated schemas)
- Phase 2: Array compilation (pre-compiled validation functions)
- Phase 3: CSP fallback (Content Security Policy compatibility)

**Target for v0.7.5:**
- +10-30% cumulative improvement via profiling-identified micro-optimizations
- Focus on closing gap with valibot while maintaining zero-dependency principle

---

## 🔬 Profiling Insights (for v0.7.5)

**Verified Bottlenecks (via V8 profiling):**
1. validator._validateWithPath overhead - 4.3% CPU
2. validateWithPath function overhead - 2.5-3.7% CPU
3. Primitive validator closures - 1.4-3.4% CPU
4. Fast API refinement loop - 1.6-2.3% CPU

**NOT Bottlenecks:**
- WeakSet circular reference checks - 0% CPU
- Depth/property counting - 0% CPU

See `profiling/ANALYSIS.md` for complete V8 profiling data.

---

## 📝 Version History

- **v0.4.0** (2026-01-02): Initial baseline before hybrid compilation
- **v0.7.0** (2026-01-03): After Phase 1-3 optimizations (+179% array performance)
- **v0.7.5** (In Progress): Micro-optimizations based on V8 profiling

---

**Last Updated:** 2026-01-03
**Captured From:** `/tmp/v0.7.0-baseline.txt`
**Next Update:** After v0.7.5 optimizations are finalized
