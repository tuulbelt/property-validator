# Array Performance Optimization Analysis

**Date:** 2026-01-02
**Version:** v0.4.0
**Baseline Performance:** 48,819 ops/sec (arrays of 10 primitives)
**Target:** Close 2.72x gap with zod (zod: 132,992 ops/sec)

---

## Executive Summary

Attempted 3 different optimization strategies to improve array validation performance. **All 3 optimizations either failed or had no effect** due to fundamental architectural constraints.

**Key Finding:** Runtime conditional checks add more overhead than they save. True performance improvement would require architectural changes to pre-compile validators at construction time, not runtime.

---

## Optimization Attempts

### Opt 1: Inline Primitive Checks in Arrays

**Hypothesis:** Eliminate function call overhead by inlining typeof checks for primitive arrays.

**Implementation:**
```typescript
// In array.validate():
const itemType = itemValidator._type;
if (itemType && !itemValidator._hasRefinements && refinements.length === 0) {
  if (itemType === 'string') {
    return data.every((item) => typeof item === 'string');
  } else if (itemType === 'number') {
    return data.every((item) => typeof item === 'number' && !Number.isNaN(item));
  } else if (itemType === 'boolean') {
    return data.every((item) => typeof item === 'boolean');
  }
}
```

**Result:** ❌ **FAILED** - Performance degraded by **23%**

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| ops/sec | 48,819 | 37,337 | -23% |
| vs zod | 2.72x slower | 3.56x slower | Worse |

**Root Cause:**
Checking 3 properties (`_type`, `_hasRefinements`, `refinements.length`) + 3 conditional branches on EVERY validation call costs **more** than 2 function calls per item.

**Overhead Added:**
1. Property access: `itemValidator._type` (1 lookup)
2. Truthy check: `if (itemType && ...)` (1 comparison)
3. Property access: `itemValidator._hasRefinements` (1 lookup)
4. Negation check: `!itemValidator._hasRefinements` (1 operation)
5. Property access: `refinements.length` (1 lookup)
6. Comparison: `refinements.length === 0` (1 comparison)
7. String comparison: `itemType === 'string'` (1 comparison)
8. **Then** the actual validation

That's **7 operations** before doing any validation, repeated for EVERY array!

**Lesson Learned:**
Runtime conditionals are expensive. Even simple checks add measurable overhead when called repeatedly.

---

### Opt 2: Use validateFast Instead of validate

**Hypothesis:** Skip options checking overhead by calling validateFast() directly.

**Implementation:**
```typescript
// Before:
if (!data.every((item) => validate(itemValidator, item).ok)) return false;

// After:
if (!data.every((item) => validateFast(itemValidator, item).ok)) return false;
```

**Result:** ⚠️ **NO EFFECT** - Performance unchanged

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| ops/sec | 48,819 | 48,413 | 0% |

**Root Cause:**
`validate()` already calls `validateFast()` when no options are passed (lines 504-515). For primitive validators, this was already the fast path.

**Overhead Remaining:**
1. Call `validateFast()` (function call)
2. Check for defaults (lines 483-488)
3. Call `itemValidator.validate()` (another function call)
4. Check for `_transform` (line 493)
5. Create Result object `{ ok: true, value }` (object allocation)
6. Return and check `.ok` property

**Lesson Learned:**
The real bottleneck is **2 function calls + object creation** per array item, not the options checking overhead.

---

### Opt 3: Pre-compile Array Validators

**Hypothesis:** Inline validation logic to eliminate function calls entirely.

**Implementation:**
```typescript
// In array.validate():
const itemType = itemValidator._type;
if (itemType && !itemValidator._hasRefinements && refinements.length === 0) {
  // Inline validation - no function calls
  if (itemType === 'string') {
    if (!data.every((item) => typeof item === 'string')) return false;
  } else if (itemType === 'number') {
    if (!data.every((item) => typeof item === 'number' && !Number.isNaN(item))) return false;
  } else if (itemType === 'boolean') {
    if (!data.every((item) => typeof item === 'boolean')) return false;
  } else {
    // Fall back to validateFast for complex types
    if (!data.every((item) => validateFast(itemValidator, item).ok)) return false;
  }
} else {
  // Fall back for refinements/transforms
  if (!data.every((item) => validateFast(itemValidator, item).ok)) return false;
}
```

**Result:** ❌ **FAILED** - Performance degraded by **21%**

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| ops/sec | 48,819 | 38,642 | -21% |
| vs zod | 2.72x slower | 3.23x slower | Worse |

**Root Cause:**
Same as Opt 1 - checking conditions on every call costs more than function calls!

**Why This Failed:**
- For simple primitive arrays, the conditional overhead outweighs the benefit
- For complex arrays (objects, refinements), we do all the checking just to fall through to the slow path
- Net result: slower for ALL cases

**Lesson Learned:**
"Pre-compilation" with runtime conditionals is a contradiction. True pre-compilation means **zero** runtime checks.

---

## Performance Comparison: property-validator vs zod

### Current State (Baseline)

| Scenario | property-validator | zod | Gap |
|----------|-------------------|-----|-----|
| Primitives (string) | 3.3M ops/sec | 697k ops/sec | **4.7x FASTER** ✅ |
| Objects (simple) | 1.6M ops/sec | 1.2M ops/sec | **1.3x FASTER** ✅ |
| Arrays (10 items) | **48k ops/sec** | **133k ops/sec** | **2.7x SLOWER** ❌ |
| Arrays (100 items) | 4.8k ops/sec | 14.8k ops/sec | 3.1x slower ❌ |
| Unions (3 options) | 6.6M ops/sec | 4.0M ops/sec | **1.7x FASTER** ✅ |
| Refinements (chained) | 7.6M ops/sec | 533k ops/sec | **14x FASTER** ✅ |

### Strengths

- ✅ **Primitives**: 4.7x faster than zod (zero overhead validation)
- ✅ **Objects**: 1.3x faster (efficient property validation)
- ✅ **Unions**: 1.7x faster (short-circuit matching)
- ✅ **Refinements**: 14x faster (no JIT compilation overhead)

### Weakness

- ❌ **Arrays**: 2.7x slower than zod (function call overhead per item)

---

## Root Cause Analysis

### Why Arrays Are Slow

For an array of 10 strings, property-validator does:

```
For each of 10 items:
  1. Call validateFast(stringValidator, item)    // Function call #1
  2. Inside validateFast:
     - Check for defaults (line 483-488)         // Unnecessary for primitives
     - Call stringValidator.validate(item)       // Function call #2
     - Check for _transform (line 493)           // Unnecessary for primitives
     - Create Result object { ok, value }        // Object allocation
  3. Access .ok property                         // Property access

Total per item: 2 function calls + 1 object allocation + 2 unnecessary checks
```

For 10 items: **20 function calls + 10 object allocations + 20 checks**

### Why zod Is Fast

Zod likely uses TRUE pre-compilation:

```typescript
// Hypothetical zod internals (simplified)
function createArrayValidator(itemValidator) {
  // At construction time, generate specialized validator
  if (isPrimitive(itemValidator)) {
    // Return optimized function with NO runtime conditionals
    return (data) => {
      if (!Array.isArray(data)) return fail();
      for (const item of data) {
        if (typeof item !== 'string') return fail(); // Direct check, no function call
      }
      return succeed(data);
    };
  } else {
    // General case
    return (data) => { /* ... */ };
  }
}
```

**Key differences:**
1. **Zero runtime conditionals** - all branching happens at construction
2. **Direct type checks** - no function calls
3. **No Result objects** - fail() and succeed() likely inline
4. **Single loop** - validate + transform in one pass

---

## What Would Work: True Pre-Compilation

To match zod's performance, we'd need:

### 1. Generate Specialized Validators at Construction

```typescript
export function array<T>(itemValidator: Validator<T>): ArrayValidator<T> {
  // Detect item type at construction (ONE TIME)
  const itemType = itemValidator._type;
  const hasRefinements = itemValidator._hasRefinements;

  let validateFn: (data: unknown[]) => boolean;

  // Generate specialized validator (NO runtime conditionals!)
  if (itemType === 'string' && !hasRefinements) {
    // Optimized string array validator
    validateFn = (data) => data.every((item) => typeof item === 'string');
  } else if (itemType === 'number' && !hasRefinements) {
    // Optimized number array validator
    validateFn = (data) => data.every((item) => typeof item === 'number' && !Number.isNaN(item));
  } else if (itemType === 'boolean' && !hasRefinements) {
    // Optimized boolean array validator
    validateFn = (data) => data.every((item) => typeof item === 'boolean');
  } else {
    // General case - use validateFast
    validateFn = (data) => data.every((item) => validateFast(itemValidator, item).ok);
  }

  return {
    validate(data: unknown): data is T[] {
      if (!Array.isArray(data)) return false;
      // Call pre-compiled validator - zero conditionals!
      return validateFn(data);
    },
    // ...
  };
}
```

### 2. Inline Transform Logic

```typescript
let transformFn: (data: unknown[]) => T[];

if (itemType && !itemValidator._transform) {
  // No transforms - return input directly
  transformFn = (data) => data as T[];
} else {
  // Has transforms - apply them
  transformFn = (data) => {
    const result: unknown[] = [];
    for (const item of data) {
      const validated = validateFast(itemValidator, item);
      result.push(validated.value);
    }
    return result as T[];
  };
}
```

### 3. Zero Runtime Overhead

**Before (current):**
```typescript
validate(data: unknown): data is T[] {
  // Check conditions on EVERY call
  const itemType = itemValidator._type;
  if (itemType && !itemValidator._hasRefinements && ...) {
    // ...
  }
}
```

**After (true pre-compilation):**
```typescript
validate(data: unknown): data is T[] {
  if (!Array.isArray(data)) return false;
  return validateFn(data); // Call pre-generated function - zero conditionals!
}
```

---

## Estimated Performance Impact

With true pre-compilation:

| Scenario | Current | With Pre-compilation | Expected Speedup |
|----------|---------|---------------------|------------------|
| string[] (10) | 48k ops/sec | ~110k ops/sec | **2.3x faster** |
| number[] (10) | 48k ops/sec | ~110k ops/sec | **2.3x faster** |
| boolean[] (10) | 48k ops/sec | ~110k ops/sec | **2.3x faster** |
| object[] (10) | 48k ops/sec | ~60k ops/sec | 1.25x faster |

**Gap vs zod:**
- Current: 2.7x slower
- After: **0.8x slower** → Competitive with zod!

---

## Conclusion

**All 3 attempted optimizations failed** because they tried to optimize within the existing architecture. The architecture itself is the bottleneck:

1. **Runtime conditionals are expensive** - checking properties and branching costs more than function calls
2. **Function call overhead compounds** - 2 calls per item × 10 items = 20 calls
3. **Object allocations add up** - creating Result objects for every item is wasteful

**To achieve 2x+ speedup:**
- Requires **architectural refactor** to generate specialized validators at construction
- Move ALL conditional logic to construction time (zero runtime conditionals)
- Inline type checks directly (no function calls for primitives)

**Is it worth it?**
- Arrays are currently **2.7x slower** than zod
- Primitives are **4.7x faster** than zod
- Overall, property-validator is still highly competitive

**Recommendation:**
- Accept current array performance as acceptable trade-off
- Focus on other features (v0.5.0 built-in validators, v1.0.0 stability)
- Consider pre-compilation as future v2.0.0 enhancement if array performance becomes critical

---

## References

- **Benchmark results:** `benchmarks/README.md`
- **zod source:** https://github.com/colinhacks/zod
- **Performance investigation:** Commits ff75c46, 850abb0, 75b26c9
