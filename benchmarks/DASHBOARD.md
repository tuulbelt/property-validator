# Performance Dashboard

**Version:** 0.8.5
**Generated:** 2026-01-05T06:46:00.222Z
**Baseline:** 2026-01-05T06:05:22.013Z
**Node:** v22.21.1
**Platform:** linux/x64

---

## Summary

| Category | API | Latency (avg) | Throughput |
|----------|-----|---------------|------------|
| primitives | string:validate | 64.7 ns | 16.7M ops/s |
| primitives | string:check | 56.6 ns | 18.8M ops/s |
| primitives | string:compileCheck | 55.1 ns | 19.0M ops/s |
| primitives | number:validate | 65.8 ns | 16.4M ops/s |
| primitives | number:check | 55.4 ns | 19.1M ops/s |
| primitives | number:compileCheck | 56.9 ns | 18.4M ops/s |
| objects | simple:validate | 66.5 ns | 16.3M ops/s |
| objects | simple:check | 57.2 ns | 18.8M ops/s |
| objects | simple:compileCheck | 55.8 ns | 18.8M ops/s |
| objects | complex:validate | 164.6 ns | 6.7M ops/s |
| objects | complex:check | 148.8 ns | 7.6M ops/s |
| objects | complex:compileCheck | 150.6 ns | 7.5M ops/s |
| arrays | array10:validate | 76.3 ns | 14.4M ops/s |
| arrays | array10:check | 63.6 ns | 16.6M ops/s |
| arrays | array10:compileCheck | 67.2 ns | 16.4M ops/s |
| arrays | array100:validate | 212.5 ns | 5.1M ops/s |
| arrays | array100:check | 180.1 ns | 5.8M ops/s |
| arrays | array100:compileCheck | 180.2 ns | 5.8M ops/s |
| unions | union:validate | 89.7 ns | 12.2M ops/s |
| unions | union:check | 78.4 ns | 13.7M ops/s |
| unions | union:compileCheck | 54.2 ns | 19.2M ops/s |
| invalid | invalid:validate | 387.2 ns | 3.0M ops/s |
| invalid | invalid:check | 56.3 ns | 18.8M ops/s |
| invalid | invalid:compileCheck | 59.0 ns | 18.2M ops/s |

---

## Detailed Metrics

### PRIMITIVES

| Benchmark | Avg | Min | Max | P50 | P99 | StdDev |
|-----------|-----|-----|-----|-----|-----|--------|
| string:validate | 64.7 ns | 53.0 ns | 8.98 ms | 58.0 ns | 125.0 ns | ±3.6% |
| string:check | 56.6 ns | 49.0 ns | 1.43 ms | 51.0 ns | 112.0 ns | ±0.7% |
| string:compileCheck | 55.1 ns | 48.0 ns | 326.66 µs | 51.0 ns | 106.0 ns | ±0.3% |
| number:validate | 65.8 ns | 53.0 ns | 8.77 ms | 59.0 ns | 130.0 ns | ±3.5% |
| number:check | 55.4 ns | 49.0 ns | 5.10 ms | 51.0 ns | 101.0 ns | ±2.1% |
| number:compileCheck | 56.9 ns | 49.0 ns | 1.01 ms | 53.0 ns | 107.0 ns | ±0.6% |

### OBJECTS

| Benchmark | Avg | Min | Max | P50 | P99 | StdDev |
|-----------|-----|-----|-----|-----|-----|--------|
| simple:validate | 66.5 ns | 52.0 ns | 6.58 ms | 60.0 ns | 132.0 ns | ±2.7% |
| simple:check | 57.2 ns | 49.0 ns | 7.84 ms | 52.0 ns | 102.0 ns | ±3.9% |
| simple:compileCheck | 55.8 ns | 48.0 ns | 983.48 µs | 52.0 ns | 104.0 ns | ±0.6% |
| complex:validate | 164.6 ns | 127.0 ns | 7.67 ms | 141.0 ns | 326.0 ns | ±3.1% |
| complex:check | 148.8 ns | 110.0 ns | 7.44 ms | 124.0 ns | 351.0 ns | ±3.0% |
| complex:compileCheck | 150.6 ns | 113.0 ns | 7.60 ms | 127.0 ns | 348.0 ns | ±3.1% |

### ARRAYS

| Benchmark | Avg | Min | Max | P50 | P99 | StdDev |
|-----------|-----|-----|-----|-----|-----|--------|
| array10:validate | 76.3 ns | 60.0 ns | 6.30 ms | 65.0 ns | 149.0 ns | ±2.6% |
| array10:check | 63.6 ns | 53.0 ns | 1.14 ms | 59.0 ns | 123.0 ns | ±0.7% |
| array10:compileCheck | 67.2 ns | 53.0 ns | 5.44 ms | 57.0 ns | 132.0 ns | ±2.3% |
| array100:validate | 212.5 ns | 169.0 ns | 777.12 µs | 178.0 ns | 363.0 ns | ±0.4% |
| array100:check | 180.1 ns | 160.0 ns | 381.23 µs | 168.0 ns | 330.0 ns | ±0.2% |
| array100:compileCheck | 180.2 ns | 160.0 ns | 518.29 µs | 167.0 ns | 323.0 ns | ±0.4% |

### UNIONS

| Benchmark | Avg | Min | Max | P50 | P99 | StdDev |
|-----------|-----|-----|-----|-----|-----|--------|
| union:validate | 89.7 ns | 70.0 ns | 1.25 ms | 76.0 ns | 170.0 ns | ±0.9% |
| union:check | 78.4 ns | 63.0 ns | 5.90 ms | 70.0 ns | 148.0 ns | ±2.4% |
| union:compileCheck | 54.2 ns | 48.0 ns | 1.34 ms | 51.0 ns | 104.0 ns | ±0.7% |

### INVALID

| Benchmark | Avg | Min | Max | P50 | P99 | StdDev |
|-----------|-----|-----|-----|-----|-----|--------|
| invalid:validate | 387.2 ns | 278.0 ns | 6.04 ms | 302.0 ns | 894.0 ns | ±2.5% |
| invalid:check | 56.3 ns | 49.0 ns | 1.08 ms | 51.0 ns | 107.0 ns | ±0.7% |
| invalid:compileCheck | 59.0 ns | 48.0 ns | 1.31 ms | 51.0 ns | 113.0 ns | ±0.7% |

---

## API Tier Comparison

| Scenario | validate() | check() | compileCheck() | check() vs validate | compileCheck() vs validate |
|----------|------------|---------|----------------|--------------------|-----------------------------|
| string | 64.7 ns | 56.6 ns | 55.1 ns | 12.5% faster | 14.8% faster |
| number | 65.8 ns | 55.4 ns | 56.9 ns | 15.9% faster | 13.5% faster |
| simple | 66.5 ns | 57.2 ns | 55.8 ns | 14.0% faster | 16.1% faster |
| complex | 164.6 ns | 148.8 ns | 150.6 ns | 9.6% faster | 8.5% faster |
| array10 | 76.3 ns | 63.6 ns | 67.2 ns | 16.6% faster | 11.9% faster |
| array100 | 212.5 ns | 180.1 ns | 180.2 ns | 15.3% faster | 15.2% faster |
| union | 89.7 ns | 78.4 ns | 54.2 ns | 12.6% faster | 39.5% faster |
| invalid | 387.2 ns | 56.3 ns | 59.0 ns | 85.5% faster | 84.8% faster |

---

## Key Insights

- **check()** skips Result allocation → faster for valid data
- **compileCheck()** uses cached JIT → fastest for repeated validation
- **Invalid data** shows biggest gap (check/compileCheck skip error path)

---

## How to Update

```bash
# Run benchmarks and update dashboard
npm run bench:ci | npm run bench:dashboard -- --stdin

# Or regenerate from existing baseline
npm run bench:dashboard
```

---

*Generated by `benchmarks/ci/generate-dashboard.ts`*
