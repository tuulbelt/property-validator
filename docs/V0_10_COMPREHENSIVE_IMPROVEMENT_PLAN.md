# Property Validator v0.10+ Comprehensive Improvement Plan

**Created:** 2026-01-06
**Status:** Planning
**Branch:** claude/resume-work-assessment-CDivW
**Based On:** Systematic codebase analysis, benchmark review, competitor research

---

## Executive Summary

This document captures all improvement opportunities identified through comprehensive analysis of property-validator v0.9.5. It serves as the single source of truth for implementation across sessions.

**Analysis Performed:**
- Full source code review (3,715 lines across 7 files)
- Benchmark analysis (35 benchmark files examined)
- Competitor feature comparison (Zod, Valibot, TypeBox)
- Security assessment
- Quality check command review

---

## Table of Contents

1. [Performance Optimization Opportunities](#1-performance-optimization-opportunities)
2. [Code Quality Improvements](#2-code-quality-improvements)
3. [Security Enhancements](#3-security-enhancements)
4. [Feature Set Gaps](#4-feature-set-gaps)
5. [Quality Check Command Updates](#5-quality-check-command-updates)
6. [Implementation Phases](#6-implementation-phases)

---

## 1. Performance Optimization Opportunities

### 1.1 Current Performance Position

**Source:** `benchmarks/README.md` (v0.9.2 results)

| Category | property-validator | Zod | Valibot | TypeBox JIT |
|----------|-------------------|-----|---------|-------------|
| Primitives | 69 ns | 120 ns | 84 ns | 58 ns |
| Simple Objects | 67 ns | 668 ns | 220 ns | 59 ns |
| Complex Nested | 162 ns | 4.14 µs | 1.11 µs | 118 ns |
| Unions | 85 ns | 220 ns | 93 ns | 60 ns |
| Arrays (100) | 197 ns | 5.06 µs | 1.49 µs | 122 ns |

**Summary:**
- vs Zod: 1.7x - 25.7x faster ✅
- vs Valibot: 1.1x - 7.6x faster ✅
- vs TypeBox JIT: 1.1x - 1.6x slower ⚠️

### 1.2 JIT Implementation Status

**Source:** `docs/V0_8_0_JIT_RESEARCH.md`, `docs/V0_8_5_PERFORMANCE_ROADMAP.md`

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 7 | Primitives JIT | ❌ SKIPPED (regression) |
| Phase 8 | Object JIT (`compileObjectValidator`) | ✅ COMPLETE |
| Phase 9 | Array JIT for primitives (`compileArrayValidatorJIT`) | ✅ COMPLETE |
| Phase 10 | Union JIT (`compileUnionValidator`) | ✅ COMPLETE |
| Phase 11 | check()/compileCheck() APIs | ✅ COMPLETE |

**Conclusion:** Core JIT architecture is complete. Remaining gaps are incremental.

### 1.3 Remaining Performance Gap: Arrays

**Source:** `benchmarks/README.md` - Arrays (100 items): 197 ns vs TypeBox 122 ns (1.6x slower)

**Root Cause Analysis:**

TypeBox generates pure inline JIT like:
```javascript
return Array.isArray(data) && data.every(item => typeof item === 'object' && ...)
```

Property-validator's `compileArrayValidatorJIT` (src/index.ts:916-990) currently only handles:
- Primitive item validators (string, number, boolean)
- Returns `null` for object item validators, falling back to loop-based validation

**Location:** `src/index.ts` lines 916-990

```typescript
// Current code (line 964-969):
// For object items, we currently don't JIT compile
// This is a future optimization opportunity
if (objectShape) {
  return null; // Fall back to loop-based validation
}
```

### 1.4 Optimization Opportunities

#### 1.4.1 Array JIT for Object Items

**Priority:** HIGH
**Effort:** MEDIUM
**Expected Impact:** Close 32% gap with TypeBox on arrays

**Current State:**
- `compileArrayValidatorJIT` returns `null` for object item validators
- Falls back to `compileArrayValidator` which uses a loop

**Implementation Approach:**
1. Extend `compileArrayValidatorJIT` to handle object shapes
2. Generate inline property checks for each object property
3. Pattern: `return Array.isArray(d) && d.every(i => typeof i === 'object' && i !== null && typeof i.name === 'string' && typeof i.age === 'number')`

**Code Location:** `src/index.ts:916-990`

#### 1.4.2 Compiled Array Validators Cache

**Priority:** MEDIUM
**Effort:** LOW
**Expected Impact:** 5-10% for repeated array validations

**Current State:**
- Object validators are cached in WeakMap (`compiledValidatorCache`)
- Array validators are compiled fresh each time

**Implementation Approach:**
1. Add WeakMap cache for array validators keyed by item validator
2. Cache compiled JIT functions for reuse

**Code Location:** `src/index.ts:873-915` (compileArrayValidator)

#### 1.4.3 Loop Unrolling for Small Fixed-Length Arrays

**Priority:** LOW
**Effort:** LOW
**Expected Impact:** 10-15% for small fixed arrays

**Current State:**
- Arrays with `.length(n)` still use loop validation

**Implementation Approach:**
1. For arrays with `exactLength <= 10`, generate unrolled checks
2. Pattern: `return arr[0] && arr[1] && arr[2]...` instead of loop

**Code Location:** `src/index.ts:1545-1930` (v.array)

---

## 2. Code Quality Improvements

### 2.1 Large File Issue

**Finding:** `src/index.ts` is 3,107 lines

**Current Structure:**
- Lines 1-200: Imports, types, helpers
- Lines 201-500: Core validation functions (validateWithPath, validateFast, etc.)
- Lines 501-1000: Compile-time optimization functions
- Lines 1000-1500: Primitive validator factories
- Lines 1500-2500: v namespace with all validators
- Lines 2500-2900: Named exports for tree-shaking
- Lines 2900-3107: CLI entry point

**Recommendation:** Split into modules:

```
src/
├── index.ts           # Re-exports only (~50 lines)
├── types.ts           # Already exists (427 lines) ✅
├── v.ts               # Already exists (181 lines) ✅
├── core/
│   ├── validate.ts    # validate, check, compile functions
│   ├── create.ts      # createValidator, createStringValidator, etc.
│   └── helpers.ts     # getTypeName, ensureMutablePath, etc.
├── jit/
│   ├── object.ts      # compileObjectValidator
│   ├── array.ts       # compileArrayValidator, compileArrayValidatorJIT
│   └── union.ts       # compileUnionValidator
├── validators/
│   ├── primitives.ts  # string, number, boolean
│   ├── collections.ts # array, tuple, object
│   └── modifiers.ts   # optional, nullable, union, literal
├── refinements/       # Already exists ✅
│   ├── string.ts
│   ├── number.ts
│   ├── array.ts
│   └── index.ts
└── cli.ts             # CLI entry point
```

**Priority:** MEDIUM
**Effort:** MEDIUM (refactoring, not new code)

### 2.2 Duplicated Type Checking Logic

**Finding:** Type checking duplicated across multiple locations

**Locations:**
1. `getTypeName()` at line 83-95
2. `stringError()` at line 1058-1060
3. `numberError()` at line 1068-1070
4. `booleanError()` at line 1078-1080
5. Tree-shakeable `string()` export at line 2558-2568
6. Tree-shakeable `number()` export at line 2662-2675

**Example of Duplication:**
```typescript
// In getTypeName (line 85):
if (data === null) return 'null';
if (data === undefined) return 'undefined';

// In string() export (line 2560):
return `Expected string, got ${data === null ? 'null' : data === undefined ? 'undefined' : typeof data}`;
```

**Recommendation:** Create shared `formatTypeError(expected: string, actual: unknown): string` helper

**Priority:** LOW
**Effort:** LOW

### 2.3 Version String Hardcoded

**Finding:** Version hardcoded in CLI help

**Location:** `src/index.ts` line 2918, 2921, 2969

```typescript
console.log('property-validator v0.9.1');  // Line 2918 - OUTDATED!
```

**Recommendation:** Import from package.json or use build-time replacement

```typescript
import { version } from '../package.json' assert { type: 'json' };
console.log(`property-validator v${version}`);
```

**Priority:** HIGH (quick fix)
**Effort:** LOW

### 2.4 Named Exports Delegate to v Namespace

**Finding:** Tree-shakeable exports defeat their purpose by delegating to `v`

**Location:** `src/index.ts` lines 2757-2831

**Current Pattern (defeats tree-shaking):**
```typescript
export function array<T>(itemValidator: Validator<T>): ArrayValidator<T> {
  return v.array(itemValidator);  // Pulls in entire v namespace!
}

export function object<T extends Record<string, unknown>>(
  shape: { [K in keyof T]: Validator<T[K]> }
): Validator<T> {
  return v.object(shape);  // Pulls in entire v namespace!
}
```

**Affected Exports:**
- `array()` - line 2757
- `tuple()` - line 2764
- `object()` - line 2773
- `union()` - line 2802
- `literal()` - line 2811
- `lazy()` - line 2820
- `enum_()` - line 2827

**Correct Pattern (already used for primitives):**
```typescript
// string() and number() are standalone - CORRECT
export function boolean(): Validator<boolean> {
  const validator = createValidator(validateBoolean, booleanError);
  validator._type = 'boolean';
  validator._compiled = validateBoolean;
  return validator;  // Standalone, doesn't reference v!
}
```

**Recommendation:** Convert delegating exports to standalone implementations

**Priority:** MEDIUM
**Effort:** MEDIUM

### 2.5 CLI Help Text Outdated

**Finding:** CLI help doesn't mention v0.9.5 features

**Location:** `src/index.ts` lines 2921-2957 (help text), 2967-3035 (API reference)

**Missing from CLI help:**
- ID format validators: cuid, cuid2, ulid, nanoid
- Encoding validators: base64, hex, jwt
- Number validators: port, latitude, longitude, percentage
- Datetime validators: datetime, date, time
- IP validators: ip, ipv4, ipv6

**Recommendation:** Update help text and API reference to include all v0.9.5 validators

**Priority:** MEDIUM
**Effort:** LOW

---

## 3. Security Enhancements

### 3.1 Current Security Measures (Verified)

**Source:** `src/index.ts` code review

| Protection | Status | Location |
|------------|--------|----------|
| No eval() usage | ✅ | Uses `new Function()` only |
| CSP fallback | ✅ | `canUseCodeGeneration()` at line 803-815 |
| Circular reference detection | ✅ | `checkCircular` option throughout |
| Input depth limits | ✅ | `maxDepth` option |
| Array item limits | ✅ | `maxItems` option |
| Object property limits | ✅ | `maxProperties` option |

### 3.2 ReDoS Risk in Regex Patterns

**Finding:** Complex regex patterns without input length limits

**Affected Patterns (src/index.ts):**

| Pattern | Line | Complexity |
|---------|------|------------|
| EMAIL_PATTERN | 1088 | Multiple alternations, backtracking possible |
| IPV6_PATTERN | 1109 | 9 alternatives with repetition |
| URL_PATTERN | 1091 | Moderate complexity |
| DATETIME_PATTERN | 1097 | Low risk (fixed format) |

**Current Code:**
```typescript
// EMAIL_PATTERN - no length check
const EMAIL_PATTERN = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
```

**Recommendation:** Add length limits before regex execution

```typescript
validator.email = (): StringValidator => {
  return createStringValidator([...refinements, {
    check: (s) => s.length <= 254 && EMAIL_PATTERN.test(s),  // RFC 5321 max
    message: 'Must be a valid email address'
  }]);
};
```

**Affected Validators:**
- `email()` - add `s.length <= 254` (RFC 5321)
- `url()` - add `s.length <= 2083` (practical limit)
- `ipv6()` - add `s.length <= 45` (max IPv6 length)
- `uuid()` - already fixed length, low risk

**Priority:** HIGH
**Effort:** LOW

### 3.3 JIT Code Generation Safety Audit

**Finding:** Literal values are used in generated code

**Location:** `compileUnionValidator` at src/index.ts lines 817-870

**Current Code (line 848-858):**
```typescript
// For literals, inline the check
const literalVal = (v as any)._literalValue;
if (literalVal !== undefined) {
  if (typeof literalVal === 'string') {
    checks.push(`d === ${JSON.stringify(literalVal)}`);
  } else {
    checks.push(`d === ${literalVal}`);
  }
  continue;
}
```

**Analysis:**
- String literals use `JSON.stringify()` - SAFE (escapes special chars)
- Number/boolean literals are inlined directly - SAFE (primitives only)
- No user input flows into code generation without sanitization

**Conclusion:** Current implementation is SAFE. No changes needed.

### 3.4 Security Documentation

**Finding:** No security section in README

**Recommendation:** Add security section documenting:
1. CSP requirements for JIT mode
2. Input validation limits (maxDepth, maxItems, maxProperties)
3. ReDoS protection measures
4. Safe handling of untrusted input

**Priority:** MEDIUM
**Effort:** LOW

---

## 4. Feature Set Gaps

### 4.1 Competitor Feature Matrix

**Source:** Zod documentation (https://zod.dev/api), codebase comparison

| Feature | propval | Zod | Valibot | TypeBox | Priority |
|---------|---------|-----|---------|---------|----------|
| **Primitives** | | | | | |
| string | ✅ | ✅ | ✅ | ✅ | - |
| number | ✅ | ✅ | ✅ | ✅ | - |
| boolean | ✅ | ✅ | ✅ | ✅ | - |
| bigint | ❌ | ✅ | ✅ | ✅ | LOW |
| symbol | ❌ | ✅ | ❌ | ❌ | LOW |
| **Collections** | | | | | |
| array | ✅ | ✅ | ✅ | ✅ | - |
| tuple | ✅ | ✅ | ✅ | ✅ | - |
| object | ✅ | ✅ | ✅ | ✅ | - |
| record | ❌ | ✅ | ✅ | ✅ | **HIGH** |
| map | ❌ | ✅ | ✅ | ❌ | MEDIUM |
| set | ❌ | ✅ | ✅ | ❌ | MEDIUM |
| **Modifiers** | | | | | |
| optional | ✅ | ✅ | ✅ | ✅ | - |
| nullable | ✅ | ✅ | ✅ | ✅ | - |
| nullish | ✅ | ✅ | ✅ | ✅ | - |
| default | ✅ | ✅ | ✅ | ✅ | - |
| **Unions** | | | | | |
| union | ✅ | ✅ | ✅ | ✅ | - |
| discriminatedUnion | ❌ | ✅ | ✅ | ✅ | **HIGH** |
| intersection | ❌ | ✅ | ✅ | ✅ | MEDIUM |
| **Object Features** | | | | | |
| strict (reject unknown) | ❌ | ✅ | ✅ | ✅ | **HIGH** |
| passthrough | ❌ | ✅ | ✅ | ✅ | MEDIUM |
| partial | ❌ | ✅ | ✅ | ✅ | MEDIUM |
| pick/omit | ❌ | ✅ | ✅ | ✅ | MEDIUM |
| extend/merge | ❌ | ✅ | ✅ | ✅ | MEDIUM |
| **Coercion** | | | | | |
| coerce.string/number | ❌ | ✅ | ❌ | ❌ | MEDIUM |
| **Schema Export** | | | | | |
| JSON Schema | ❌ | ✅ | ✅ | ✅ | **HIGH** |
| **Other** | | | | | |
| brand types | ❌ | ✅ | ❌ | ❌ | LOW |
| describe/metadata | ❌ | ✅ | ❌ | ❌ | LOW |
| instanceof | ❌ | ✅ | ✅ | ❌ | LOW |

### 4.2 High Priority Missing Features

#### 4.2.1 v.record(keySchema, valueSchema)

**Use Case:** Validate dictionaries with dynamic keys

**Zod API:**
```typescript
const StringMap = z.record(z.string(), z.number());
// Validates: { "a": 1, "b": 2 }
```

**Proposed API:**
```typescript
const StringMap = v.record(v.string(), v.number());
// or with key constraints:
const IdMap = v.record(v.string().uuid(), v.object({ name: v.string() }));
```

**Implementation Notes:**
- Key validator must extend string (or number for numeric keys)
- Validate all keys and values
- Type inference: `Record<KeyType, ValueType>`

#### 4.2.2 Discriminated Unions

**Use Case:** Efficient validation of tagged unions (common in APIs)

**Zod API:**
```typescript
const Shape = z.discriminatedUnion('type', [
  z.object({ type: z.literal('circle'), radius: z.number() }),
  z.object({ type: z.literal('square'), side: z.number() }),
]);
```

**Proposed API:**
```typescript
const Shape = v.discriminatedUnion('type', [
  v.object({ type: v.literal('circle'), radius: v.number() }),
  v.object({ type: v.literal('square'), side: v.number() }),
]);
```

**Implementation Notes:**
- Discriminator field checked first for O(1) dispatch
- Generate switch statement in JIT for performance
- Better error messages ("Expected 'circle' or 'square' for type")

#### 4.2.3 Strict Objects

**Use Case:** Reject objects with unknown properties

**Zod API:**
```typescript
const User = z.object({ name: z.string() }).strict();
// Rejects: { name: "Alice", extra: true }
```

**Proposed API:**
```typescript
const User = v.object({ name: v.string() }).strict();
// or: v.strictObject({ name: v.string() })
```

**Implementation Notes:**
- Check `Object.keys(data).length === Object.keys(shape).length`
- Or enumerate and check for unknown keys
- Consider `.strip()` (current behavior) vs `.passthrough()` vs `.strict()`

#### 4.2.4 JSON Schema Export

**Use Case:** OpenAPI/Swagger integration, form generators

**Zod API:**
```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';
const jsonSchema = zodToJsonSchema(UserSchema);
```

**Proposed API:**
```typescript
import { toJsonSchema } from 'property-validator/json-schema';
const jsonSchema = toJsonSchema(UserSchema);
```

**Implementation Notes:**
- Separate entry point to avoid bundle bloat
- Map validators to JSON Schema types
- Handle refinements as `format` or custom keywords
- Support Draft-07 and Draft-2020-12

### 4.3 Medium Priority Features

#### 4.3.1 Coercion API

**Use Case:** Auto-convert string inputs to proper types (form handling)

```typescript
const Age = v.coerce.number();
Age.parse("42"); // Returns 42 (not "42")
```

#### 4.3.2 Object Utilities (partial, pick, omit, extend)

**Use Case:** Schema composition and reuse

```typescript
const PartialUser = v.partial(User);        // All fields optional
const NameOnly = v.pick(User, ['name']);    // Only name field
const WithoutAge = v.omit(User, ['age']);   // All except age
const ExtendedUser = v.extend(User, { role: v.string() });
```

#### 4.3.3 Map and Set Validators

```typescript
const UserMap = v.map(v.string(), v.object({ name: v.string() }));
const TagSet = v.set(v.string());
```

---

## 5. Quality Check Command Updates

### 5.1 Current Quality Check Analysis

**Source:** `.claude/commands/quality-check.md` (301 lines)

**Current Checks:**
- ✅ Git status for uncommitted changes
- ✅ Branch sync with main
- ✅ Build verification
- ✅ Test execution
- ✅ Zero runtime dependencies
- ✅ Security scan reference
- ✅ Dogfood scripts
- ✅ Documentation builds

### 5.2 Missing Checks

| Check | Rationale | Priority |
|-------|-----------|----------|
| File size limits | Catch bloated files early | HIGH |
| `any` type detection | Maintain type safety | HIGH |
| Test count baseline | Prevent test removal | MEDIUM |
| Bundle size check | Important for libraries | MEDIUM |
| Benchmark regression | Catch performance issues | MEDIUM |
| Export verification | Ensure tree-shaking works | LOW |

### 5.3 Proposed Additions

Add to quality-check.md after TypeScript checks:

```markdown
### Performance & Size Checks (TypeScript Libraries)

```bash
# 1. Check source file sizes
echo "Checking source file sizes..."
for file in src/*.ts; do
  if [ -f "$file" ]; then
    lines=$(wc -l < "$file")
    if [ "$lines" -gt 1500 ]; then
      echo "⚠️  WARNING: $file has $lines lines (recommend <1500)"
    fi
  fi
done

# 2. Check for explicit 'any' types (excluding comments and type definitions)
echo "Checking for 'any' types..."
ANY_COUNT=$(grep -rE ":\s*any\b" src/ --include="*.ts" | grep -v "// " | grep -v "* " | wc -l || echo "0")
if [ "$ANY_COUNT" -gt 0 ]; then
  echo "⚠️  WARNING: Found $ANY_COUNT explicit 'any' type annotations"
  grep -rE ":\s*any\b" src/ --include="*.ts" | grep -v "// " | grep -v "* " | head -5
fi

# 3. Verify test count hasn't decreased (optional - requires baseline file)
if [ -f ".test-count-baseline" ]; then
  echo "Checking test count..."
  BASELINE=$(cat .test-count-baseline)
  # Extract test count from npm test output
  TEST_OUTPUT=$(npm test 2>&1)
  # Pattern depends on test framework output
  TEST_COUNT=$(echo "$TEST_OUTPUT" | grep -oE "tests? [0-9]+" | grep -oE "[0-9]+" | tail -1)
  if [ -n "$TEST_COUNT" ] && [ "$TEST_COUNT" -lt "$BASELINE" ]; then
    echo "❌ ERROR: Test count decreased from $BASELINE to $TEST_COUNT"
  else
    echo "✓ Test count: $TEST_COUNT (baseline: $BASELINE)"
  fi
fi

# 4. Check bundle size (if benchmarks/bundle-size.ts exists)
if [ -f "benchmarks/bundle-size.ts" ]; then
  echo "Checking bundle size..."
  npx tsx benchmarks/bundle-size.ts 2>&1 | tail -5
fi
```
```

### 5.4 Template Updates Required

Update these template files to propagate new checks:

1. `/home/user/tuulbelt/.claude/commands/quality-check.md`
2. `/home/user/tuulbelt/templates/tool-repo-template/` (if quality checks are inline)

---

## 6. Implementation Phases

### Phase 1: Quick Wins (v0.10.0)

**Effort:** 1-2 sessions
**Goal:** Low-effort, high-impact fixes

| Task | File | Priority |
|------|------|----------|
| Fix hardcoded version string | src/index.ts:2918 | HIGH |
| Add ReDoS length limits | src/index.ts:1088-1109 | HIGH |
| Update CLI help for v0.9.5 | src/index.ts:2921-3035 | MEDIUM |
| Update quality-check command | .claude/commands/quality-check.md | MEDIUM |

### Phase 2: Tree-Shaking Fixes (v0.10.1)

**Effort:** 1 session
**Goal:** Fix named exports to be truly standalone

| Task | File | Lines |
|------|------|-------|
| Make `array()` standalone | src/index.ts | 2757-2759 |
| Make `tuple()` standalone | src/index.ts | 2764-2768 |
| Make `object()` standalone | src/index.ts | 2773-2777 |
| Make `union()` standalone | src/index.ts | 2802-2806 |
| Make `literal()` standalone | src/index.ts | 2811-2815 |
| Make `lazy()` standalone | src/index.ts | 2820-2822 |
| Make `enum_()` standalone | src/index.ts | 2827-2830 |

### Phase 3: Performance - Array JIT (v0.10.2)

**Effort:** 2-3 sessions
**Goal:** Close TypeBox gap on arrays

| Task | Description |
|------|-------------|
| Extend `compileArrayValidatorJIT` | Handle object item validators |
| Add object property inlining | Generate `i.name`, `i.age` checks |
| Add WeakMap cache for arrays | Cache compiled array validators |
| Benchmark verification | Verify 20-30% improvement on arrays |

### Phase 4: Features - record + strict (v0.11.0)

**Effort:** 2 sessions
**Goal:** Most requested missing features

| Task | API |
|------|-----|
| Implement v.record() | `v.record(keyValidator, valueValidator)` |
| Implement .strict() | `v.object({...}).strict()` |
| Implement .passthrough() | `v.object({...}).passthrough()` |
| Add tests (20+ per feature) | Unit + integration |

### Phase 5: Features - discriminatedUnion (v0.11.1)

**Effort:** 2 sessions
**Goal:** Efficient tagged union validation

| Task | Description |
|------|-------------|
| Implement v.discriminatedUnion() | Discriminator-first validation |
| JIT optimization | Generate switch statement |
| Type inference | Proper discriminated union types |
| Error messages | Better union mismatch errors |

### Phase 6: Code Organization (v0.12.0)

**Effort:** 3-4 sessions
**Goal:** Split index.ts into modules

| Task | New Files |
|------|-----------|
| Extract core functions | src/core/validate.ts, src/core/create.ts |
| Extract JIT compilation | src/jit/object.ts, src/jit/array.ts, src/jit/union.ts |
| Extract validators | src/validators/primitives.ts, etc. |
| Extract CLI | src/cli.ts |
| Update exports | src/index.ts (re-exports only) |
| Verify tree-shaking | Bundle size tests |

### Phase 7: JSON Schema Export (v0.13.0)

**Effort:** 3-4 sessions
**Goal:** OpenAPI ecosystem compatibility

| Task | Description |
|------|-------------|
| Design mapping | Validator → JSON Schema type mapping |
| Implement converter | Recursive schema traversal |
| Handle refinements | Map to `format`, `pattern`, etc. |
| Create entry point | `property-validator/json-schema` |
| Add tests | Round-trip validation |

---

## Appendix A: File Reference

| File | Lines | Purpose |
|------|-------|---------|
| src/index.ts | 3,107 | Main implementation |
| src/types.ts | 427 | Type definitions, ValidationError |
| src/v.ts | 181 | Fluent API namespace |
| src/refinements/index.ts | 71 | Refinement re-exports |
| src/refinements/string.ts | ~150 | String refinements |
| src/refinements/number.ts | ~100 | Number refinements |
| src/refinements/array.ts | ~50 | Array refinements |

## Appendix B: Benchmark Files

| File | Purpose |
|------|---------|
| benchmarks/README.md | Results documentation |
| benchmarks/internal/api-tiers.bench.ts | validate vs check vs compileCheck |
| benchmarks/external/zod.bench.ts | Zod comparison |
| benchmarks/external/valibot.bench.ts | Valibot comparison |
| benchmarks/external/typebox.bench.ts | TypeBox comparison |
| benchmarks/ci/bench-ci.ts | CI benchmark runner |
| benchmarks/ci/compare-baseline.ts | Regression detection |

## Appendix C: Test Files

| File | Tests | Focus |
|------|-------|-------|
| test/index.test.ts | ~100 | Core validators |
| test/string-constraints.test.ts | ~50 | String methods |
| test/number-constraints.test.ts | ~40 | Number methods |
| test/array-constraints.test.ts | ~30 | Array methods |
| test/transform.test.ts | ~30 | Transform API |
| test/refinements.test.ts | ~50 | Refinement functions |
| test/jit-*.test.ts | ~100 | JIT compilation |
| test/security.test.ts | ~30 | Security features |
| (24 total test files) | ~595 | Full coverage |

---

**Document Version:** 1.0
**Last Updated:** 2026-01-06
**Next Review:** After Phase 1 completion
