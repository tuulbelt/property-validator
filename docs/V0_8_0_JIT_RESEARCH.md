# v0.8.0 JIT Compilation Research

**Date:** 2026-01-04
**Status:** Research Complete, Ready for Implementation
**Author:** Claude Code Session

---

## Executive Summary

**Key Finding:** JIT compilation provides **19x improvement for object validation** but **negligible/negative impact for primitives**.

This fundamentally changes our v0.8.0 strategy:
- ❌ **Skip Phase 7 (JIT primitives)** - V8 already optimizes closures well
- ✅ **Focus on Phase 8 (JIT objects)** - 19x improvement potential
- ✅ **Implement Phase 9 (JIT arrays)** - Similar gains expected

---

## Benchmark Results

### Primitive Validation (1M iterations)

| Validator | Closure | JIT | Improvement |
|-----------|---------|-----|-------------|
| String | 3.89 ns | 6.27 ns | **Closure 1.6x faster** |
| Number | 5.98 ns | 4.23 ns | JIT 1.4x faster |
| Boolean | 4.57 ns | 3.78 ns | JIT 1.2x faster |

**Conclusion:** JIT provides no meaningful benefit for primitives. V8's JIT compiler already optimizes closure-based type checks very efficiently.

### Object Validation (1M iterations)

| Validator | Closure | JIT | Improvement |
|-----------|---------|-----|-------------|
| Object validate() | 81.50 ns | 4.28 ns | **JIT 19x faster** |
| Full validate() with Result | 45.31 ns | 9.78 ns | **JIT 4.6x faster** |

**Conclusion:** JIT provides massive benefits for object validation because:
1. Eliminates property iteration loops
2. Direct property access (V8 can optimize named access)
3. All validation inlined into single function

### Full API Comparison

| API | Closure | JIT | Improvement |
|-----|---------|-----|-------------|
| validate(stringValidator, data) | 13.16 ns | 8.01 ns | JIT 1.6x faster |
| validate(objectValidator, data) | 45.31 ns | 9.78 ns | **JIT 4.6x faster** |

---

## TypeBox Analysis

### How TypeBox Generates Code

TypeBox's TypeCompiler uses generators to yield validation expressions:

```javascript
// FromObject generates:
function* FromObject(schema, references, value) {
  yield `(typeof ${value} === 'object' && ${value} !== null)`;
  for (const key of Object.keys(schema.properties)) {
    const memberExpr = `${value}.${key}`;  // or value['key'] for special chars
    yield* Visit(schema.properties[key], references, memberExpr);
  }
}
```

### Generated Code Example

For `{ name: string, age: number }`:

```javascript
function check(value) {
  return (
    (typeof value === 'object' && value !== null && !Array.isArray(value)) &&
    (typeof value.name === 'string') &&
    (typeof value.age === 'number' && !Number.isNaN(value.age))
  )
}
```

### Key Patterns

1. **Direct Property Access:** `value.name` not `value[keys[i]]`
2. **Inlined Checks:** No function calls for nested properties
3. **Safe Key Escaping:** `value['special-key']` for non-identifier keys
4. **AND Chain:** All checks combined with `&&`

---

## CSP Compatibility

### The Problem

Content Security Policy can block `new Function()`:

```
Content-Security-Policy: script-src 'self'
```

### Our Solution

```typescript
function isJITAvailable(): boolean {
  try {
    const testFn = new Function('return true');
    return testFn() === true;
  } catch {
    return false;  // CSP blocks it
  }
}
```

### Fallback Strategy

1. Attempt JIT compilation at **validator creation time**
2. If CSP blocks, catch error and use closure-based
3. Both paths produce identical results
4. Zero user configuration required

### Environment Behavior

| Environment | JIT Available | Behavior |
|-------------|---------------|----------|
| Node.js | Always | Use JIT |
| Browser (no CSP) | Yes | Use JIT |
| Browser (strict CSP) | No | Use closure fallback |
| Deno | Always | Use JIT |
| Bun | Always | Use JIT |

---

## Revised v0.8.0 Implementation Plan

### Phase 7: Skip (Primitives)

**Original Plan:** JIT-compile primitive validators
**New Decision:** Skip - no meaningful improvement

**Rationale:**
- String validation: Closure is 1.6x **faster** than JIT
- Number/Boolean: Only 1.2-1.4x improvement (not worth complexity)
- V8 already optimizes `typeof x === 'string'` perfectly

### Phase 8: JIT Object Validators (HIGH PRIORITY)

**Expected Improvement:** 4-19x depending on property count

**Implementation:**

```typescript
function compileObjectValidator(shape: Record<string, Validator>): CompiledValidator {
  if (!isJITAvailable()) {
    return createClosureValidator(shape);  // Fallback
  }

  const checks: string[] = [
    "typeof data === 'object'",
    "data !== null"
  ];

  for (const [key, validator] of Object.entries(shape)) {
    const safeKey = isValidIdentifier(key) ? `data.${key}` : `data['${escapeKey(key)}']`;

    if (validator._type === 'string') {
      checks.push(`typeof ${safeKey} === 'string'`);
    } else if (validator._type === 'number') {
      checks.push(`typeof ${safeKey} === 'number' && !Number.isNaN(${safeKey})`);
    } else if (validator._type === 'boolean') {
      checks.push(`typeof ${safeKey} === 'boolean'`);
    } else {
      // Complex validator - use closure reference
      const ref = `validators.${key}`;
      checks.push(`${ref}.validate(${safeKey})`);
    }
  }

  const code = `return ${checks.join(' && ')}`;
  const fn = new Function('data', 'validators', code);

  return (data: unknown) => fn(data, shape);
}
```

### Phase 9: JIT Array Validators (MEDIUM PRIORITY)

**Expected Improvement:** 2-5x for primitive arrays

**Implementation:**

```typescript
function compileArrayValidator(itemValidator: Validator): CompiledValidator {
  if (!isJITAvailable()) {
    return createClosureArrayValidator(itemValidator);
  }

  // Primitive item types - fully inline
  if (itemValidator._type === 'string') {
    const code = `
      if (!Array.isArray(data)) return false;
      for (let i = 0; i < data.length; i++) {
        if (typeof data[i] !== 'string') return false;
      }
      return true;
    `;
    return new Function('data', code) as CompiledValidator;
  }

  // Complex item types - use validator reference
  const code = `
    if (!Array.isArray(data)) return false;
    for (let i = 0; i < data.length; i++) {
      if (!validator.validate(data[i])) return false;
    }
    return true;
  `;
  const fn = new Function('data', 'validator', code);
  return (data: unknown) => fn(data, itemValidator);
}
```

---

## Memory Impact

### JIT Code Strings

Each compiled validator stores:
1. Source code string (for debugging): ~100-500 bytes per schema
2. Compiled function reference: Same as any function

**Estimate for 100 schemas:**
- Code strings: ~50 KB
- Function objects: ~8 KB (80 bytes each)
- Total: ~60 KB

**Verdict:** Negligible memory impact

### Comparison with Current Approach

Current closure-based validators also allocate:
- Refinements array: 24+ bytes
- Transform function ref: 8 bytes
- Validator object: 80+ bytes

**Verdict:** JIT approach has similar or lower memory footprint

---

## Risk Assessment

### Low Risk
- ✅ CSP fallback tested and working
- ✅ TypeBox has proven this approach in production
- ✅ No breaking API changes needed

### Medium Risk
- ⚠️ Complex validators may need hybrid approach (JIT outer, closure inner)
- ⚠️ Error paths need careful handling (path tracking)

### Mitigation
- Incremental rollout: Start with simple objects, add complexity
- Feature flag: `v.compile()` already exists, enhance it
- Benchmark every change: tatami-ng provides reliable measurements

---

## Next Steps

1. **Create feature branch** for v0.8.0 implementation
2. **Implement Phase 8** (JIT object validators) first
3. **Benchmark against valibot** to verify improvements
4. **Implement Phase 9** (JIT arrays) if Phase 8 successful
5. **Skip Phase 7** (primitives) - confirmed not beneficial

---

## References

- [TypeBox GitHub](https://github.com/sinclairzx81/typebox)
- [Typia Performance Article](https://dev.to/samchon/typia-15000x-faster-validator-and-its-histories-1fmg)
- [tatami-ng Benchmarking](https://github.com/poolifier/tatami-ng)

---

## Appendix: Profiling Scripts

Located in `/profiling/`:
- `jit-research.ts` - Benchmark closure vs JIT
- `csp-test.ts` - CSP compatibility testing
