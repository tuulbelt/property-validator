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

**Status:** ❌ Not Started
**Expected Impact:** +30-40% (70k → 91k - 98k ops/sec)
**Difficulty:** Low
**Priority:** HIGHEST

#### Problem

Zod v4 doubled performance by returning the original object instead of creating copies. We may be allocating new objects unnecessarily.

#### Current Code Location

- `src/index.ts:477` - `validateFast()` function
- `src/index.ts:660-673` - `compileObjectValidator()` return value
- Any place we return `{ ok: true, value: ... }`

#### Implementation

```typescript
// BEFORE (potentially copying):
return { ok: true, value: data };

// AFTER (return original reference):
return { ok: true, value: data as T };  // Zero-copy

// Exception: Only clone when .transform() is applied
if (hasTransform) {
  const transformed = transform(data);
  return { ok: true, value: transformed };
}
```

#### Testing Requirements

1. Run benchmarks BEFORE changes (baseline)
2. Implement optimization
3. Run benchmarks AFTER changes
4. Verify all 526 tests still pass
5. Document actual improvement vs expected

**Acceptance Criteria:**
- ✅ All tests pass (526/526)
- ✅ Performance improves by at least +25% (conservative estimate)
- ✅ No memory leaks (test with large datasets)
- ✅ Transformations still work correctly

#### Debugging Protocol

If performance gets WORSE:
1. ❌ **DO NOT immediately revert**
2. ✅ Check for introduced bugs (test failures)
3. ✅ Profile with `node --prof` to find bottleneck
4. ✅ Review implementation for mistakes
5. ✅ Compare with zod's implementation
6. ✅ Fix and retest
7. ⚠️ Only revert if fundamentally flawed

---

### Phase 2: Flatten Compiled Properties Structure 🏗️

**Status:** ❌ Not Started
**Expected Impact:** +15-20% (after Phase 1: 106k - 118k ops/sec cumulative)
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
- ✅ All tests pass
- ✅ Performance improves by +10-15% over Phase 1
- ✅ Cumulative improvement: +45-60% over v0.6.0
- ✅ Code is cleaner and easier to understand

---

### Phase 3: Inline Property Access (V8 Optimization) ⚡

**Status:** ❌ Not Started
**Expected Impact:** +20-30% (after Phase 2: 127k - 153k ops/sec cumulative)
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

---

### Phase 4: Eliminate Fallback to .validate() 🔧

**Status:** ❌ Not Started
**Expected Impact:** +10-15% for nested objects (after Phase 3: 140k - 176k ops/sec cumulative)
**Difficulty:** Medium
**Priority:** MEDIUM

#### Problem

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

#### Testing Requirements

1. Baseline: Record Phase 3 results
2. Implement recursive compilation
3. Test with deeply nested objects (5+ levels)
4. Verify circular reference handling
5. Run benchmarks
6. Test with mixed validators (objects + refinements)

**Acceptance Criteria:**
- ✅ All tests pass
- ✅ Performance improves by +8-12% over Phase 3
- ✅ Handles deeply nested objects correctly
- ✅ Doesn't stack overflow on circular references
- ✅ Cumulative improvement: +90-125% over v0.6.0

#### Edge Cases

1. **Circular references:** Detect and use fallback
2. **Deep nesting:** Limit to 10 levels, then fall back
3. **Mixed validators:** Objects with refinements → fall back to `.validate()`

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
