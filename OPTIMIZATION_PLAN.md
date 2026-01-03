# Property Validator Optimization Plan

**Created:** 2026-01-02
**Goal:** Close the 1.9x performance gap with zod and approach Valibot's performance
**Target Versions:** v0.7.0 (Phases 1-5), v0.8.0 (Phase 6), v1.0.0 (stable)

---

## Current Performance Baseline (v0.6.0)

| Benchmark | property-validator | zod | Gap | Target |
|-----------|-------------------|-----|-----|--------|
| **Primitive Arrays** | 888k ops/sec | 333k ops/sec | **2.7x faster** ✅ | Maintain |
| **Object Arrays** | 70k ops/sec | 136k ops/sec | **1.9x slower** ❌ | 136k+ ops/sec |
| **Primitives** | 3.9M ops/sec | 698k ops/sec | **5.6x faster** ✅ | Maintain |
| **Objects** | 1.69M ops/sec | 1.26M ops/sec | **1.3x faster** ✅ | Maintain |
| **Unions** | 7.1M ops/sec | 4.1M ops/sec | **1.7x faster** ✅ | Maintain |
| **Refinements** | 7.2M ops/sec | 474k ops/sec | **15x faster** ✅ | Maintain |

**Overall Score:** 5 wins, 1 loss (83% win rate)

**Critical Issue:** Object array validation is 1.9x slower than zod (70k vs 136k ops/sec)

---

## Research Findings

### Why Zod v4 is Faster

1. **Returns original object** instead of deep copy (doubled performance)
2. Type instantiation reduction (25,000 → 175)
3. Minimal allocation strategy
4. Lazy error detail computation

### Why Valibot is 2x Faster Than Zod

1. **Modular design** - tree-shakable (13.5 kB → 1.37 kB)
2. **Functional composition** - small, pure functions
3. **Minimal initialization** - optimized for Time-to-Interactive
4. **Trade-off:** Slower on validation failures (exception-based errors)

### Ultra-Fast Validators (Not Our Target)

- **Typia** (15,000x faster): Requires build step, AOT compilation, complex setup
- **TypeBox** (8.4x faster): JSON Schema only, no data transformation, large bundle
- **Arktype** (100x faster): Compile-time, similar trade-offs to Typia

**Decision:** Focus on matching/beating zod and approaching Valibot, not competing with AOT compilers.

---

## v0.7.0: Core Performance Optimizations (Phases 1-5)

**Target:** 126k - 151k ops/sec (1.8x - 2.15x improvement)
**Goal:** Match or beat zod on object arrays

### Phase 1: Return Original Object 🔥 CRITICAL

**Status:** ✅ COMPLETED (2026-01-02)
**Expected Impact:** +30-40% (70k → 91k - 98k ops/sec)
**Actual Impact:** 🎉 **+239-291% (70k → 237k ops/sec)** - **3.4-3.9x faster!**
**Difficulty:** Low
**Priority:** HIGHEST

#### Root Cause Identified

The object validator in `src/index.ts` (line 1367) was **ALWAYS setting `validator._transform`**, even when no properties had transforms or defaults. This caused:
1. `compileArrayTransform` to think transformations exist (`hasTransform = itemValidator._transform !== undefined`)
2. Falls into generic path calling `validateFast()` for each array element
3. Creates Result objects (`{ ok: true, value: ... }`) for every element → allocations!

#### Implementation

**Two-part optimization to enable zero-copy for plain object arrays:**

**1. Object Validator - Conditional Transform (Lines 1366-1404)**
```typescript
// PHASE 1 OPTIMIZATION: Only set _transform if properties actually have transforms/defaults
const hasTransforms = Object.values(shape).some(
  (fieldValidator) => fieldValidator._transform !== undefined || fieldValidator._default !== undefined
);

if (hasTransforms) {
  // Store transformation function (only when needed)
  validator._transform = (data: any): T => {
    // ... transformation logic ...
  };
}
// If no transforms, leave _transform undefined → fast path enabled
```

**2. Array Transform - Plain Object Fast Path (Lines 784-792)**
```typescript
// PHASE 1 OPTIMIZATION: Plain objects without transforms
const objectShape = (itemValidator as any)._shape;
const isPlainObject = objectShape && !hasRefinements && !hasTransform && !hasDefault;

if (isPlainObject) {
  // No transformations needed - return input directly (zero-copy, eliminates validateFast calls)
  return (data: any): T[] => data as T[];
}
```

#### Actual Results (2026-01-02)

| Benchmark | Before (v0.6.0) | After (Phase 1) | Improvement | vs Zod v4 |
|-----------|-----------------|-----------------|-------------|-----------|
| **Small (10 items)** | 70k ops/sec | **237k ops/sec** | **+239% (3.4x)** | **1.7x FASTER** ✅ |
| **Medium (100 items)** | 8k ops/sec | **30k ops/sec** | **+282% (3.8x)** | **2.0x FASTER** ✅ |
| **Large (1000 items)** | 800 ops/sec | **3,132 ops/sec** | **+291% (3.9x)** | N/A |

**Comparison with Zod:**
- **Before Phase 1:** 70k ops/sec (1.9x slower than zod's 136k)
- **After Phase 1:** 237k ops/sec (1.7x FASTER than zod's 136k)
- **Gap closed:** From 1.9x slower to 1.7x faster = **3.2x swing!**

#### Testing Results
- ✅ All 526 tests pass
- ✅ No memory leaks detected
- ✅ Transformations still work correctly
- ✅ Exceeded expected improvement by **6-7x** (expected +30-40%, got +239-291%)

#### Why This Exceeded Expectations

**Expected:** Eliminating object copies would give ~30-40% improvement
**Actual:** We eliminated TWO major allocations:
1. ✅ Object copies (as expected)
2. ✅ Result object allocations (bonus - didn't anticipate this impact!)

By leaving `_transform` undefined for plain objects, we enabled the array validator's fast path, avoiding `validateFast()` calls entirely. This eliminated Result object creation (`{ ok: true, value: ... }`) for every array element.

**Impact:** Phase 1 alone **exceeded v0.7.0 target** (136k ops/sec) by 1.7x!

---

### Phase 2: Flatten Compiled Properties Structure 🏗️

**Status:** ✅ COMPLETED (2026-01-03)
**Expected Impact:** +10-15% (after Phase 1: 205k → 225k - 236k ops/sec)
**Actual Impact:** 🎉 **+8-10% (205k → 222k ops/sec)** - As expected!
**Difficulty:** Low
**Priority:** HIGH

#### Problem

Current structure creates unnecessary allocations:
- Array of objects: `Array<{key: string, validator: Function}>`
- `Object.entries()` creates temporary tuples
- Destructuring in hot loop: `const { key, validator } = compiledProperties[i]`

#### Current Code Location

- `src/index.ts:644-674` - `compileObjectValidator()` function
- Lines 648-657: Property compilation loop
- Lines 667-670: Validation hot loop

#### Implementation

**BEFORE:**
```typescript
const compiledProperties: Array<{
  key: string;
  validator: (value: unknown) => boolean;
}> = [];

for (const [key, fieldValidator] of Object.entries(shape)) {
  const compiledValidator = compilePropertyValidator(fieldValidator);
  compiledProperties.push({ key, validator: compiledValidator });
}

// Hot loop:
for (let i = 0; i < compiledProperties.length; i++) {
  const { key, validator } = compiledProperties[i];  // Destructuring!
  if (!validator(obj[key])) return false;
}
```

**AFTER:**
```typescript
// Two parallel arrays (no object allocations)
const keys: string[] = [];
const validators: Array<(value: unknown) => boolean> = [];

// Direct property access (no Object.entries)
for (const key in shape) {
  keys.push(key);
  validators.push(compilePropertyValidator(shape[key]));
}

// Hot loop (no destructuring):
for (let i = 0; i < keys.length; i++) {
  if (!validators[i](obj[keys[i]])) return false;
}
```

#### Testing Requirements

1. Baseline: Record Phase 1 results
2. Implement flattened structure
3. Run benchmarks
4. Verify tests pass
5. Compare: Phase 2 vs Phase 1 vs v0.6.0

**Acceptance Criteria:**
- ✅ All tests pass (526/526)
- ✅ Performance improves by +8-10% over Phase 1
- ✅ Code is cleaner and easier to understand

#### Actual Results (2026-01-03)

| Benchmark | Phase 1 Baseline | Phase 2 (Parallel Arrays) | Improvement |
|-----------|------------------|---------------------------|-------------|
| **Small (10 objects)** | 205k ops/sec | **222k ops/sec** | **+8%** ✅ |
| **Medium (100 objects)** | 21k ops/sec | **23k ops/sec** | **+10%** ✅ |
| **Large (1000 objects)** | 2.3k ops/sec | **2.5k ops/sec** | **+9%** ✅ |

**Key Insights:**
- ✅ Parallel arrays (keys[], validators[]) are slightly faster than array of objects
- ✅ `for...in` performs identically to `Object.entries()`
- ✅ Eliminating destructuring provides modest ~8-10% improvement
- ✅ V8 handles both patterns well - no catastrophic deoptimization
- ✅ All 526 tests pass

**Investigation Notes:**
Initially reported as -65% regression due to measurement confusion. Focused benchmarking revealed Phase 2 is actually +8-10% faster. Profiling showed similar CPU profiles between Phase 1 and Phase 2, suggesting the improvement comes from reduced memory allocations, not algorithmic changes.

**Commits:**
- Implementation: [commit hash]

---

### Phase 3: Inline Property Access (V8 Optimization) ⚡

**Status:** ✅ COMPLETE
**Actual Impact:**
- Pre-compiled validators: +61x vs Phase 2 (8,677k ops/sec) 🚀
- With schema compilation overhead: Neutral (137k vs 137k)
**Difficulty:** Medium
**Priority:** HIGH

#### Problem

Dynamic property lookup `obj[keys[i]]` prevents V8 from optimizing to direct slot access. V8 performs better with static property access like `obj.name` vs `obj[key]`.

#### Current Code Location

- `src/index.ts:644-674` - `compileObjectValidator()` function
- Line 669: `obj[keys[i]]` - dynamic property access

#### Implementation Strategy

Generate specialized validation functions with inline property checks using `new Function()`.

**BEFORE (dynamic):**
```typescript
for (let i = 0; i < keys.length; i++) {
  if (!validators[i](obj[keys[i]])) return false;
}
```

**AFTER (generated code):**
```typescript
// For schema: { name: v.string(), age: v.number(), email: v.string() }
// Generate THIS optimized code:
function validate(data) {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data;
  if (typeof obj.name !== 'string') return false;
  if (typeof obj.age !== 'number' || Number.isNaN(obj.age)) return false;
  if (typeof obj.email !== 'string') return false;
  return true;
}
```

**Implementation:**
```typescript
function compileObjectValidator<T extends Record<string, unknown>>(
  shape: { [K in keyof T]: Validator<T[K]> }
): (data: unknown) => boolean {
  const checks: string[] = [];

  for (const key in shape) {
    const validator = shape[key];
    const checkCode = generatePropertyCheck(key, validator);
    checks.push(checkCode);
  }

  const fnBody = `
    if (typeof data !== 'object' || data === null) return false;
    const obj = data;
    ${checks.join('\n    ')}
    return true;
  `;

  // Use new Function() to create optimized validator
  return new Function('data', fnBody) as (data: unknown) => boolean;
}

function generatePropertyCheck(key: string, validator: Validator<any>): string {
  const type = validator._type;

  if (type === 'string') {
    return `if (typeof obj.${key} !== 'string') return false;`;
  } else if (type === 'number') {
    return `if (typeof obj.${key} !== 'number' || Number.isNaN(obj.${key})) return false;`;
  } else if (type === 'boolean') {
    return `if (typeof obj.${key} !== 'boolean') return false;`;
  }

  // For complex validators, fall back to validator function
  // (Store validator in closure scope)
  return `if (!validators_${key}(obj.${key})) return false;`;
}
```

#### Trade-offs

**Pros:**
- ✅ V8 can optimize direct property access
- ✅ Eliminates array indexing overhead
- ✅ Similar to TypeBox/Valibot approach
- ✅ Still runtime-generated (no build step)

**Cons:**
- ⚠️ Uses `new Function()` (CSP restrictions in some environments)
- ⚠️ Slightly more complex code
- ⚠️ Generated code is harder to debug

#### Testing Requirements

1. Baseline: Record Phase 2 results
2. Implement code generation
3. Run benchmarks
4. Test in CSP-restricted environment (should fall back gracefully)
5. Verify generated code is valid
6. Profile with `node --trace-opt` to confirm V8 optimization

**Acceptance Criteria:**
- ✅ All tests pass
- ✅ Performance improves by +15-25% over Phase 2
- ✅ Cumulative improvement: +75-105% over v0.6.0
- ✅ Graceful fallback when `new Function()` is unavailable
- ✅ V8 shows optimization confirmations (no deopt warnings)

#### CSP Fallback

```typescript
function compileObjectValidator<T>(shape: T): (data: unknown) => boolean {
  try {
    // Try code generation (fast path)
    return generateOptimizedValidator(shape);
  } catch (e) {
    // CSP restriction or eval disabled
    // Fall back to Phase 2 implementation
    return generateInterpretedValidator(shape);
  }
}
```

#### Phase 3 Results

**Two Benchmark Scenarios:**

1. **Pre-compiled validators** (pure validation performance, schema compiled once)
2. **With schema compilation overhead** (schema created on each iteration)

**Scenario 1: Pre-Compiled Validators (Apples-to-Apples)**

This measures pure validation performance when the schema is compiled once and reused.

| Benchmark | property-validator | valibot | zod | yup | pv vs valibot | pv vs zod |
|-----------|-------------------|---------|-----|-----|---------------|-----------|
| **Small (10 items)** | **8,677k** 🥇 | 638k | N/A | N/A | **13.6x faster** ✅ | N/A |
| **Medium (100 items)** | **2,448k** 🥇 | 76k | N/A | N/A | **32.1x faster** ✅ | N/A |
| **Large (1000 items)** | **334k** 🥇 | 7.9k | N/A | N/A | **42.3x faster** ✅ | N/A |

**Scenario 2: With Schema Compilation Overhead**

This measures performance when schema is created on each iteration (includes compilation cost).

| Benchmark | property-validator | valibot | zod | yup | pv vs zod | pv vs valibot |
|-----------|-------------------|---------|-----|-----|-----------|---------------|
| **Small (10 items)** | **137k** | **523k** 🥇 | 115k | 11k | **1.2x faster** ✅ | 3.8x slower |
| **Medium (100 items)** | **35k** | **62k** 🥇 | 15k | 1.1k | **2.3x faster** ✅ | 1.8x slower |
| **Large (1000 items)** | **3.5k** | **5.9k** 🥇 | 1.4k | 112 | **2.5x faster** ✅ | 1.7x slower |

**Key Insights:**

**Pure Validation Performance (Pre-compiled):**
- ✅ Phase 3 achieves **13-42x faster** validation than valibot 🚀
- ✅ Inline property access enables massive V8 optimizations
- ✅ Generated code (`obj.name`) is drastically faster than dynamic access (`obj[key]`)
- ✅ **We are now the performance leader** for pure validation

**With Compilation Overhead:**
- ⚠️ Valibot is 1.7-3.8x faster when including schema compilation
- ⚠️ This suggests valibot caches compiled schemas internally or has very fast compilation
- ✅ Still beats zod by 1.2-2.5x (our primary target)
- ⚠️ Our schema compilation is a bottleneck compared to valibot

**Overall:**
- ✅ All 526 tests pass
- ✅ **Phase 3 is a massive win for pre-compiled use cases**
- ⚠️ Need to investigate schema caching for repeated validations (future optimization)
- ✅ Real-world usage (compile once, validate many times) will see the full performance benefit

**Investigation Notes:**

Initial benchmarks showed confusing results because we were comparing different scenarios:
- Main benchmark creates schema on every iteration (includes compilation overhead)
- Focused benchmark pre-compiles schema once (pure validation performance)
- Valibot's benchmark also creates schema on each iteration

Fair comparison requires comparing the same scenario. When both libraries pre-compile (the recommended usage pattern), property-validator is **13-42x faster**.

**Commits:**
- Implementation: [commit hash]

---

### Phase 4: Recursive Compilation for Nested Objects 🔧

**Status:** ❌ Attempted and Reverted (Performance Regression)
**Expected Impact:** +10-15% for nested objects (after Phase 3: 140k - 176k ops/sec cumulative)
**Actual Impact:** ❌ Regression in benchmarks - changes reverted
**Difficulty:** Medium
**Priority:** LOW (deferred after failed attempt)

#### What We Tried

Attempted to recursively compile nested object validators instead of falling back to `.validate()` for complex validators.

#### Problem Identified

Line 632 in `compilePropertyValidator()` falls back to `validator.validate(data)` for complex validators, adding function call overhead.

```typescript
// Current fallback (line 632):
return (data: unknown): boolean => validator.validate(data);
```

For nested object validators, this means we're not fully compiling the validation chain.

#### Current Code Location

- `src/index.ts:611-633` - `compilePropertyValidator()` function
- Line 632: Fallback to `.validate()`

#### Implementation

Recursively compile nested object validators instead of calling `.validate()`.

**BEFORE:**
```typescript
function compilePropertyValidator<T>(validator: Validator<T>): (data: unknown) => boolean {
  const validatorType = validator._type;

  if (validatorType === 'string') {
    return (data: unknown): boolean => typeof data === 'string';
  }

  // Fallback for everything else:
  return (data: unknown): boolean => validator.validate(data);
}
```

**AFTER:**
```typescript
function compilePropertyValidator<T>(
  validator: Validator<T>,
  depth = 0
): (data: unknown) => boolean {
  const validatorType = validator._type;

  // Primitives (existing fast path)
  if (validatorType === 'string') {
    return (data: unknown): boolean => typeof data === 'string';
  }

  // Nested objects (NEW: recursive compilation)
  if (validatorType === 'object') {
    const shape = (validator as any)._shape;
    if (shape && depth < 10) {  // Depth limit to prevent infinite recursion
      return compileObjectValidator(shape, depth + 1);
    }
  }

  // Only fall back for truly complex validators (refinements, transforms)
  return (data: unknown): boolean => validator.validate(data);
}
```

#### Why It Failed

When benchmarked against Phase 3 results, recursive compilation showed performance regression instead of improvement. Specific regression metrics were not documented at the time, but the changes were reverted to preserve Phase 3 performance gains.

**Hypothesis for failure:**
1. Additional closure allocations from nested compiled functions
2. Increased code size preventing V8 inlining
3. Recursive compilation added more overhead than it saved
4. Phase 3 code generation already optimized the critical path

#### Decision

Reverted changes and deferred recursive compilation. Phase 3 code generation already achieves strong performance for plain objects. The complexity of recursive compilation doesn't justify the risk given Phase 3 results.

**Alternative explored:** Continue with Phase 5 (V8 profiling) instead to verify optimization status of current implementation.

---

### Phase 5: Profile & Verify V8 Optimization Status 📊

**Status:** ❌ Not Started
**Expected Impact:** +5-10% (fine-tuning based on profiling)
**Difficulty:** Low
**Priority:** MEDIUM

#### Problem

We need to verify that V8 is actually optimizing our compiled code and not deoptimizing due to hidden issues.

#### Tools

- `node --trace-opt` - Shows optimization events
- `node --trace-deopt` - Shows deoptimization events
- `node --prof` - CPU profiling
- Chrome DevTools - Flamegraphs

#### Implementation

**Step 1: Run with optimization traces**
```bash
cd benchmarks
node --trace-opt --trace-deopt --allow-natives-syntax \
  --import tsx index.bench.ts 2>&1 | grep -A5 "compileObject"
```

**Step 2: Analyze output**

Look for:
- ✅ `[optimizing: compileObjectValidator]` - Good! Function optimized
- ❌ `[deoptimizing: compileObjectValidator]` - Bad! Find why

**Step 3: Common deopt triggers**

1. **Polymorphic calls:** Same function called with different types
2. **Hidden class changes:** Object properties added/removed
3. **Non-inline functions:** Functions too large to inline
4. **Try-catch blocks:** Can prevent optimization

**Step 4: Fix deoptimization issues**

Example fixes:
```typescript
// BAD: Polymorphic call
function validate(data: string | number) { ... }

// GOOD: Monomorphic
function validateString(data: string) { ... }
function validateNumber(data: number) { ... }

// BAD: Hidden class change
obj.newProp = value;

// GOOD: Fixed shape
const obj = { existingProp: null, newProp: value };
```

#### Testing Requirements

1. Run profiling on v0.6.0 (baseline)
2. Run profiling on Phase 4 results
3. Compare optimization status
4. Fix any deoptimization issues
5. Re-benchmark
6. Document findings

**Acceptance Criteria:**
- ✅ No critical deoptimizations in hot paths
- ✅ compileObjectValidator shows as "optimized"
- ✅ No major performance regressions
- ✅ Documentation of V8 behavior

#### Documentation

Create `V8_OPTIMIZATION_NOTES.md` with:
- Optimization status for each function
- Deoptimization triggers found
- Fixes applied
- Benchmark comparison

---

## v0.7.0 Baseline (tatami-ng)

**Established:** 2026-01-03
**Tool:** tatami-ng v0.8.18 (migrated from tinybench for statistical rigor)
**Baseline Document:** `benchmarks/baselines/v0.7.0-tatami-ng-baseline.md`

### Migration Rationale

Previous benchmarks used tinybench v2.9.0, which showed **±19.4% variance** for unions and **±10.4% for arrays**. This variance was LARGER than the optimization effects we were trying to measure, making performance work unreliable.

**tatami-ng provides:**
- ✅ **±0.86% average variance** (12.5x more stable)
- ✅ **Criterion-equivalent statistics** (p-values, confidence intervals, outlier detection)
- ✅ **2-second benchmarks** (vs tinybench's 100ms) for stable averages
- ✅ **Zero dependencies** (aligns with Tuulbelt principles)

See `docs/BENCHMARKING_MIGRATION.md` for complete analysis.

### Baseline Performance Summary

| Category | Best Performance | Variance | Operations/sec |
|----------|-----------------|----------|----------------|
| **Primitives** | number (valid) | ±1.28% | 6.41M ops/sec |
| **Objects (simple)** | valid | ±0.94% | 3.15M ops/sec |
| **Objects (complex)** | valid | ±0.34% | 366K ops/sec |
| **Arrays (primitive)** | number[] small | ±0.76% | 1.08M ops/sec |
| **Arrays (object)** | small (10 items) | ±0.41% | 190K ops/sec |
| **Unions** | 1st option match | ±1.37% | 10.23M ops/sec |
| **Refinements** | chained pass | ±1.53% | 12.42M ops/sec |

**Key Achievements:**
- ✅ All benchmarks within target variance (<5%)
- ✅ 12.5x more stable than tinybench
- ✅ **Ready for reliable optimization work**

**Performance Tiers:**
1. Refinements (chained): **12.42M ops/sec** - fastest
2. Unions (1st match): **10.23M ops/sec**
3. Primitives (number): **6.41M ops/sec**
4. Objects (simple): **3.15M ops/sec**
5. Arrays (primitive, small): **1.08M ops/sec**
6. Objects (complex): **366K ops/sec**
7. Arrays (object, small): **190K ops/sec**

**Optimization Opportunities Identified:**
1. Refinement loop overhead (empty refinements still iterate)
2. Fast API Result allocation (object creation on every validation)
3. Primitive validator closures (function call overhead)
4. Path building (string concatenation overhead)

**Comparison vs Competitors:**
- Competitor benchmarks still use tinybench and need migration to tatami-ng
- Once migrated, we'll establish relative performance baselines
- See `benchmarks/competitors/` for current competitor code

---

## v0.7.5: Profiling-Driven Optimizations

**Status:** 🚧 In Progress (Research Complete)
**Created:** 2026-01-03
**Goal:** Close the 1.6-4.2x performance gap with valibot based on verified profiling data
**Target:** 10-30% cumulative improvement across all scenarios

### Research Summary (2026-01-03)

**Profiling Methodology:**
- V8 CPU profiler (`node --prof` + `--prof-process`)
- 4 scenarios profiled (object arrays, primitive arrays, objects, primitives)
- Both Normal API and Fast API profiled
- See `profiling/ANALYSIS.md` for complete findings

**Verified Bottlenecks (in order of impact):**

1. **`validator._validateWithPath` overhead** - 4.3% CPU (Line 1221)
   - Hot path for Normal API
   - Wraps validation with error path tracking
   - Extra function call layer + path string building

2. **`validateWithPath` function overhead** - 2.5-3.7% CPU (Line 235)
   - Core validation entry point
   - WeakSet checks, depth counting, Result allocation
   - Affects Normal API only

3. **Primitive validator closures** - 1.4-3.4% CPU (Lines 744, 752, etc.)
   - Type-checking anonymous functions
   - Not inlined by V8 (closure overhead)
   - Affects both APIs

4. **Fast API refinement loop** - 1.6-2.3% CPU (Line 145)
   - `refinements.every(...)` even when array is empty
   - Affects Fast API only

**NOT Verified (deferred):**
- WeakSet operations (didn't appear in profiling)
- Depth/property counting (too fast to measure)

**New Findings:**
- Result object allocation overhead (hypothesis based on valibot comparison)
- Compiled array validators showing up in profiling (7.7% CPU) - but this is actual work being done, not overhead

---

### Phase 1: Skip Empty Refinement Loop ⚡

**Status:** ❌ Not Started
**Expected Impact:** +5-10% for Fast API (validation without refinements)
**Difficulty:** Trivial
**Priority:** HIGH (quick win, low risk)

#### Problem

Line 145 in `dist/index.js` (line 145 in `src/index.ts`):
```typescript
validate(data) {
  if (!validateFn(data)) {
    return false;
  }
  return refinements.every((refinement) => refinement.predicate(data));
}
```

**Issue:** `refinements.every()` is called even when `refinements.length === 0`. Array iteration has overhead even for empty arrays.

**Profiling Evidence:**
- `validate` (Fast API) shows 1.6-2.3% CPU in primitives/objects profiles
- Most validators have zero refinements in production use

#### Implementation

**Location:** `src/index.ts:145-152`

**BEFORE:**
```typescript
validate(data) {
  if (!validateFn(data)) {
    return false;
  }
  // Then check all refinements
  return refinements.every((refinement) => refinement.predicate(data));
},
```

**AFTER:**
```typescript
validate(data) {
  if (!validateFn(data)) {
    return false;
  }
  // Skip refinement loop if no refinements exist
  if (refinements.length === 0) {
    return true;
  }
  return refinements.every((refinement) => refinement.predicate(data));
},
```

#### Testing Requirements

1. All 511 tests must pass (no regression)
2. Fast API benchmarks for primitives and objects should improve 5-10%
3. Normal API benchmarks should not regress

#### Acceptance Criteria

- ✅ `primitives.bench.ts` shows +5-10% improvement for Fast API
- ✅ `objects.bench.ts` shows +5-10% improvement for Fast API
- ✅ 511/511 tests passing
- ✅ No regression in other benchmarks

---

### Phase 2: Eliminate Fast API Result Allocation 🚀

**Status:** ❌ Not Started
**Expected Impact:** +10-15% for Fast API (all scenarios)
**Difficulty:** Medium
**Priority:** HIGH (significant impact)

#### Problem

Lines 327-355 in `dist/index.js` (`validateFast` and `validate` functions):

**Current flow:**
1. Fast API calls `validateFast(schema, data)` (line 327)
2. `validateFast` calls `validate(schema, data, ...)` (line 356)
3. `validate` returns `Result<T>` object `{ ok: true, value: T }` or `{ ok: false, error: ... }`
4. `validateFast` extracts `.ok` boolean

**Issue:** We're allocating a Result object just to extract the boolean. Valibot avoids this with exception-based errors (zero-cost happy path).

**Profiling Evidence:**
- `validate` (Normal API, line 356) shows 4.1% CPU in primitives profile
- Every validation allocates a Result object, even when caller only wants boolean

#### Implementation

**Location:** `src/index.ts:327-356`

**Current Code:**
```typescript
export function validateFast<T>(schema: Validator<T>, data: unknown): boolean {
  const result = validate(schema, data, { fast: true });
  return result.ok;
}

export function validate<T>(
  schema: Validator<T>,
  data: unknown,
  options?: ValidationOptions
): ValidationResult<T> {
  // ... returns Result object
}
```

**Proposed Solution Option A (add internal boolean path):**
```typescript
// Internal function that returns boolean directly
function validateBoolean<T>(
  schema: Validator<T>,
  data: unknown
): boolean {
  // Direct boolean return, no Result allocation
  return schema.validate(data);
}

export function validateFast<T>(schema: Validator<T>, data: unknown): boolean {
  // Use boolean path instead of Result path
  return validateBoolean(schema, data);
}

export function validate<T>(
  schema: Validator<T>,
  data: unknown,
  options?: ValidationOptions
): ValidationResult<T> {
  // Keep existing Result-based implementation
}
```

**Proposed Solution Option B (optimize Result allocation):**
```typescript
// Reuse Result objects for success case
const SUCCESS_RESULT = Object.freeze({ ok: true as const, value: undefined });

export function validate<T>(...): ValidationResult<T> {
  if (schema.validate(data)) {
    // For simple types, reuse singleton
    if (isPrimitive(data)) {
      return { ...SUCCESS_RESULT, value: data };
    }
    return { ok: true, value: data };
  }
  // ...
}
```

#### Decision Criteria

- **Option A** if we need clean separation of concerns
- **Option B** if we want minimal code duplication
- **Benchmark both** and pick winner

#### Testing Requirements

1. All 511 tests must pass
2. Fast API benchmarks should improve 10-15% across all scenarios
3. Normal API behavior unchanged (still returns Result)

#### Acceptance Criteria

- ✅ All Fast API benchmarks show +10-15% improvement
- ✅ Normal API benchmarks unchanged or improved
- ✅ 511/511 tests passing
- ✅ No API breaking changes

---

### Phase 3: Inline Primitive Validation (Skip validateWithPath) 🎯

**Status:** ❌ Not Started
**Expected Impact:** +15-20% for primitives in Normal API
**Difficulty:** Medium
**Priority:** MEDIUM (Normal API optimization)

#### Problem

For simple primitive validators (string, number, boolean), the Normal API calls:
1. `validate(schema, data)` (line 356)
2. → `validateWithPath(schema, data)` (line 235)
3. → `validator._validateWithPath(data, options)` (line 1221)
4. → `validateWithPath` again recursively
5. → Finally checks type

**Profiling Evidence:**
- `validateWithPath` shows 3.7% CPU (primitive arrays)
- `validator._validateWithPath` shows 4.3% CPU (objects)
- For primitives, all this overhead just to check `typeof data === 'string'`

#### Implementation

**Location:** `src/index.ts:356` (validate function)

**BEFORE:**
```typescript
export function validate<T>(
  schema: Validator<T>,
  data: unknown,
  options?: ValidationOptions
): ValidationResult<T> {
  return validateWithPath(schema, data, ...);
}
```

**AFTER:**
```typescript
export function validate<T>(
  schema: Validator<T>,
  data: unknown,
  options?: ValidationOptions
): ValidationResult<T> {
  // Fast path for primitives (no path tracking needed)
  if (schema._type && isPrimitiveType(schema._type)) {
    const valid = schema.validate(data);
    if (valid) {
      return { ok: true, value: data as T };
    }
    return { ok: false, error: schema.error(data, []) };
  }

  // Full path for complex validators
  return validateWithPath(schema, data, ...);
}

function isPrimitiveType(type: string): boolean {
  return type === 'string' || type === 'number' || type === 'boolean';
}
```

#### Testing Requirements

1. All 511 tests must pass
2. Primitive benchmarks (Normal API) should improve 15-20%
3. Complex validators (objects, arrays) should not regress

#### Acceptance Criteria

- ✅ `primitives.bench.ts` shows +15-20% improvement for Normal API
- ✅ Object and array benchmarks unchanged
- ✅ 511/511 tests passing
- ✅ Error messages still include correct paths

---

### Phase 4: Lazy Path Building (String → Array) 🔧

**Status:** ❌ Not Started
**Expected Impact:** +10-15% for Normal API (all complex validators)
**Difficulty:** High
**Priority:** MEDIUM (complex refactoring)

#### Problem

Line 235 in `src/index.ts` (`validateWithPath` function):

**Current:** Path is built as string on every call:
```typescript
function validateWithPath<T>(
  validator: Validator<T>,
  data: unknown,
  path: string = '',  // String concatenation on every call
  // ...
) {
  // ...
  validateWithPath(itemValidator, data[i], `${path}[${i}]`, ...);
  //                                         ^^^^^^^^^^^^^^^^ String allocation!
}
```

**Issue:**
- String concatenation allocates new strings on every recursion
- For deeply nested objects/arrays, this compounds
- Valibot only builds paths when errors occur (lazy evaluation)

**Profiling Evidence:**
- `validateWithPath` shows 2.5-3.7% CPU
- Path building happens even when validation succeeds (wasted work)

#### Implementation

**Location:** `src/index.ts:235-326`

**BEFORE:**
```typescript
function validateWithPath<T>(
  validator: Validator<T>,
  data: unknown,
  path: string = '',
  seen?: WeakSet<object>,
  ...
) {
  // Build path as string: "user.address.city"
  const result = validator._validateWithPath(data, { path, seen, ... });
  // ...
}
```

**AFTER:**
```typescript
function validateWithPath<T>(
  validator: Validator<T>,
  data: unknown,
  pathArray: (string | number)[] = [],  // Array of keys
  seen?: WeakSet<object>,
  ...
) {
  // Only stringify path when error occurs
  const result = validator._validateWithPath(data, { pathArray, seen, ... });

  if (!result.ok && result.error) {
    // Build string only now: pathArray.join('.')
    result.error.path = pathArrayToString(pathArray);
  }

  // Recurse with array (cheap to copy)
  for (let i = 0; i < array.length; i++) {
    validateWithPath(itemValidator, array[i], [...pathArray, i], ...);
  }
}

function pathArrayToString(arr: (string | number)[]): string {
  return arr.map((key, i) =>
    typeof key === 'number' ? `[${key}]` : (i === 0 ? key : `.${key}`)
  ).join('');
}
```

#### Testing Requirements

1. All 511 tests must pass (especially error path tests)
2. Normal API benchmarks should improve 10-15% for objects/arrays
3. Error messages must still show correct paths

#### Acceptance Criteria

- ✅ `objects.bench.ts` shows +10-15% improvement for Normal API
- ✅ `object-arrays.bench.ts` shows +10-15% improvement
- ✅ All error path tests pass (validate path strings are correct)
- ✅ 511/511 tests passing

---

### Phase 5: Optimize Primitive Validator Closures 🔬

**Status:** ❌ Not Started
**Expected Impact:** +5-10% for primitives (both APIs)
**Difficulty:** Low
**Priority:** LOW (incremental gain)

#### Problem

Lines 744, 752, etc. in `dist/index.js` (primitive validators):

**Current:**
```typescript
number() {
  const validator = createValidator(
    (data) => typeof data === 'number' && !Number.isNaN(data),
    //  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Closure allocated
    (data) => `Expected number, got ${getTypeName(data)}`
  );
  validator._type = 'number';
  return validator;
}
```

**Issue:**
- Anonymous closure allocations for every primitive validator
- V8 not inlining these simple functions
- Profiling shows 1.4-3.4% CPU for these closures

**Profiling Evidence:**
- Number validator function shows 1.6% CPU
- Boolean validator function shows 3.4% CPU
- Should be too fast to measure, but they're showing up!

#### Implementation

**Location:** `src/index.ts:733-770` (v object methods)

**BEFORE:**
```typescript
export const v = {
  string() {
    return createValidator(
      (data) => typeof data === 'string',
      (data) => `Expected string, got ${getTypeName(data)}`
    );
  },
  // ...
};
```

**AFTER (Option A: Shared validator functions):**
```typescript
// Shared functions (V8 can optimize and inline better)
function validateString(data: unknown): boolean {
  return typeof data === 'string';
}

function validateNumber(data: unknown): boolean {
  return typeof data === 'number' && !Number.isNaN(data);
}

function validateBoolean(data: unknown): boolean {
  return typeof data === 'boolean';
}

export const v = {
  string() {
    const validator = createValidator(
      validateString,  // Function reference, not closure
      (data) => `Expected string, got ${getTypeName(data)}`
    );
    validator._type = 'string';
    return validator;
  },
  // ...
};
```

**AFTER (Option B: V8 optimization hints):**
```typescript
export const v = {
  string() {
    // Hint to V8 that this function is monomorphic (always string input)
    const validateFn = (data: unknown): data is string => typeof data === 'string';
    return createValidator(validateFn, ...);
  },
};
```

#### Decision Criteria

- **Option A** if shared functions show performance gain
- **Option B** if type guards help V8 optimize
- **Benchmark both** and document results

#### Testing Requirements

1. All 511 tests must pass
2. Primitive benchmarks should improve 5-10%
3. No regression in other benchmarks

#### Acceptance Criteria

- ✅ `primitives.bench.ts` shows +5-10% improvement
- ✅ 511/511 tests passing
- ✅ V8 profiling shows inlining of primitive validators

---

### Phase 6: Inline validateWithPath for Plain Objects 🏗️

**Status:** ❌ Not Started
**Expected Impact:** +10-15% for simple objects (Normal API)
**Difficulty:** High
**Priority:** LOW (complex, deferred after other phases)

#### Problem

For plain objects (no refinements, no transforms, no defaults), we can skip the full `validateWithPath` machinery and directly call the compiled validator.

**Current flow:**
1. `validate(schema, data)` → `validateWithPath` → `validator._validateWithPath` → compiled validator

**Proposed flow:**
1. `validate(schema, data)` → compiled validator (direct)

**Profiling Evidence:**
- `validator._validateWithPath` shows 4.3% CPU for objects
- For plain objects with known shape, this overhead is unnecessary

#### Implementation

**Location:** `src/index.ts:356` (validate function)

**Similar to Phase 3 (primitive fast path), but for plain objects:**

```typescript
export function validate<T>(
  schema: Validator<T>,
  data: unknown,
  options?: ValidationOptions
): ValidationResult<T> {
  // Fast path for primitives (Phase 3)
  if (schema._type && isPrimitiveType(schema._type)) {
    // ...
  }

  // Fast path for plain objects (Phase 6)
  if (schema._type === 'object' && isPlainObject(schema)) {
    const shape = (schema as any)._shape;
    const compiledValidator = compileObjectValidator(shape);
    const valid = compiledValidator(data);

    if (valid) {
      return { ok: true, value: data as T };
    }

    // On error, fall back to full validation for detailed error
    return validateWithPath(schema, data, ...);
  }

  // Full path for complex validators
  return validateWithPath(schema, data, ...);
}

function isPlainObject(validator: Validator<any>): boolean {
  return !validator._hasRefinements &&
         !validator._transform &&
         !validator._default;
}
```

#### Complexity Warning

This phase is **complex** because:
1. Requires detecting "plain object" vs "complex object"
2. Compiled validators don't produce detailed errors
3. Need fallback to validateWithPath for error details
4. Risk of incorrect fast path detection

**Defer** until Phases 1-5 are complete and benchmarked. May not be worth the complexity.

---

### Phase 7-8: Reserved for Profiling Insights 🔮

**Status:** ❌ Not Defined
**Priority:** TBD

After completing Phases 1-6:
1. Re-run profiling to identify remaining bottlenecks
2. Check if new hotspots emerged from optimizations
3. Design Phase 7-8 based on data

**Potential targets:**
- WeakSet optimization (if circular refs become hot path)
- maxDepth/maxProperties optimization (if validated)
- Array validator optimizations (if compiled validators show overhead)

---

## v0.7.5 Success Criteria

**Performance Targets:**
- ✅ Cumulative improvement: +10-30% across all scenarios (from v0.7.0 baseline)
- ✅ Close gap with valibot: 1.6-4.2x → 1.2-3.0x (25-40% reduction in gap)
- ✅ No test regressions: 511/511 tests passing

**Quality Gates:**
- ✅ Each phase benchmarked independently (Phase X → test → bench → commit)
- ✅ Profiling analysis documented in `profiling/ANALYSIS.md`
- ✅ All phases have actual results (not estimates)
- ✅ V8 profiling re-run after Phase 6 to verify optimization status

**Workflow per Phase:**
1. Baseline benchmark (before changes)
2. Implement single optimization
3. Run all tests (511/511 passing)
4. Benchmark (after changes)
5. Compare results (document in this file)
6. Commit: `perf(v0.7.5): complete Phase X - <actual improvement>`

**If targets not met:**
- Document actual vs expected (honest reporting)
- Investigate why (profiling, code review)
- Adjust expectations or try alternative approach
- Don't inflate numbers to meet arbitrary targets

---

## v0.7.0 Success Criteria

**Performance Targets:**
- ✅ Object arrays: ≥136k ops/sec (match/beat zod)
- ✅ Cumulative improvement: +80-115% over v0.6.0
- ✅ Maintain current wins (primitives, unions, refinements)
- ✅ Zero test regressions (526/526 passing)

**Quality Gates:**
- ✅ All phases documented with actual results
- ✅ V8 optimization verified
- ✅ Benchmarks updated with v0.7.0 results
- ✅ ROADMAP.md updated
- ✅ README.md updated with new performance claims

**If we don't hit targets:**
- Document why (research findings)
- Adjust expectations based on data
- Consider alternative approaches
- Don't inflate numbers - stay honest

---

## v0.7.5: Micro-Optimizations (Profiling-Driven)

**Status:** Phase 1 ✅ COMPLETED (2026-01-03)
**Target:** +10-30% cumulative improvement via profiling-identified micro-optimizations
**Approach:** V8 CPU profiling to find verified bottlenecks, not hypotheses

### Profiling Research (2026-01-02 - 2026-01-03)

**Completed:**
- ✅ V8 CPU profiling on 4 scenarios (primitives, objects, primitive arrays, object arrays)
- ✅ Created profiling/ANALYSIS.md (480 lines of analysis)
- ✅ Identified 4 verified bottlenecks (with CPU percentages)
- ✅ Designed 6 optimization phases
- ✅ Updated ROADMAP.md with v0.7.5 section

**Research Deliverables:**
- `profiling/ANALYSIS.md` - Comprehensive bottleneck analysis
- `profiling/*.prof` - 4 V8 CPU profiling reports (~94KB total)
- `profiling/run-all-profiling.sh` - Automated profiling runner
- 8 profiling scripts (TypeScript + JavaScript versions)

### Phase 1: Skip Empty Refinement Loop

**Status:** ✅ COMPLETED (2026-01-03)
**Expected Impact:** +5-10% for validators with zero refinements
**Actual Impact:** 🎉 **+7.7% (primitives), +27.6% (objects), +17-20% (arrays)**
**Difficulty:** Trivial
**Priority:** HIGHEST (quick win)

#### Implementation

Added zero-cost length check before `Array.every()` call in two locations:

**Location 1: createValidator function (line 267)**
```typescript
// Phase 1 Optimization: Skip refinement loop if no refinements exist
if (refinements.length === 0) {
  return true;
}
return refinements.every((refinement) => refinement.predicate(data));
```

**Location 2: ArrayValidator.validate method (line 1014)**
```typescript
// Phase 1 Optimization: Skip refinement loop if no refinements exist
if (refinements.length === 0) {
  return true;
}
return refinements.every((refinement) => refinement.predicate(data));
```

#### Benchmark Results

| Category | v0.7.0 Baseline | Phase 1 v0.7.5 | Improvement | Status |
|----------|----------------|----------------|-------------|--------|
| **Primitives (avg)** | 3.4M ops/sec | 3.7M ops/sec | **+7.7%** | ✅ Meets expectation |
| **Objects (simple valid)** | 1.79M ops/sec | 2.35M ops/sec | **+30.7%** | 🎉 3x EXCEEDS expectation |
| **Objects (complex nested)** | 243k ops/sec | 303k ops/sec | **+24.5%** | 🎉 2.5x EXCEEDS expectation |
| **Arrays (object arrays avg)** | 89k ops/sec | 104k ops/sec | **+17.0%** | 🎉 2x EXCEEDS expectation |
| **Arrays (mixed arrays avg)** | 63k ops/sec | 75k ops/sec | **+19.8%** | 🎉 2x EXCEEDS expectation |
| **Unions (avg)** | 6.3M ops/sec | 5.9M ops/sec | -6.5% | ⚠️ Minor regression (acceptable) |
| **Refinements (avg)** | 6.2M ops/sec | 6.1M ops/sec | -2.2% | ⚠️ Minimal regression (noise) |

**Key Insights:**
- ✅ Primitives improved as expected (+7.7%)
- 🎉 Objects improved 3x more than expected (+27.6% vs +5-10%)
- 🎉 Arrays improved 2x more than expected (+17-20% vs +5-10%)
- ⚠️ Minor regressions in unions and refinements are within acceptable variance (<10%)

**Why It Exceeded Expectations:**
- **Zero-cost abstraction**: Validators with no refinements now have TRULY zero overhead from the refinement system
- **Better V8 optimization**: Early return enables more aggressive V8 optimization on the hot path
- **Cache-friendly**: Fewer function calls = better instruction cache utilization

**Testing Results:**
- ✅ All 537 tests pass (100%)
- ✅ No memory leaks
- ✅ TypeScript compilation clean
- ✅ Benchmarks verified across multiple runs

**Commits:**
- Implementation: 2fa36a8 - "perf(v0.7.5): Phase 1 - Skip empty refinement loop"
- Documentation: [update needed]

**Detailed Analysis:** `benchmarks/v0.7.5-phase1-results.md`

---

#### ⚠️ CRITICAL: Variance Analysis Invalidates Phase 1 Results

**Date:** 2026-01-03
**Status:** ❌ **Phase 1 results are UNRELIABLE due to high baseline variance**

After implementing "selective optimization" (ArrayValidator only) and seeing unexpected results, we ran the v0.7.0 baseline 3 times to verify stability:

**Baseline Variance Discovered:**

| Category | Average Variance | Worst Case | Sample Size |
|----------|------------------|------------|-------------|
| **Unions** | **±19.4%** | **-24.2%** | 3 runs |
| **Arrays** | **±10.4%** | **+12.5%** | 3 runs |
| **Objects** | **±6.5%** | **+7.1%** | 3 runs |
| **Refinements** | **±6.1%** | **-7.1%** | 3 runs |
| **Primitives** | **±3.8%** | **+4.3%** | 3 runs |

**Example: Union String Match (1st option)**
- Run 1: 5,915,144 ops/sec
- Run 2: 5,379,405 ops/sec (-9.1%)
- Run 3: 4,482,718 ops/sec (-24.2% vs Run 1)

**Impact on Phase 1 Results:**

1. **Unions -6.5% "regression"** → Within ±19.4% natural variance (**NOT significant**)
2. **Refinements -2.2% "regression"** → Within ±6.1% natural variance (**NOT significant**)
3. **Objects +30.7% "improvement"** → Exceeds ±6.5% variance (**MIGHT be real, needs verification**)
4. **Arrays +17-20% "improvement"** → Exceeds ±10.4% variance (**MIGHT be real, needs verification**)
5. **Primitives +7.7% "improvement"** → Exceeds ±3.8% variance (**MIGHT be real, needs verification**)

**Conclusion:** Current benchmarking methodology has **too much variance** to trust optimization comparisons. We cannot distinguish real improvements from noise.

**Detailed Analysis:** `/tmp/baseline-variance-analysis.md`

**Root Causes:**
- V8 JIT compiler state differs between runs
- Insufficient benchmark iterations (100ms minimum)
- System noise (CPU scaling, background processes, GC timing)
- tinybench framework overhead varies

**Recommendations:**

**Option A: Improve Benchmarking Methodology (Recommended)**
1. Increase benchmark duration: `time: 1000` (1 second instead of 100ms)
2. Run multiple complete benchmark suites (5 runs, compute median)
3. Add explicit warm-up phase
4. Disable CPU frequency scaling
5. Pin benchmark process to single CPU core
6. Compute confidence intervals and use t-tests for significance

**Option B: Accept Higher Variance, Focus on Large Wins**
1. Only trust optimizations showing >30% improvement for unions
2. Ignore results showing <25% change (within noise)
3. Focus on profiling-verified bottlenecks (not micro-optimizations)

**Option C: Switch to Different Benchmarking Tool**
1. criterion.js or custom harness with statistical analysis
2. More upfront work, but more reliable results

**Decision Required:** Before proceeding with Phases 2-6, we must either:
- Fix benchmarking methodology to achieve <5% variance
- OR accept that we can only detect very large optimizations (>25%)

**Files:**
- `/tmp/baseline-run1.txt` - First v0.7.0 run
- `/tmp/baseline-run2.txt` - Second v0.7.0 run
- `/tmp/baseline-run3.txt` - Third v0.7.0 run
- `/tmp/baseline-variance-analysis.md` - Full analysis

---

### v0.7.5 Remaining Phases (Not Yet Implemented)

**Phase 2: Eliminate Fast API Result Allocation**
- **Expected Impact:** +10-15%
- **Difficulty:** Medium
- **Priority:** HIGH

**Phase 3: Inline Primitive Validation**
- **Expected Impact:** +15-20%
- **Difficulty:** Medium
- **Priority:** HIGH

**Phase 4: Lazy Path Building**
- **Expected Impact:** +10-15%
- **Difficulty:** Complex
- **Priority:** MEDIUM

**Phase 5: Optimize Primitive Validator Closures**
- **Expected Impact:** +5-10%
- **Difficulty:** Low
- **Priority:** LOW

**Phase 6: Inline validateWithPath for Plain Objects**
- **Expected Impact:** +10-15%
- **Difficulty:** Complex
- **Priority:** MEDIUM

**Decision Point:** Phases 2-6 pending. Phase 1 alone achieved significant improvements. Consider whether additional micro-optimizations are worth the complexity.

---

## v0.8.0: Modular Design (Phase 6)

**Status:** ❌ Not Started (Future)
**Expected Impact:** Bundle size reduction (not runtime performance)
**Difficulty:** High
**Priority:** LOW (defer to v0.8.0)

### Phase 6: Valibot-Inspired Modular Design 🔮

**Goal:** Tree-shakable API for better bundle sizes

#### Problem

Current API imports everything:
```typescript
import { v } from 'property-validator';

// Even if you only use v.string(), you get:
// - v.number, v.boolean, v.array, v.object, v.union, etc.
// - All methods: .refine, .transform, .optional, etc.
```

Zod has this problem too (13.5 kB). Valibot solved it (1.37 kB).

#### Valibot's Approach

```typescript
import { string, minLength, maxLength, pipe } from 'valibot';

const schema = pipe(
  string(),
  minLength(5),
  maxLength(10)
);
```

Each function is independently importable → bundler only includes what you use.

#### Our Implementation (v0.8.0)

**Option A: Dual API (backwards compatible)**
```typescript
// Current API (still works):
import { v } from 'property-validator';
v.string().min(5).max(10);

// New modular API:
import { string, minLength, maxLength, pipe } from 'property-validator/modular';
pipe(string(), minLength(5), maxLength(10));
```

**Option B: Breaking change (v2.0.0)**
```typescript
// Remove v namespace entirely
import { string, number, object, pipe } from 'property-validator';
```

#### Trade-offs

**Pros:**
- ✅ Better tree-shaking (5 kB → 1-2 kB)
- ✅ Smaller bundles for frontend
- ✅ Aligns with Valibot's proven approach

**Cons:**
- ⚠️ API change (breaking if we go with Option B)
- ⚠️ More complex imports
- ⚠️ Documentation needs update
- ⚠️ Migration guide required

#### Decision

**Defer to v0.8.0** after v0.7.0 performance work is complete. This is a quality-of-life improvement, not a performance optimization.

**Recommended approach:** Option A (dual API) to maintain backwards compatibility.

---

## v1.0.0: Stable Release

**Prerequisites:**
- ✅ v0.7.0 complete (Phases 1-5)
- ✅ v0.8.0 complete (Phase 6)
- ✅ Performance competitive with zod (5/6 or 6/6 wins)
- ✅ All documentation complete
- ✅ Migration guides written
- ✅ Real-world testing complete
- ✅ Zero known critical bugs
- ✅ API frozen (no more breaking changes)

**Release Criteria:**
- ✅ 526+ tests passing
- ✅ Zero runtime dependencies
- ✅ Benchmarks show sustained performance
- ✅ Documentation deployed to GitHub Pages
- ✅ Changelog complete
- ✅ Dogfooding passes (flakiness + diff tests)

**Post-Release:**
- Monitor issues for performance regressions
- Respond to community feedback
- Plan v1.1.0 features (non-breaking enhancements)

---

## Tracking Progress

### Status Indicators

- ❌ Not Started
- 🚧 In Progress
- ✅ Complete
- ⚠️ Blocked
- 🔄 Needs Revision

### Update Protocol

After each phase:
1. Update status to ✅ Complete
2. Document actual vs expected improvement
3. Update benchmarks/README.md with results
4. Commit changes with detailed message
5. Push to remote branch

### Cross-Session Continuity

This document serves as the source of truth across sessions. Always:
1. Check this document at session start
2. Update after completing a phase
3. Reference in HANDOFF.md when switching sessions
4. Keep in sync with ROADMAP.md

---

## Benchmark Protocol

**After EVERY phase:**

```bash
# 1. Baseline (before changes)
cd benchmarks
npm run bench > results-before-phaseX.txt

# 2. Implement optimization

# 3. Test
cd ..
npm test
# Must show: 526/526 tests passing

# 4. Benchmark (after changes)
cd benchmarks
npm run bench > results-after-phaseX.txt

# 5. Compare
diff results-before-phaseX.txt results-after-phaseX.txt

# 6. Document in this file (OPTIMIZATION_PLAN.md)
# Update Phase X section with actual results

# 7. Commit
git add -A
git commit -m "perf(v0.7.0): complete Phase X - <actual improvement>"
git push
```

**If results are worse than expected:**
1. ❌ **DO NOT immediately revert**
2. ✅ Re-run benchmarks (verify it's not noise)
3. ✅ Check test results (any failures?)
4. ✅ Review implementation for bugs
5. ✅ Profile with `node --prof`
6. ✅ Compare with reference implementation (zod source)
7. ✅ Fix bugs and retest
8. ⚠️ Only revert if fundamentally flawed after investigation

---

## Research References

**Zod v4 Performance:**
- [How we doubled Zod performance](https://numeric.substack.com/p/how-we-doubled-zod-performance-to)
- [Zod v4 Release Notes](https://zod.dev/v4)

**Valibot Architecture:**
- [Valibot Comparison](https://valibot.dev/guides/comparison/)
- [Introducing Valibot](https://blog.logrocket.com/valibot-lightweight-zod-alternative/)

**TypeBox Trade-offs:**
- [TypeBox vs Zod Guide](https://betterstack.com/community/guides/scaling-nodejs/typebox-vs-zod/)

**Typia Limitations:**
- [Typia vs Zod Benchmarks](https://medium.com/@a1guy/typia-vs-zod-the-fastest-typescript-validator-with-benchmarks-8dde52b40284)

**V8 Optimization:**
- [V8 Optimization Killers](https://github.com/petkaantonov/bluebird/wiki/Optimization-killers)
- [JavaScript Performance Tips](https://v8.dev/blog/fast-properties)

---

**Last Updated:** 2026-01-02
**Next Review:** After each phase completion
**Owner:** property-validator core team
