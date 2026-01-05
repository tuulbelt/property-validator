# Property Validator Benchmarks

Performance benchmarks for property-validator with honest, methodology-driven comparisons.

## Quick Start

```bash
# Internal API comparison (validate vs check vs compileCheck)
npm run bench

# External comparisons (vs zod, valibot)
npm run bench:external

# All benchmarks
npm run bench:all
```

## Benchmark Structure

```
benchmarks/
├── internal/           # Intra-PV comparison
│   └── api-tiers.bench.ts
├── external/           # Inter-competitor comparison
│   ├── zod.bench.ts
│   ├── valibot.bench.ts
│   └── typebox.bench.ts
├── fixtures/           # Test data (small, medium, large)
└── README.md           # This file
```

## Internal Benchmarks

Compare property-validator's three API tiers:

| API | Returns | Best For |
|-----|---------|----------|
| `validate()` | `Result<T>` with errors | Forms, APIs, debugging |
| `check()` | `boolean` | Filtering, conditionals |
| `compileCheck()` | `boolean` (pre-compiled) | Hot paths, pipelines |

**Latest Results (v0.9.2):**

| Scenario | validate() | check() | compileCheck() |
|----------|------------|---------|----------------|
| Simple Object | ~67 ns | ~64 ns | ~65 ns |
| Complex Nested | ~162 ns | ~145 ns | ~138 ns |
| Array (10 items) | ~74 ns | ~68 ns | ~68 ns |
| Array (100 items) | ~197 ns | ~183 ns | ~180 ns |
| Union (3 types) | ~85 ns | ~76 ns | ~63 ns |
| Invalid Data | ~384 ns | ~62 ns | ~60 ns |

**Key Insights:**
- `check()` is ~10-18% faster than `validate()` for valid data
- `compileCheck()` adds 5-15% on top of `check()` for unions
- Invalid data shows biggest gap: **6.2x faster** (check/compileCheck skip error path)

## External Benchmarks

### API Equivalence Table

Only compare equivalent functionality. If a library doesn't have an equivalent API, it's excluded from that comparison.

| property-validator | Zod | Valibot | TypeBox | Description |
|-------------------|-----|---------|---------|-------------|
| `validate()` | `safeParse()` | `safeParse()` | `Value.Check()` | Full validation with errors |
| `check()` | ❌ | `is()` | `Value.Check()` | Boolean-only check |
| `compileCheck()` | ❌ | ❌ | `TypeCompiler.Check()` | Pre-compiled checker |

### External Comparison Results (v0.9.2)

| Category | property-validator | Zod | Valibot | TypeBox JIT |
|----------|-------------------|-----|---------|-------------|
| Primitives | 69 ns | 120 ns | 84 ns | 58 ns |
| Simple Objects | 67 ns | 668 ns | 220 ns | 59 ns |
| Complex Nested | 162 ns | 4.14 µs | 1.11 µs | 118 ns |
| Unions | 85 ns | 220 ns | 93 ns | 60 ns |
| Arrays (100) | 197 ns | 5.06 µs | 1.49 µs | 122 ns |

**Summary:**
- **vs Zod:** 1.7x - 25.7x faster ✅
- **vs Valibot:** 1.1x - 7.6x faster ✅
- **vs TypeBox JIT:** 1.1x - 1.6x slower (TypeBox uses `new Function()` JIT)

### What We Compare

**Full Validation (validate/safeParse):**
- All three libraries compared
- Returns structured result with error details
- Fair comparison of error-producing validation

**Boolean Check (check/is):**
- Only property-validator and valibot compared
- Zod excluded (no equivalent API)
- Returns boolean only

**Compiled Validation (compileCheck/TypeCompiler):**
- Only property-validator and TypeBox compared
- Zod/Valibot excluded (no equivalent API)
- Pre-compiled for maximum speed

### Why This Matters

Previous benchmarks compared `compileCheck()` to `safeParse()` — that's not fair. Compilers should compete with compilers. Error-producing APIs should compete with error-producing APIs.

This approach gives users an honest view of performance for their specific use case.

## Benchmark Environment

- **Tool:** tatami-ng v0.8.18 (criterion-equivalent statistical rigor)
- **Runtime:** Node.js v22+
- **Configuration:**
  - 256 samples per benchmark
  - 2 seconds per benchmark
  - Automatic warmup for JIT optimization
  - Automatic outlier detection and removal
  - Target variance: <5% (typically achieves ~1%)

## Running Benchmarks

```bash
# Install dependencies
npm install

# Internal API comparison
npm run bench              # or npm run bench:internal

# External comparisons
npm run bench:external     # Runs zod and valibot benchmarks

# All benchmarks
npm run bench:all

# Legacy benchmarks (pre-restructure)
npm run bench:legacy
```

## Fixtures

- **small.json**: 10 user objects (~500 bytes)
- **medium.json**: 100 user objects (~5 KB)
- **large.json**: 1000 user objects (~50 KB)

## Interpreting Results

### ops/sec (Operations per Second)
- **Higher is better**
- 10M+ ops/sec = Extremely fast
- 1M+ ops/sec = Very fast
- 100k+ ops/sec = Fast

### ns (Nanoseconds per operation)
- **Lower is better**
- <100 ns = Excellent
- 100-500 ns = Very good
- 500 ns - 1 µs = Good

### Margin (%)
- **Lower is better**
- <2% = Very stable
- 2-5% = Good
- >5% = Consider more samples

## Adding New Benchmarks

1. **Internal benchmarks:** Add to `internal/api-tiers.bench.ts`
2. **External benchmarks:** Add equivalent tests to `external/zod.bench.ts` and `external/valibot.bench.ts`
3. **Follow API equivalence:** Only compare equivalent APIs
4. **Update this README** with new results

## Future Work

- [ ] Add competitor-provided benchmark suites (run their benchmarks, not just ours)
- [ ] Create automated regression detection (v0.9.3 Benchmark CI)
- [ ] Historical baseline tracking across versions

---

**Last Updated:** 2026-01-05
**Benchmark Tool:** tatami-ng v0.8.18
**property-validator Version:** v0.9.2
