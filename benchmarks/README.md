# Performance Benchmarks

This directory contains performance benchmarks for the property validator.

## Running Benchmarks

```bash
npx tsx benchmarks/performance.bench.ts
```

## Benchmark Results (v0.4.0 Phase 2)

### Optimization Phase 2: Fast Path for Primitives

**Date:** 2026-01-02
**Optimization:** Added inline fast paths for plain primitive validators in `compile()`

#### String Validation

| Metric | Non-Compiled | Compiled | Improvement |
|--------|--------------|----------|-------------|
| ops/sec | 33,012,354 | 112,963,333 | **3.42x faster** |
| ns/op | 30.29 | 8.85 | **70.8% faster** |

**Result:** ✅ 242% performance improvement for compiled strings

#### Number Validation

| Metric | Non-Compiled | Compiled | Improvement |
|--------|--------------|----------|-------------|
| ops/sec | ~24M | ~100M+ | **4x+ faster** (estimated) |

#### Boolean Validation

| Metric | Non-Compiled | Compiled | Improvement |
|--------|--------------|----------|-------------|
| ops/sec | ~29M | ~120M+ | **4x+ faster** (estimated) |

#### Object Validation

| Metric | Non-Compiled | Compiled | Improvement |
|--------|--------------|----------|-------------|
| ops/sec | 1,301,228 | 1,268,883 | No optimization |

**Note:** Objects currently use the generic validation path. Future optimization: inline field validation for simple objects.

### Performance Characteristics

1. **Primitives are fast:** 15M-30M ops/sec (non-compiled), 100M+ ops/sec (compiled)
2. **Objects scale with field count:**
   - 3 fields: ~1.3M ops/sec
   - 10 fields: ~520K ops/sec
3. **Arrays scale linearly:**
   - 5 items: ~4.8M ops/sec
   - 100 items: ~356K ops/sec
   - 1000 items: ~44K ops/sec
4. **Compiled primitives:** 3-4x faster than non-compiled

### Optimization Details

**Fast Path Conditions:**

Compiled validators use fast path if:
- Validator is a primitive type (`string`, `number`, `boolean`)
- No transformations (`.transform()`)
- No default values (`.default()`)
- No refinements (`.refine()`)

**Fast Path Implementation:**

```typescript
// Example: Compiled string validator
if (typeof data === 'string') {
  return { ok: true, value: data };
}
return { ok: false, error: `Expected string, got ${typeof data}` };
```

This avoids function call overhead and closure lookups.

### Recommendations

- ✅ **Use `v.compile()` for primitives** in hot paths (3-4x speedup)
- ✅ **Use plain primitives** when possible (faster than refinements)
- ⚠️ **Objects and arrays** show minimal benefit from compilation (for now)
- ℹ️ **Transforms and refinements** bypass fast path (use `validate()` directly)

### Future Optimizations

- [ ] **Phase 2.5:** Inline object field validation for simple objects
- [ ] **Phase 2.6:** Optimize array element validation with pre-allocated result arrays
- [ ] **Phase 2.7:** Short-circuit validation mode (stop on first error)

## Benchmark Methodology

- **Iterations:** 100,000 per benchmark (after 1,000 warmup iterations)
- **Environment:** Node.js native performance measurement
- **Data:** Representative real-world values
- **Consistency:** Run multiple times, results are stable within 5%

## Interpreting Results

- **ops/sec:** Operations per second (higher is better)
- **ns/op:** Nanoseconds per operation (lower is better)
- **Speedup:** Ratio of optimized / baseline (>1 is improvement)
