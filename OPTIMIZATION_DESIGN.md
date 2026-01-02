# Object Array Optimization Design

**Goal:** Eliminate allocations in object array validation to close 2.9x performance gap with zod

## Current State

**Object arrays (10 items, UserSchema):**
- property-validator: 46,748 ops/sec
- zod: 135,393 ops/sec
- **Gap: 2.9x slower** ❌

**Primitive arrays (10 items, string[]):**
- property-validator: 891,087 ops/sec
- zod: 333,365 ops/sec
- **Win: 2.7x faster** ✅

## Root Cause Analysis

### Allocation Overhead

For a 10-item array of objects (3 properties each):

```typescript
// Current implementation (compileArrayValidator - line 658):
return (data: unknown[]): boolean => {
  for (let i = 0; i < data.length; i++) {
    if (!validateFast(itemValidator, data[i]).ok) return false;
    //      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //      Creates Result object for EVERY item
  }
  return true;
};
```

**Allocations per array:**
- 10 WeakSets (one per item in validateFast line 477)
- 30 Result objects (10 items × 3 properties in object validation)
- **Total: 40 allocations for 10-item array!**

### Call Chain Depth

**Primitive arrays:**
```
compiledValidate → inline typeof check (1 level)
```

**Object arrays:**
```
compiledValidate → validateFast → validateWithPath → _validateWithPath
  → validateWithPath (per property) → Result creation (4-5 levels)
```

## Solution: Compile Object Validators

### Strategy

Apply the same compilation approach we used for primitives to objects:

**Instead of:**
```typescript
// Generic path - calls validateFast (allocations!)
return (data: unknown[]): boolean => {
  for (let i = 0; i < data.length; i++) {
    if (!validateFast(itemValidator, data[i]).ok) return false;
  }
  return true;
};
```

**Do:**
```typescript
// Compiled path - inline validation (zero allocations)
const compiledObjectValidator = compileObjectValidator(itemValidator);
return (data: unknown[]): boolean => {
  for (let i = 0; i < data.length; i++) {
    if (!compiledObjectValidator(data[i])) return false;
  }
  return true;
};
```

### Implementation Plan

#### 1. Create `compileObjectValidator` Function

```typescript
/**
 * Compile-time optimization for object validation.
 * Returns a function that validates objects without allocating Result objects.
 *
 * @param shape - Object schema (e.g., { name: v.string(), age: v.number() })
 * @returns Compiled validator function: (data: unknown) => boolean
 */
function compileObjectValidator<T extends Record<string, unknown>>(
  shape: { [K in keyof T]: Validator<T[K]> }
): (data: unknown) => boolean {
  // Pre-compile property validators at construction time
  const entries = Object.entries(shape);
  const compiledProperties: Array<{
    key: string;
    validator: (value: unknown) => boolean;
  }> = [];

  for (const [key, fieldValidator] of entries) {
    // Compile each property validator
    const compiledValidator = compilePropertyValidator(fieldValidator);
    compiledProperties.push({ key, validator: compiledValidator });
  }

  // Return compiled validation function
  return (data: unknown): boolean => {
    // Type check
    if (typeof data !== 'object' || data === null) return false;

    const obj = data as Record<string, unknown>;

    // Validate each property with inline checks (no Result allocation)
    for (let i = 0; i < compiledProperties.length; i++) {
      const { key, validator } = compiledProperties[i];
      if (!validator(obj[key])) return false;
    }

    return true;
  };
}
```

#### 2. Create `compilePropertyValidator` Function

```typescript
/**
 * Compile a single property validator (handles primitives, objects, etc.)
 * Returns a function that validates without allocating Result objects.
 */
function compilePropertyValidator<T>(
  validator: Validator<T>
): (data: unknown) => boolean {
  const validatorType = validator._type;
  const hasRefinements = validator._hasRefinements;
  const hasTransform = validator._transform !== undefined;
  const hasDefault = validator._default !== undefined;

  // Fast path: Plain primitives
  const isPlainPrimitive = validatorType && !hasRefinements && !hasTransform && !hasDefault;

  if (isPlainPrimitive) {
    // Inline primitive checks (same as array compilation)
    if (validatorType === 'string') {
      return (data: unknown): boolean => typeof data === 'string';
    } else if (validatorType === 'number') {
      return (data: unknown): boolean =>
        typeof data === 'number' && !Number.isNaN(data);
    } else if (validatorType === 'boolean') {
      return (data: unknown): boolean => typeof data === 'boolean';
    }
  }

  // Complex validators: Fall back to validate() method
  // Still faster than validateFast (no Result allocation in hot path)
  return (data: unknown): boolean => validator.validate(data);
}
```

#### 3. Update `compileArrayValidator` to Use Object Compilation

```typescript
function compileArrayValidator<T>(itemValidator: Validator<T>): (data: unknown[]) => boolean {
  const itemType = itemValidator._type;
  const hasRefinements = itemValidator._hasRefinements;
  const hasTransform = itemValidator._transform !== undefined;
  const hasDefault = itemValidator._default !== undefined;

  // Fast path: Plain primitives (no refinements, transforms, or defaults)
  const isPlainPrimitive = itemType && !hasRefinements && !hasTransform && !hasDefault;

  if (isPlainPrimitive) {
    // ... existing primitive compilation code ...
  }

  // NEW: Check if itemValidator is an object validator
  if (itemValidator._validateWithPath && !isPlainPrimitive) {
    // Try to compile as object
    const objectShape = (itemValidator as any)._shape;
    if (objectShape) {
      const compiledObjectValidator = compileObjectValidator(objectShape);
      return (data: unknown[]): boolean => {
        for (let i = 0; i < data.length; i++) {
          if (!compiledObjectValidator(data[i])) return false;
        }
        return true;
      };
    }
  }

  // Generic path: Complex validators (unions, refinements, etc.)
  // Use validateFast to skip options overhead
  return (data: unknown[]): boolean => {
    for (let i = 0; i < data.length; i++) {
      if (!validateFast(itemValidator, data[i]).ok) return false;
    }
    return true;
  };
}
```

#### 4. Store Object Shape in Validator

Update `v.object()` to store the shape for compilation:

```typescript
object<T extends Record<string, unknown>>(
  shape: { [K in keyof T]: Validator<T[K]> }
): Validator<T> {
  const validator = createValidator(/* ... */);

  // ... existing code ...

  // NEW: Store shape for compilation
  (validator as any)._shape = shape;

  return validator;
}
```

## Expected Performance Improvement

### Elimination of Allocations

**Before (10-item object array):**
- 40 allocations (10 WeakSets + 30 Result objects)

**After (10-item object array):**
- 0 allocations (inline validation)

### Estimated Speedup

**Conservative estimate:** 2-3x improvement
- Baseline: 46,748 ops/sec
- Target: 93,496-140,244 ops/sec
- **Goal: Match or beat zod at 135,393 ops/sec** ✅

**Why this will work:**
- Eliminates all allocation overhead
- Reduces call chain depth (4-5 levels → 2 levels)
- Inlines primitive checks (same strategy that gave us 2.7x win for primitive arrays)

## Testing Strategy

### 1. Verify Zero Regression

Run all 511 tests - **must all pass**:
```bash
npm test
```

### 2. Benchmark Comparison

```bash
cd benchmarks
npm run bench           # property-validator
node --import tsx competitors/zod.bench.ts  # zod
```

**Success criteria:**
- Object arrays: ≥120,000 ops/sec (2.6x improvement, matches zod)
- Primitive arrays: maintain ≥850,000 ops/sec (no regression)

### 3. Apples-to-Apples Verification

Ensure we're comparing:
- ✅ Object arrays vs object arrays (not primitives)
- ✅ Same schema complexity (UserSchema with 3 properties)
- ✅ Same array sizes (10, 100, 1000 items)

## Implementation Phases

### Phase 1: Proof of Concept ✅
- [x] Understand current validation flow
- [x] Identify allocation points
- [x] Design compilation strategy

### Phase 2: Implementation (Next)
- [ ] Implement `compilePropertyValidator`
- [ ] Implement `compileObjectValidator`
- [ ] Update `compileArrayValidator` to detect and compile objects
- [ ] Store `_shape` in object validators

### Phase 3: Testing & Benchmarking
- [ ] Run all tests (verify zero regression)
- [ ] Benchmark object arrays
- [ ] Compare with zod (apples-to-apples)
- [ ] Document honest results

### Phase 4: Refinement (if needed)
- [ ] Handle edge cases (nested objects, unions in objects, etc.)
- [ ] Optimize further if gap remains
- [ ] Update documentation

## Risk Mitigation

**Risk:** Breaking existing tests
**Mitigation:** Run tests after each incremental change

**Risk:** Still slower than zod
**Mitigation:** Profile to find remaining bottlenecks, iterate

**Risk:** Code complexity increases
**Mitigation:** Keep compilation logic simple, well-commented, maintainable

## Success Metrics

**MUST ACHIEVE:**
- ✅ All 511 tests pass (zero regression)
- ✅ Object arrays: ≥120,000 ops/sec (match zod)
- ✅ Primitive arrays: ≥850,000 ops/sec (maintain)

**NICE TO HAVE:**
- Beat zod for object arrays (>135,393 ops/sec)
- Apply compilation to nested objects
- Further optimizations for complex schemas

---

**Status:** Design Complete - Ready for Implementation
**Next Step:** Implement Phase 2 (compilePropertyValidator, compileObjectValidator)
