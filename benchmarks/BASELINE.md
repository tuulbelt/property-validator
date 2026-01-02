# Performance Baseline - v0.4.0 (Pre-v0.6.0)

**Date:** 2026-01-02
**Version:** v0.4.0
**Purpose:** Baseline for v0.6.0 hybrid compilation implementation
**Hardware:** Standard benchmark environment
**Node.js:** v20.x

---

## 🎯 Purpose

This baseline establishes current performance metrics BEFORE implementing hybrid compilation for arrays (v0.6.0). All future benchmarks must be compared against these numbers to ensure:

1. ✅ **Zero regression** in categories where we're already faster (primitives, objects, unions, refinements)
2. ✅ **2.5x improvement** in array performance (target: 48k → 120k ops/sec)
3. ✅ **Competitive with zod** in all 5 categories

**Abort Trigger:** >5% regression in any baseline category

---

## 📊 Baseline Performance (property-validator v0.4.0)

### Primitives

| Benchmark | ops/sec | Average (ns) | Margin | Status |
|-----------|---------|--------------|--------|--------|
| string (valid) | **3,503,296** | 285.45 | ±2.10% | 🟢 Protect |
| number (valid) | **4,244,294** | 235.61 | ±0.65% | 🟢 Protect |
| boolean (valid) | **3,643,098** | 274.49 | ±13.59% | 🟢 Protect |
| string (invalid) | **3,963,352** | 252.31 | ±2.09% | 🟢 Protect |

**Average primitive performance:** ~3.8M ops/sec

### Objects

| Benchmark | ops/sec | Average (ns) | Margin | Status |
|-----------|---------|--------------|--------|--------|
| simple (valid) | **1,466,597** | 681.85 | ±1.11% | 🟢 Protect |
| simple (invalid - missing) | 62,062 | 16,112.98 | ±1.30% | 🟢 Protect |
| simple (invalid - wrong type) | 63,449 | 15,760.80 | ±0.99% | 🟢 Protect |
| complex nested (valid) | 262,256 | 3,813.07 | ±2.31% | 🟢 Protect |
| complex nested (invalid) | 35,136 | 28,461.00 | ±2.96% | 🟢 Protect |

**Valid simple object performance:** 1.47M ops/sec

### Arrays (TARGET FOR IMPROVEMENT)

| Benchmark | ops/sec | Average (ns) | Margin | Target | Improvement Needed |
|-----------|---------|--------------|--------|--------|-------------------|
| small (10 items) | **45,139** | 22,153.82 | ±2.67% | **120,000** | **+166%** 🎯 |
| medium (100 items) | **4,906** | 203,844.52 | ±2.78% | **12,000** | **+145%** 🎯 |
| large (1000 items) | **475** | 2,104,271.60 | ±2.90% | **1,200** | **+153%** 🎯 |
| invalid (early rejection) | 35,722 | 27,994.34 | ±0.70% | maintain | - |
| invalid (late rejection) | 22,722 | 44,010.87 | ±2.03% | maintain | - |

**Current array (10 items) performance:** 45,139 ops/sec
**Target after v0.6.0:** 120,000 ops/sec (+166%)

### Unions

| Benchmark | ops/sec | Average (ns) | Margin | Status |
|-----------|---------|--------------|--------|--------|
| string match (1st) | **6,066,446** | 164.84 | ±1.32% | 🟢 Protect |
| number match (2nd) | **6,496,719** | 153.92 | ±1.74% | 🟢 Protect |
| boolean match (3rd) | **5,313,300** | 188.21 | ±2.25% | 🟢 Protect |
| no match (all fail) | 1,637,643 | 610.63 | ±2.61% | 🟢 Protect |

**Average union performance:** ~6.0M ops/sec (first match)

### Optional & Nullable

| Benchmark | ops/sec | Average (ns) | Margin | Status |
|-----------|---------|--------------|--------|--------|
| optional: present | **2,240,679** | 446.29 | ±1.19% | 🟢 Protect |
| optional: absent | **2,395,149** | 417.51 | ±0.34% | 🟢 Protect |
| nullable: non-null | **2,243,143** | 445.80 | ±1.99% | 🟢 Protect |
| nullable: null | **2,314,246** | 432.11 | ±0.37% | 🟢 Protect |

**Average optional/nullable performance:** ~2.3M ops/sec

### Refinements

| Benchmark | ops/sec | Average (ns) | Margin | Status |
|-----------|---------|--------------|--------|--------|
| pass (single) | **2,635,975** | 379.37 | ±3.99% | 🟢 Protect |
| fail (single) | 2,021,338 | 494.72 | ±28.57% | 🟢 Protect |
| pass (chained) | **7,499,021** | 133.35 | ±3.41% | 🟢 Protect |
| fail (chained - 1st) | **6,961,618** | 143.64 | ±0.32% | 🟢 Protect |
| fail (chained - 2nd) | **6,042,802** | 165.49 | ±1.92% | 🟢 Protect |

**Chained refinement performance:** 7.5M ops/sec

---

## 🆚 Comparison vs Zod (Competitors)

### Primitives

| Benchmark | property-validator | zod | Ratio | Winner |
|-----------|-------------------|-----|-------|--------|
| string (valid) | 3,503,296 | 698,068 | **5.0x faster** | ✅ **pv** |
| number (valid) | 4,244,294 | 722,339 | **5.9x faster** | ✅ **pv** |
| string (invalid) | 3,963,352 | 382,835 | **10.3x faster** | ✅ **pv** |

**Verdict:** We DOMINATE primitives (5-10x faster)

### Objects

| Benchmark | property-validator | zod | Ratio | Winner |
|-----------|-------------------|-----|-------|--------|
| simple (valid) | 1,466,597 | 1,201,371 | **1.22x faster** | ✅ **pv** |
| simple (invalid) | 62,906 (avg) | 510,941 | 8.1x slower | ❌ zod |
| complex nested (valid) | 262,256 | 194,519 | **1.35x faster** | ✅ **pv** |

**Verdict:** We win for valid objects, zod wins for invalid (better error perf)

### Arrays (CRITICAL - This is what v0.6.0 fixes)

| Benchmark | property-validator | zod | Ratio | Winner |
|-----------|-------------------|-----|-------|--------|
| small (10 items) | **45,139** | **118,360** | **2.6x slower** ❌ | zod |
| medium (100 items) | **4,906** | **13,437** | **2.7x slower** ❌ | zod |
| large (1000 items) | **475** | **1,208** | **2.5x slower** ❌ | zod |

**Verdict:** zod WINS arrays by 2.5-2.7x (THIS IS THE GAP WE MUST CLOSE)

**Target after v0.6.0:** Match or beat zod (45k → 120k+ ops/sec)

### Unions

| Benchmark | property-validator | zod | Ratio | Winner |
|-----------|-------------------|-----|-------|--------|
| string match | 6,066,446 | 4,078,498 | **1.49x faster** | ✅ **pv** |
| number match | 6,496,719 | 1,480,687 | **4.39x faster** | ✅ **pv** |

**Verdict:** We DOMINATE unions (1.5-4.4x faster)

### Optional

| Benchmark | property-validator | zod | Ratio | Winner |
|-----------|-------------------|-----|-------|--------|
| present | 2,240,679 | 411,448 | **5.4x faster** | ✅ **pv** |
| absent | 2,395,149 | 403,446 | **5.9x faster** | ✅ **pv** |

**Verdict:** We DOMINATE optional (5.4-5.9x faster)

### Refinements

| Benchmark | property-validator | zod | Ratio | Winner |
|-----------|-------------------|-----|-------|--------|
| pass | 2,635,975 | 474,058 | **5.6x faster** | ✅ **pv** |
| fail | 2,021,338 | 316,809 | **6.4x faster** | ✅ **pv** |

**Verdict:** We DOMINATE refinements (5.6-6.4x faster)

---

## 📈 Summary Scorecard

### Current State (v0.4.0)

| Category | Winner | Gap | Status |
|----------|--------|-----|--------|
| **Primitives** | ✅ **property-validator** | 5-10x faster | 🟢 Maintain |
| **Objects** | ✅ **property-validator** | 1.2-1.4x faster | 🟢 Maintain |
| **Arrays** | ❌ **zod** | 2.5-2.7x slower | 🔴 **FIX IN v0.6.0** |
| **Unions** | ✅ **property-validator** | 1.5-4.4x faster | 🟢 Maintain |
| **Optional** | ✅ **property-validator** | 5.4-5.9x faster | 🟢 Maintain |
| **Refinements** | ✅ **property-validator** | 5.6-6.4x faster | 🟢 Maintain |

**Current Score:** 5 wins, 1 loss (83% win rate)
**Target after v0.6.0:** 6 wins, 0 losses (100% win rate) 🎯

---

## 🎯 v0.6.0 Success Criteria

### Performance Targets

**Must Achieve:**
1. ✅ Arrays (10 items): ≥120,000 ops/sec (currently 45,139)
2. ✅ Arrays (100 items): ≥12,000 ops/sec (currently 4,906)
3. ✅ Arrays (1000 items): ≥1,200 ops/sec (currently 475)

**Must Maintain (Zero Regression):**
1. ✅ Primitives: ≥3.3M ops/sec (baseline: 3.8M avg)
2. ✅ Objects (simple): ≥1.4M ops/sec (baseline: 1.47M)
3. ✅ Unions: ≥5.9M ops/sec (baseline: 6.0M avg)
4. ✅ Refinements: ≥7.0M ops/sec (baseline: 7.5M)
5. ✅ Optional/nullable: ≥2.2M ops/sec (baseline: 2.3M avg)

**Abort Triggers:**
- ❌ Any category drops >5% from baseline
- ❌ Arrays don't achieve ≥100k ops/sec (at least 2x improvement)
- ❌ Any existing test fails

---

## 🔬 Methodology

**Benchmark Tool:** tinybench v2.9.0
**Iterations:** Automatic (100ms minimum per benchmark)
**Warm-up:** 5 iterations (automatic)
**Statistical Analysis:** Mean, margin of error, sample count

**Environment:**
- Node.js v20.x
- Standard benchmark machine
- No other processes running
- Consistent across runs

**Repeatability:**
Results are stable across runs (margins typically <5%). High margins (>10%) indicate:
- JIT compilation variance (acceptable for single refinement fail: ±28.57%)
- GC interference (rare, re-run if suspected)

---

## 📝 How to Use This Baseline

### Before Making Changes

1. Read this baseline completely
2. Understand protected categories (primitives, objects, unions, refinements)
3. Note target improvements (arrays: +166%)

### During Implementation

1. Make incremental changes
2. Run benchmarks after EACH change:
   ```bash
   npm run bench
   ```
3. Compare results against this baseline
4. **ABORT if any protected category drops >5%**

### After Implementation

1. Run full benchmark suite:
   ```bash
   npm run bench:compare
   ```
2. Verify all success criteria met
3. Document results in ROADMAP.md
4. Update this file with "AFTER v0.6.0" section

---

## 🚨 Red Flags

**STOP and REVERT if you see:**

❌ Primitives drop below 3.3M ops/sec (currently 3.8M avg)
❌ Objects drop below 1.4M ops/sec (currently 1.47M)
❌ Unions drop below 5.9M ops/sec (currently 6.0M avg)
❌ Refinements drop below 7.0M ops/sec (currently 7.5M)
❌ Arrays don't improve to at least 90k ops/sec (2x target)

**These indicate the optimization is adding runtime overhead!**

---

## 🎉 Success Indicators

**GOOD signs during implementation:**

✅ Arrays improve to 100k+ ops/sec (2x improvement)
✅ All other categories stay within 5% of baseline
✅ All 526 tests continue to pass
✅ No new runtime dependencies added

**GREAT signs:**

✅ Arrays reach 120k+ ops/sec (2.6x improvement, matches zod)
✅ Arrays beat zod (>120k ops/sec)
✅ Zero regression in any category
✅ Compilation is simple and maintainable

---

**Last Updated:** 2026-01-02
**Next Update:** After v0.6.0 implementation complete
**Maintained By:** property-validator core team
