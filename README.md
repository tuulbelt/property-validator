# Property Validator / `propval`

[![Tests](https://github.com/tuulbelt/property-validator/actions/workflows/test.yml/badge.svg)](https://github.com/tuulbelt/property-validator/actions/workflows/test.yml)
![Version](https://img.shields.io/badge/version-0.7.5-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![Dogfooded](https://img.shields.io/badge/dogfooded-🐕-purple)
![Tests](https://img.shields.io/badge/tests-537%20passing-success)
![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success)
![Performance](https://img.shields.io/badge/performance-Valibot--tier-brightgreen)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Runtime type validation with TypeScript inference.

## Problem

TypeScript provides excellent compile-time type safety, but those types disappear at runtime. When data crosses boundaries (API responses, user input, file parsing), you need runtime validation that stays in sync with your TypeScript types.

Most validation libraries introduce heavy dependencies or require maintaining separate schemas alongside your types. Property Validator provides lightweight runtime validation that infers directly from TypeScript types, with zero external dependencies.

## Features

- Zero runtime dependencies (Node.js standard library only)
- TypeScript-first design with automatic type inference
- Framework-agnostic (works with React, Vue, Svelte, vanilla JS)
- Clear, actionable error messages
- Composable validators for complex types
- Works as CLI tool or library

## Installation

Clone the repository:

```bash
git clone https://github.com/tuulbelt/property-validator.git
cd property-validator
npm install  # Install dev dependencies only
```

No runtime dependencies — this tool uses only Node.js standard library.

**CLI names** — both short and long forms work:
- Short (recommended): `propval`
- Long: `property-validator`

**Recommended setup** — install globally for easy access:

```bash
npm link  # Enable the 'propval' command globally
propval --help
```

For local development without global install:

```bash
npx tsx src/index.ts --help
```

## Usage

### As a Library

```typescript
import { validate, v } from '@tuulbelt/property-validator';

// Define validators inline
const userValidator = v.object({
  name: v.string(),
  age: v.number(),
  email: v.string()
});

// Validate data
const result = validate(userValidator, {
  name: "Alice",
  age: 30,
  email: "alice@example.com"
});

if (result.ok) {
  console.log(result.value); // Typed as { name: string, age: number, email: string }
} else {
  console.error(result.error); // Clear error message
}
```

### As a CLI

Using short name (recommended after `npm link`):

```bash
# Validate JSON from stdin
echo '{"name":"Alice","age":30}' | propval --schema user.schema.json

# Validate a file
propval --schema user.schema.json data.json

# Show help
propval --help
```

Using long name:

```bash
property-validator --schema user.schema.json data.json
```

## API

### `validate<T>(validator: Validator<T>, data: unknown): Result<T>`

Validate data against a validator.

**Parameters:**
- `validator` — Validator instance (created with `v.*` functions)
- `data` — Unknown data to validate

**Returns:**
- `Result<T>` object with:
  - `ok: true` and `value: T` if validation succeeded
  - `ok: false` and `error: string` if validation failed

### Validator Builders

**Primitives:**
- `v.string()` — String validator
- `v.number()` — Number validator
- `v.boolean()` — Boolean validator

**Collections:**
- `v.array(itemValidator)` — Array validator (homogeneous elements)
  - `.min(n)` — Minimum length constraint
  - `.max(n)` — Maximum length constraint
  - `.length(n)` — Exact length constraint
  - `.nonempty()` — Requires at least 1 element
- `v.tuple([...validators])` — Tuple validator (fixed-length, per-index types)

**Objects:**
- `v.object(shape)` — Object validator with shape

**Unions and Literals:**
- `v.union([validator1, validator2, ...])` — Union validator (OR logic, validates if any schema matches)
- `v.literal(value)` — Literal validator (exact value matching using `===`)
- `v.enum(['a', 'b', 'c'])` — Enum validator (union of string literals)

**Modifiers:**
- `v.optional(validator)` — Optional field (allows undefined) *[deprecated: use `.optional()` method]*
- `v.nullable(validator)` — Nullable field (allows null) *[deprecated: use `.nullable()` method]*

**Chainable Methods (all validators):**
- `.refine(predicate, message)` — Add custom validation logic
- `.transform(fn)` — Transform validated value (changes type)
- `.optional()` — Allow undefined
- `.nullable()` — Allow null
- `.nullish()` — Allow undefined or null
- `.default(value)` — Provide default value (static or lazy function)

### Array Examples

```typescript
// Basic array validation
const numbersValidator = v.array(v.number());
validate(numbersValidator, [1, 2, 3]); // ✓

// Array with length constraints
const tagsValidator = v.array(v.string()).min(1).max(5);
validate(tagsValidator, ['typescript', 'validation']); // ✓

// Array of objects
const usersValidator = v.array(v.object({
  name: v.string(),
  age: v.number()
}));
validate(usersValidator, [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 }
]); // ✓

// Nested arrays (2D matrix)
const matrixValidator = v.array(v.array(v.number()));
validate(matrixValidator, [[1, 2], [3, 4]]); // ✓
```

### Tuple Examples

```typescript
// Coordinate tuple [x, y]
const coordValidator = v.tuple([v.number(), v.number()]);
validate(coordValidator, [10, 20]); // ✓

// Mixed-type tuple
const personValidator = v.tuple([
  v.string(),   // name
  v.number(),   // age
  v.boolean()   // active
]);
validate(personValidator, ['Alice', 30, true]); // ✓

// Tuple with optional field
const entryValidator = v.tuple([
  v.string(),
  v.optional(v.number())
]);
validate(entryValidator, ['key', undefined]); // ✓
validate(entryValidator, ['key', 42]); // ✓
```

### Union Examples

```typescript
// Simple union (string | number)
const stringOrNumber = v.union([v.string(), v.number()]);
validate(stringOrNumber, 'hello'); // ✓
validate(stringOrNumber, 42); // ✓
validate(stringOrNumber, true); // ✗

// Discriminated unions (tagged unions)
const apiResponse = v.union([
  v.object({ type: v.literal('success'), data: v.string() }),
  v.object({ type: v.literal('error'), message: v.string() })
]);
validate(apiResponse, { type: 'success', data: 'OK' }); // ✓
validate(apiResponse, { type: 'error', message: 'Failed' }); // ✓

// Enum as union sugar
const statusValidator = v.enum(['active', 'inactive', 'pending']);
validate(statusValidator, 'active'); // ✓
validate(statusValidator, 'archived'); // ✗
```

### Refinement Examples

```typescript
// Positive number
const positiveNumber = v.number().refine(n => n > 0, 'Must be positive');
validate(positiveNumber, 5); // ✓
validate(positiveNumber, -5); // ✗ "Must be positive"

// Email validation
const email = v.string().refine(
  s => s.includes('@') && s.includes('.'),
  'Invalid email format'
);
validate(email, 'alice@example.com'); // ✓
validate(email, 'not-an-email'); // ✗

// Chained refinements
const password = v.string()
  .refine(s => s.length >= 8, 'Password must be at least 8 characters')
  .refine(s => /[A-Z]/.test(s), 'Password must contain uppercase letter')
  .refine(s => /[0-9]/.test(s), 'Password must contain number');
validate(password, 'SecurePass123'); // ✓
validate(password, 'weak'); // ✗ "Password must be at least 8 characters"
```

### Transform Examples

```typescript
// Parse string to integer
const parsedInt = v.string().transform(s => parseInt(s, 10));
const result = validate(parsedInt, '42');
if (result.ok) {
  console.log(result.value); // 42 (number)
}

// Trim and lowercase
const normalized = v.string()
  .transform(s => s.trim())
  .transform(s => s.toLowerCase());
validate(normalized, '  HELLO  '); // ✓ value: "hello"

// Transform with refinement
const positiveInt = v.string()
  .transform(s => parseInt(s, 10))
  .refine(n => n > 0, 'Must be positive integer');
validate(positiveInt, '42'); // ✓ value: 42
validate(positiveInt, '-5'); // ✗ "Must be positive integer"
```

### Optional, Nullable, and Default Examples

```typescript
// Optional field (allows undefined)
const optionalString = v.string().optional();
validate(optionalString, 'hello'); // ✓
validate(optionalString, undefined); // ✓
validate(optionalString, null); // ✗

// Nullable field (allows null)
const nullableNumber = v.number().nullable();
validate(nullableNumber, 42); // ✓
validate(nullableNumber, null); // ✓
validate(nullableNumber, undefined); // ✗

// Nullish (allows both undefined and null)
const nullishBoolean = v.boolean().nullish();
validate(nullishBoolean, true); // ✓
validate(nullishBoolean, undefined); // ✓
validate(nullishBoolean, null); // ✓

// Static default value
const withDefault = v.string().default('default-value');
validate(withDefault, 'custom'); // ✓ value: "custom"
validate(withDefault, undefined); // ✓ value: "default-value"

// Lazy default (function called each time)
const withTimestamp = v.number().default(() => Date.now());
validate(withTimestamp, undefined); // ✓ value: current timestamp

// Config with defaults
const configValidator = v.object({
  port: v.number().default(3000),
  host: v.string().default('localhost'),
  debug: v.boolean().default(false)
});
validate(configValidator, { port: undefined, host: undefined, debug: undefined });
// ✓ value: { port: 3000, host: "localhost", debug: false }
```

### Custom Validators

```typescript
import { v, Validator } from '@tuulbelt/property-validator';

// Create custom validator
const emailValidator: Validator<string> = {
  validate(data: unknown): data is string {
    return typeof data === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data);
  },
  error(data: unknown): string {
    return `Expected email, got: ${typeof data}`;
  }
};

// Use in object schema
const userValidator = v.object({
  email: emailValidator
});
```

## Examples

See the `examples/` directory for runnable examples:

```bash
npx tsx examples/basic.ts
```

## Testing

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
```

## Dogfooding

Tuulbelt tools validate each other via devDependencies. This tool uses:
- **test-flakiness-detector** to validate test determinism
- **output-diffing-utility** to verify validation output is deterministic

**How It Works:**

```bash
npm run dogfood           # Runs both flaky detection + output diff validation
npm run dogfood:flaky     # Runs tests 10 times to catch flaky tests
npm run dogfood:diff      # Validates output determinism via diff
```

This runs automatically in CI on every push/PR.

**Why This Matters:**
- Validation must be **deterministic** (same input → same output, every time)
- test-flakiness-detector ensures tests don't randomly fail
- output-diffing-utility proves validation produces consistent results
- Critical for caching, reproducible builds, and reliable testing

**Configuration (package.json):**

```json
{
  "scripts": {
    "dogfood": "npm run dogfood:flaky && npm run dogfood:diff",
    "dogfood:flaky": "flaky --test 'npm test' --runs 10",
    "dogfood:diff": "bash scripts/dogfood-diff.sh"
  },
  "devDependencies": {
    "@tuulbelt/test-flakiness-detector": "git+https://github.com/tuulbelt/test-flakiness-detector.git",
    "@tuulbelt/output-diffing-utility": "git+https://github.com/tuulbelt/output-diffing-utility.git"
  }
}
```

See [DOGFOODING_STRATEGY.md](./DOGFOODING_STRATEGY.md) for the decision tree on when to add additional Tuulbelt tools as devDependencies.

## Error Handling

Exit codes:
- `0` — Success
- `1` — Error (invalid input, validation failure)

Errors are returned in the `error` field of the result object, not thrown.

## Performance

Property Validator is built for high-throughput validation with zero runtime dependencies.

### Benchmarks (v0.7.5)

Comprehensive benchmarks compare property-validator against zod, yup, and valibot using [tatami-ng](https://github.com/poolifier/tatami-ng) with criterion-equivalent statistical rigor. See [`benchmarks/README.md`](./benchmarks/README.md) for full results.

**vs Zod (all categories won):**

| Operation | property-validator | zod | Winner |
|-----------|-------------------|-----|--------|
| **Primitives** | ~180 ns | ~1,100 ns | **propval** (6.1x faster) ✅ |
| **Simple Objects** | ~120 ns | ~800 ns | **propval** (6.7x faster) ✅ |
| **Object Arrays** | ~5.0 µs | ~16.5 µs | **propval** (3.3x faster) ✅ |
| **Unions** | ~107 ns | ~350 ns | **propval** (3.3x faster) ✅ |
| **Refinements** | ~200 ns | ~2.5 µs | **propval** (12.5x faster) ✅ |

**Score vs Zod: 6/6 categories won** 📊

**vs Valibot (competitive tier):**

| Operation | property-validator | valibot | Winner |
|-----------|-------------------|---------|--------|
| **Simple Objects** | ~120 ns | ~207 ns | **propval** (1.7x faster) ✅ |
| **Unions** | ~107 ns | ~450 ns | **propval** (4.5x faster) ✅ |
| **Primitives** | ~180 ns | ~101 ns | valibot (1.8x faster) |
| **Complex Nested** | ~2.5 µs | ~1.05 µs | valibot (2.4x faster) |
| **Primitive Arrays** | ~1.1 µs | ~296 ns | valibot (3.8x faster) |

**Score vs Valibot: 2 wins, 3 losses (competitive tier)**

**Why It's Fast:**
- ✅ Zero dependencies = smaller bundle, faster load
- ✅ Pre-compiled validators with fast-path for plain objects
- ✅ Lazy path building (paths computed only on errors)
- ✅ Minimal allocations via zero-copy validation

**Performance Tiers (TypeScript Validators):**
- **Ultra-fast:** Typia (AOT), TypeBox (JIT), ArkType (JIT) — 10-100x faster than Zod
- **Fast:** Valibot, property-validator — 2-6x faster than Zod
- **Baseline:** Zod — good DX, moderate performance

**Trade-offs:**
- ⚠️ Valibot is faster for primitives and complex nested objects
- ⚠️ Ultra-fast validators require build steps or different APIs
- ✅ property-validator provides rich error messages and security limits
- ✅ property-validator has Zod-like DX with better performance

### Compilation

For repeated validation of the same schema, use `v.compile()` for a 3-4x speedup:

```typescript
const UserSchema = v.object({
  name: v.string(),
  age: v.number()
});

const validateUser = v.compile(UserSchema); // Pre-compiled

// 10,000 validations
for (const user of users) {
  const result = validateUser(user); // 3.4x faster than validate()
}
```

Compilation is automatic and cached, so you don't need to call `v.compile()` manually unless you want to control when compilation happens.

## Migration from Zod, Yup, or Joi

See [MIGRATION.md](./MIGRATION.md) for a complete migration guide with side-by-side examples and API comparisons.

**Quick Comparison:**

| Feature | property-validator | zod | yup | joi |
|---------|-------------------|-----|-----|-----|
| Zero Dependencies | ✅ | ❌ | ❌ | ❌ |
| Performance | 6/6 wins vs zod | Good | Slow | Slow |
| TypeScript Inference | ✅ | ✅ | ⚠️ Partial | ❌ |
| Bundle Size | ~5KB | ~50KB | ~30KB | ~150KB |

## Future Enhancements

Planned improvements for future versions:

### v0.8.0 (Performance)
- **JIT primitive validators**: Close 1.8x gap with valibot on primitives
- **JIT object validators**: Close 2.4x gap on complex nested objects
- **JIT array validators**: Close 3.8x gap on primitive arrays

### v0.9.0 (Bundle Size)
- **Modular design**: Tree-shakable API (13.5 kB → 1-2 kB)
- **Valibot-style imports**: `import { string, object } from 'property-validator/modular'`

### v1.0.0 (Features + Stable)
- **String constraints**: `.pattern()`, `.email()`, `.url()` validators
- **Number constraints**: `.int()`, `.positive()`, `.negative()` validators
- **Schema versioning**: Migration utilities for evolving schemas

### v1.1.0+ (Advanced)
- Schema generation from existing TypeScript types
- Async validators for database/API checks
- Record/Map validators for dynamic keys
- Intersection types
- Streaming validation for large files

### Completed in v0.7.5
- ✅ **+214% improvement** on simple objects (3.1x faster than v0.7.0)
- ✅ Pre-compiled validators with fast-path for plain objects
- ✅ Lazy path building (paths computed only on errors)
- ✅ Now beats zod in ALL 6 benchmark categories
- ✅ Competitive with valibot (2 wins, 3 losses)
- ✅ tatami-ng benchmarking with criterion-equivalent rigor

### Completed in v0.4.0
- ✅ Schema compilation (`v.compile()`) with automatic caching
- ✅ Error formatting (`.format('json')`, `.format('text')`, `.format('color')`)
- ✅ Circular reference detection (`v.lazy()`)
- ✅ Security limits (`maxDepth`, `maxProperties`, `maxItems`)
- ✅ Performance benchmarks suite
- ✅ Better error paths with full validation path context
- ✅ Real-world examples (API server, React forms, CLI config)
- ✅ Migration guide from zod/yup/joi

### Completed in v0.3.0
- ✅ Union validators (`v.union()`)
- ✅ Literal validators (`v.literal()`)
- ✅ Enum validators (`v.enum()`)
- ✅ Refinement validators (`.refine()`)
- ✅ Transform validators (`.transform()`)
- ✅ Chainable optional/nullable/nullish methods
- ✅ Default values (static and lazy)

### Completed in v0.2.0
- ✅ Array constraints: `.min()`, `.max()`, `.length()`, `.nonempty()`
- ✅ Tuple validators with per-index types
- ✅ Nested array support

## Demo

![Demo](docs/demo.gif)

**[▶ View interactive recording on asciinema.org](https://asciinema.org/a/S9zWPiJiKwMNTd8EfoUcZa1xz)**

<div>
  <span style="display: inline-block; vertical-align: middle; margin-right: 8px;"><strong>Try it online:</strong></span>
  <a href="https://stackblitz.com/github/tuulbelt/property-validator" style="display: inline-block; vertical-align: middle;">
    <img src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" style="vertical-align: middle;">
  </a>
</div>

> Demos are automatically generated and embedded via GitHub Actions when demo scripts are updated.

## License

MIT — see [LICENSE](LICENSE)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Related Tools

Part of the [Tuulbelt](https://github.com/tuulbelt/tuulbelt) collection:
- [Test Flakiness Detector](https://github.com/tuulbelt/test-flakiness-detector) — Detect unreliable tests
- [CLI Progress Reporting](https://github.com/tuulbelt/cli-progress-reporting) — Concurrent-safe progress updates
- More tools coming soon...

## Performance Optimization Analysis

### Optimization History

Property-validator underwent significant performance optimization across multiple versions:

#### v0.6.0: Hybrid Compilation (2026-01-02)

**Goal:** Eliminate allocations in array validation to achieve competitive performance with zod.

**Optimizations Implemented:**

1. **Primitive Array Compilation**
   - Inline type checks for `v.array(v.string())`, `v.array(v.number())`, etc.
   - Zero allocations at runtime (compiled to simple loops with typeof checks)
   - **Result:** 888k ops/sec → **2.7x faster than zod** ✅

2. **Object Array Compilation**
   - Pre-compile object validators at construction time
   - Compile property validators recursively
   - Eliminate Result object allocations (40 allocations → 0 for 10-item array)
   - **Result:** 46k → 70k ops/sec (+49% improvement) ⚠️ Still 1.9x slower than zod

3. **Compilation Architecture**
   - `compileArrayValidator()`: Detects primitive vs object validators
   - `compileObjectValidator()`: Pre-compiles object shape validation
   - `compilePropertyValidator()`: Handles primitives, objects, and complex validators

#### v0.6.0 Results

**Primitive Arrays (string[], 10 items):**
- property-validator: 888k ops/sec
- zod: 333k ops/sec
- **Win: 2.7x faster** ✅

**Object Arrays (UserSchema[], 10 items):**
- Before v0.6.0: 46k ops/sec
- After v0.6.0: 70k ops/sec (+49%)
- zod: 136k ops/sec
- **Gap: 1.9x slower** ⚠️ (needs further investigation)

### Architectural Trade-offs

The remaining 1.9x performance gap with zod for object arrays is likely explained by these factors:

#### What property-validator prioritizes (adds overhead):

1. **Detailed Error Paths**
   - Every validation goes through `validateWithPath()` to build full paths like `users[2].metadata.tags[0]`
   - Path arrays are allocated and tracked even for successful validations
   - This enables rich error messages but adds overhead

2. **Circular Reference Detection**
   - WeakSet operations (`seen.has()`, `seen.add()`) on every object/array
   - Prevents infinite loops but adds ~5-10% overhead per validation

3. **Security Limits**
   - Depth checking (`maxDepth`)
   - Property count checking (`maxProperties`)
   - Array length checking (`maxItems`)
   - These guards add conditional checks on every validation

4. **Error Formatting**
   - ValidationError objects with structured data
   - Support for JSON, text, and ANSI color formatting
   - More detailed error information than zod

#### What zod prioritizes (optimizes for speed):

1. **Minimal Overhead**
   - Direct validation without path tracking by default
   - Simpler error objects
   - Less defensive checks

2. **Lazy Error Details**
   - Paths and details only computed when needed
   - property-validator computes them eagerly

3. **Optimized Type Guards**
   - Highly tuned validation functions
   - Minimal branching and allocation

### Performance Recommendations

Given these trade-offs, property-validator's performance is **reasonable for its feature set**:

#### Use property-validator when:
- ✅ You need detailed error messages with full paths
- ✅ You're validating untrusted input with potential circular references
- ✅ You need security limits (DoS protection)
- ✅ You want formatted error output (JSON, text, color)
- ✅ Zero dependencies is critical

#### Use zod when:
- ⚡ Raw validation speed is the top priority
- ⚡ You're validating millions of items per second
- ⚡ Simpler error messages are acceptable
- ⚡ You don't need circular reference detection

#### Use `v.compile()` for hot paths:
For performance-critical code paths, property-validator offers `v.compile()` which optimizes plain primitive validators:

```typescript
const validateUser = v.compile(UserSchema);

// 3.4x faster for repeated validations
for (const user of users) {
  const result = validateUser(user);
  // ...
}
```

**Note:** v0.6.0 implements hybrid compilation for arrays (both primitives and objects), achieving 2.7x faster performance for primitive arrays vs zod.

### Future Optimization Opportunities

Potential areas for further optimization to close the remaining 1.9x gap with zod for object arrays:

1. **Lazy Path Allocation**
   - Only allocate path arrays when validation fails
   - Would improve success-path performance significantly
   - Trade-off: More complex code, harder to maintain

2. **Inline Property Expansion** ✅ Partially implemented in v0.6.0
   - v0.6.0: Compiles object validators to eliminate allocations
   - Remaining work: Optimize property iteration loops
   - Trade-off: Increased memory usage for compiled functions

3. **Fast-Path Detection**
   - Skip circular reference detection when schema doesn't have recursion
   - Skip depth checking when maxDepth not specified
   - Trade-off: More branching logic

4. **Zod-Inspired Optimizations**
   - Study zod's source code to identify additional optimization techniques
   - May include specific V8 optimizations or data structure choices
   - Trade-off: May conflict with our design goals (detailed errors, security limits)

### Benchmark Reproducibility

To verify these results:

```bash
cd benchmarks
npm install
npm run bench:compare
```

Results saved in:
- `bench-results.txt` - After array + primitive fast-path optimizations
- `bench-results-with-object-pooling.txt` - After object path pooling

All 526 tests passing with optimizations enabled.

