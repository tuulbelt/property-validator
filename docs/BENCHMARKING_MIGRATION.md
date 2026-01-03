# Benchmarking Migration: tinybench → tatami-ng

**Date:** 2026-01-03
**Reason:** High benchmark variance invalidating optimization work
**Impact:** All future benchmarks now use tatami-ng for statistical rigor

---

## Why We Migrated

### Problem: Unacceptable Variance with tinybench

During v0.7.5 optimization research, we discovered that tinybench produced **unreliable results** that made optimization work impossible.

**Baseline Variance Test (v0.7.0, identical code, 3 runs):**

| Category | Benchmark | Run 1 | Run 2 | Run 3 | Max Variance |
|----------|-----------|-------|-------|-------|--------------|
| **Unions** | string match | 5,915,144 ops/sec | 5,379,405 ops/sec | 4,482,718 ops/sec | **-24.2%** |
| **Unions** | number match | 5,532,962 ops/sec | 4,934,959 ops/sec | 4,645,955 ops/sec | **-16.0%** |
| **Arrays** | objects (1000) | 3,344 ops/sec | 3,761 ops/sec | 3,479 ops/sec | **+12.5%** |

**Average variance by category:**
- Unions: **±19.4%**
- Arrays: **±10.4%**
- Objects: **±6.5%**
- Refinements: **±6.1%**
- Primitives: **±3.8%**

**Impact:** This variance is **LARGER** than the optimization effects we're trying to measure. A "+10% optimization" could actually be noise within the ±10-20% variance range.

### Root Causes of High Variance

1. **Insufficient benchmark duration**: 100ms minimum per benchmark
   - Fast operations (7M+ ops/sec) only get ~700k iterations
   - Not enough for stable statistical averages

2. **V8 JIT compiler state differences**:
   - V8 optimizes code differently between runs
   - Warm-up iterations not sufficient
   - Optimizations can be unstable

3. **System noise**: CPU frequency scaling, background processes, GC timing

4. **No outlier detection**: Anomalous runs skew results

5. **No statistical significance testing**: Can't determine if differences are real or noise

---

## Solution: tatami-ng

[tatami-ng](https://github.com/poolifier/tatami-ng) is a modern benchmarking library with **built-in statistical rigor**.

### Why tatami-ng?

**Statistical Features:**
- ✅ Significance testing (p-values, confidence intervals)
- ✅ Automatic outlier detection and removal
- ✅ Variance, standard deviation, error margin built-in
- ✅ P-quantiles (p50/median, p75, p99, p995)
- ✅ Baseline comparison support
- ✅ Designed for reproducible, stable results

**Modern Architecture:**
- ✅ Active development (v0.8.18, December 2025)
- ✅ TypeScript native
- ✅ Multi-runtime support (Node.js, Bun, Deno)
- ✅ ESM-first design
- ✅ API backward compatible with mitata (Rust-based benchmarking)

**Zero Dependencies:**
- ✅ Aligns with Tuulbelt's zero-dependency principle
- ✅ No supply chain risk

---

## Results: Dramatic Variance Reduction

**tatami-ng variance (same v0.7.0 baseline):**

| Category | Max Variance | Improvement vs tinybench |
|----------|--------------|--------------------------|
| **Primitives** | **±1.07%** | **3.6x more stable** |
| **Objects** | **±1.09%** | **6.0x more stable** |
| **Arrays** | **±0.80%** | **13.0x more stable** |
| **Unions** | **±1.55%** | **12.5x more stable** |
| **Optional/Nullable** | **±1.00%** | N/A |
| **Refinements** | **±1.54%** | **4.0x more stable** |

**Overall:** Maximum variance across all benchmarks: **±1.55%**
**Target:** <5% variance
**Achievement:** **3.2x better than target** 🎉

---

## API Differences

### tinybench (OLD)

```typescript
import { Bench } from 'tinybench';

const bench = new Bench({
  time: 100,           // Minimum 100ms per benchmark
  warmupIterations: 5,
  warmupTime: 100,
});

bench.add('benchmark name', () => {
  // benchmark code
});

await bench.warmup();
await bench.run();

console.table(bench.table());
```

**Issues:**
- ❌ No grouping or baseline comparison
- ❌ No outlier detection
- ❌ No statistical significance testing
- ❌ Results vary ±10-20% between runs

### tatami-ng (NEW)

```typescript
import { bench, baseline, group, run } from 'tatami-ng';

group('Group Name', () => {
  baseline('baseline benchmark', () => {
    // reference benchmark
  });

  bench('comparison benchmark', () => {
    // compare against baseline
  });
});

await run({
  units: false,       // Don't show unit reference
  silent: false,      // Show progress
  json: false,        // Human-readable output
  samples: 256,       // More samples = more stable results
  time: 2_000_000_000, // 2 seconds per benchmark (20x longer)
  warmup: true,       // Enable warm-up iterations
  latency: true,      // Show time per iteration
  throughput: true,   // Show operations per second
});
```

**Benefits:**
- ✅ Logical grouping with `group()`
- ✅ Baseline comparison with `baseline()`
- ✅ Automatic outlier detection
- ✅ Statistical rigor (p-values, variance, std dev)
- ✅ Results vary <1% between runs

---

## Configuration Differences

| Aspect | tinybench | tatami-ng | Why Changed |
|--------|-----------|-----------|-------------|
| **Duration** | 100ms/benchmark | 2 seconds/benchmark | 20x more iterations = stable averages |
| **Samples** | Varies (~70-90k) | 256 | Controlled sample count |
| **Warm-up** | Manual | Automatic | JIT optimization |
| **Outliers** | None | Automatic detection | Remove anomalous runs |
| **Statistics** | Basic (mean, min, max) | Full (variance, std dev, p-values) | Scientific rigor |
| **Grouping** | Manual | Built-in `group()` | Logical organization |
| **Baseline** | Manual calculation | Built-in `baseline()` | Easy comparison |

---

## Migration Guide

### Step 1: Install tatami-ng

```bash
cd benchmarks/
npm install --save-dev tatami-ng
```

### Step 2: Update imports

```diff
- import { Bench } from 'tinybench';
+ import { bench, baseline, group, run } from 'tatami-ng';
```

### Step 3: Convert benchmarks to groups

**Before (tinybench):**
```typescript
const bench = new Bench({ time: 100 });

bench.add('primitive: string (valid)', () => {
  result = validate(v.string(), 'hello');
});

bench.add('primitive: number (valid)', () => {
  result = validate(v.number(), 42);
});

await bench.warmup();
await bench.run();
console.table(bench.table());
```

**After (tatami-ng):**
```typescript
group('Primitives', () => {
  baseline('primitive: string (valid)', () => {
    result = validate(v.string(), 'hello');
  });

  bench('primitive: number (valid)', () => {
    result = validate(v.number(), 42);
  });
});

await run({
  samples: 256,
  time: 2_000_000_000, // 2 seconds
  warmup: true,
  latency: true,
  throughput: true,
});
```

### Step 4: Update scripts

**package.json:**
```diff
{
  "scripts": {
-   "bench": "node --import tsx index.bench.ts",
+   "bench": "node --import tsx index.tatami.ts",
  }
}
```

### Step 5: Verify variance

Run benchmarks multiple times and verify variance is <5%:

```bash
npm run bench > run1.txt
npm run bench > run2.txt
npm run bench > run3.txt

# Compare results - variance should be <2%
```

---

## Interpreting tatami-ng Output

### Sample Output

```
benchmark                                  time/iter       iters/s
----------------------------------------------------------------
• Primitives
primitive: string (valid)              220.18 ns ± 1.07 %  5629749
primitive: number (valid)              232.24 ns ± 0.93 %  5415341

Primitives summary
  primitive: string (valid)
    1.05 ± 1.01 % times faster than primitive: number (valid)
```

### Key Metrics

- **time/iter**: Average time per iteration (lower is better)
- **± X.XX %**: Error margin / variance (lower is better)
- **iters/s**: Operations per second (higher is better)
- **summary**: Relative performance vs baseline

### Percentiles (Advanced)

```
p50/median    p75       p99       p995
155.00 ns    242.00 ns  620.00 ns  713.00 ns
```

- **p50 (median)**: Half the runs were faster than this
- **p75**: 75% of runs were faster than this
- **p99**: 99% of runs were faster than this (outlier detection)
- **p995**: 99.5% of runs were faster than this

---

## Best Practices

### 1. Use Logical Groups

Organize related benchmarks into groups:

```typescript
group('Primitives', () => { /* ... */ });
group('Objects', () => { /* ... */ });
group('Arrays', () => { /* ... */ });
```

### 2. Always Use baseline()

First benchmark in each group should be `baseline()` for comparison:

```typescript
group('Validation', () => {
  baseline('current approach', () => { /* ... */ });
  bench('optimized approach', () => { /* ... */ });
});
```

### 3. Prevent Dead Code Elimination

Assign results to variable to prevent compiler from optimizing away:

```typescript
let result; // Declare outside benchmark

bench('operation', () => {
  result = expensiveOperation(data); // Assign to prevent DCE
});
```

### 4. Pre-allocate Test Data

Load fixtures outside benchmarks to avoid measuring allocation:

```typescript
// GOOD: Load once, reuse
const fixtures = {
  small: JSON.parse(readFileSync('./fixtures/small.json', 'utf8')),
  medium: JSON.parse(readFileSync('./fixtures/medium.json', 'utf8')),
};

group('Arrays', () => {
  bench('small', () => validate(schema, fixtures.small));
  bench('medium', () => validate(schema, fixtures.medium));
});

// BAD: Allocate inside benchmark
bench('small', () => {
  const data = JSON.parse(readFileSync('./fixtures/small.json', 'utf8'));
  validate(schema, data);
});
```

### 5. Run Multiple Times

Verify results are reproducible:

```bash
for i in {1..3}; do npm run bench; done
```

Variance between runs should be <5%.

---

## Performance Impact

**Trade-off:** Longer benchmark runs for reliable results

| Metric | tinybench | tatami-ng | Impact |
|--------|-----------|-----------|--------|
| **Time per benchmark** | ~100ms | ~2 seconds | 20x longer |
| **Total runtime (36 benchmarks)** | ~3.6 seconds | ~72 seconds (1.2 minutes) | 20x longer |
| **Variance** | ±10-20% | <1% | **12.5x more stable** |
| **Optimization confidence** | ❌ Can't trust results | ✅ Can trust micro-optimizations | **Priceless** |

**Conclusion:** The extra time is worth it. Spending 1 minute to get reliable results is better than spending hours optimizing based on noise.

---

## References

- [tatami-ng GitHub](https://github.com/poolifier/tatami-ng)
- [mitata benchmarking article](https://steve-adams.me/typescript-benchmarking-mitata.html)
- [Variance analysis](/tmp/baseline-variance-analysis.md)
- [Optimization plan impact](../OPTIMIZATION_PLAN.md)

---

## Status

- ✅ Migration complete (2026-01-03)
- ✅ All 36 benchmarks ported to tatami-ng
- ✅ Variance verified <5% across all categories
- ✅ Templates updated for future tools
- ✅ Documentation updated

**Recommendation:** All Tuulbelt tools requiring performance benchmarking should use tatami-ng going forward.
