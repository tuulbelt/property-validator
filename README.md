# Property Validator / `propval`

[![Tests](https://github.com/tuulbelt/property-validator/actions/workflows/test.yml/badge.svg)](https://github.com/tuulbelt/property-validator/actions/workflows/test.yml)
![Version](https://img.shields.io/badge/version-0.7.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![Dogfooded](https://img.shields.io/badge/dogfooded-🐕-purple)
![Tests](https://img.shields.io/badge/tests-537%20passing-success)
![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success)
![Performance](https://img.shields.io/badge/performance-6%2F6%20wins%20vs%20zod-success)
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

### Benchmarks

Comprehensive benchmarks compare property-validator against zod, yup, and valibot. See [`benchmarks/README.md`](./benchmarks/README.md) for full results.

**Key Results (v0.7.0 - Rich Error API):**

| Operation | property-validator | zod | valibot | Winner (vs zod) |
|-----------|-------------------|-----|---------|-----------------|
| **Primitives** | 4.1M ops/sec | 713k ops/sec | 7.6M ops/sec | **pv** (5.8x faster) ✅ |
| **Objects (simple)** | 2.4M ops/sec | 1.0M ops/sec | 4.2M ops/sec | **pv** (2.4x faster) ✅ |
| **Primitive Arrays** | 998k ops/sec | 326k ops/sec | 2.9M ops/sec | **pv** (3.1x faster) ✅ |
| **Object Arrays** | 137k ops/sec | 128k ops/sec | 571k ops/sec | **pv** (1.07x faster) ✅ |
| **Unions** | 5.6M ops/sec | 2.8M ops/sec | 1.2M ops/sec | **pv** (2.0x faster) ✅ |
| **Refinements** | 8.5M ops/sec | 473k ops/sec | 5.9M ops/sec | **pv** (18x faster) ✅ |

**Final Score vs Zod: 6 wins, 0 losses (100% win rate)** 🎉
**Final Score vs Yup: 6 wins, 0 losses (100% win rate)** 🎉

**Fast Boolean API (v0.7.0):**
When using `.validate()` for boolean-only checks (no error details), property-validator is **73-116x faster than zod** and **15-46x faster than valibot** through Phase 3 code generation optimizations.

**Why It's Fast:**
- ✅ Phase 3 code generation: inline property access via `new Function()`
- ✅ Zero allocations for boolean API (returns primitive `true`/`false`)
- ✅ Conditional transform optimization (returns original object when possible)
- ✅ Zero runtime dependencies = smaller bundle, faster load

**Valibot Comparison:**
Valibot leads on primitives (1.7-2.1x) and objects (1.8x), but property-validator wins on unions (4.7x) and refinements (1.4x when chained).

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

| Feature | property-validator | zod | yup | valibot | joi |
|---------|-------------------|-----|-----|---------|-----|
| Zero Dependencies | ✅ | ❌ | ❌ | ✅ | ❌ |
| Performance | 6/6 wins vs zod | Good | Slow | Excellent | Slow |
| TypeScript Inference | ✅ | ✅ | ⚠️ Partial | ✅ | ❌ |
| Bundle Size | ~5KB | ~50KB | ~30KB | ~12KB | ~150KB |

## Future Enhancements

Planned improvements for future versions:

### High Priority (v1.0.0)
- **String constraints**: `.pattern()`, `.email()`, `.url()` validators
- **Number constraints**: `.int()`, `.positive()`, `.negative()` validators
- **Documentation enhancements**: Interactive examples, API reference improvements

### Medium Priority (v1.1.0+)
- Schema generation from existing TypeScript types
- Async validators for database/API checks
- Record/Map validators for dynamic keys
- Intersection types
- Streaming validation for large files

### As Needed
- Plugin API for custom type handlers
- Schema versioning and migration utilities
- JSON Schema standard compatibility layer
- Binary serialization format for schemas

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

#### v0.7.0: Phase 3 Code Generation (2026-01-03) 🎉

**Goal:** Achieve 100% win rate vs zod through code generation optimizations.

**Result:** ✅ ACHIEVED - property-validator now beats zod on ALL 6 categories (100% win rate)

**Key Breakthrough:**

Phase 3 code generation optimizations closed the remaining performance gaps:

1. **Object Array Validation** - SOLVED
   - Before v0.7.0: 70k ops/sec (1.9x slower than zod's 136k)
   - After v0.7.0: 137k ops/sec (1.07x faster than zod's 128k) ✅
   - **Improvement:** +96% vs v0.6.0

2. **Simple Object Validation** - IMPROVED
   - Before v0.7.0: 861k ops/sec
   - After v0.7.0: 2.4M ops/sec (2.4x faster than zod's 1.0M) ✅
   - **Improvement:** +179% vs v0.6.0

3. **Fast Boolean API** - NEW CAPABILITY
   - 7.6M-10M ops/sec vs zod 87k-104k ops/sec
   - **73-116x faster than zod** 🚀
   - Zero allocations through inline code generation

#### v0.6.0: Hybrid Compilation (2026-01-02)

**Primitive Array Compilation:**
- Inline type checks for `v.array(v.string())`, `v.array(v.number())`, etc.
- Result: 888k ops/sec → **2.7x faster than zod** ✅

**Object Array Compilation:**
- Pre-compile object validators, eliminate Result allocations
- Result: 46k → 70k ops/sec (+49%) but still 1.9x slower than zod ⚠️

### v0.7.0 Final Results

**Rich Error API:**
- Primitives: 4.1M vs zod 713k (5.8x faster) ✅
- Objects: 2.4M vs zod 1.0M (2.4x faster) ✅
- Object Arrays: 137k vs zod 128k (1.07x faster) ✅
- Primitive Arrays: 998k vs zod 326k (3.1x faster) ✅
- Unions: 5.6M vs zod 2.8M (2.0x faster) ✅
- Refinements: 8.5M vs zod 473k (18x faster) ✅

**Fast Boolean API:**
- 7.6M-10M ops/sec vs zod 87k-104k (73-116x faster) ✅

### Architectural Strengths

Property-validator achieves top performance while maintaining:

1. **Detailed Error Paths** - Full paths like `users[2].metadata.tags[0]`
2. **Circular Reference Detection** - Prevents infinite loops
3. **Security Limits** - maxDepth, maxProperties, maxItems protection
4. **Error Formatting** - JSON, text, and ANSI color output
5. **Zero Dependencies** - No external runtime dependencies

### Performance Recommendations

#### Use property-validator when:
- ✅ You need best-in-class performance vs zod/yup (100% win rate)
- ✅ You need detailed error messages with full paths
- ✅ You're validating untrusted input with potential circular references
- ✅ You need security limits (DoS protection)
- ✅ You want formatted error output (JSON, text, color)
- ✅ Zero dependencies is critical
- ✅ You want extreme performance with fast boolean API (73-116x faster)

#### Use valibot when:
- ⚡ You prioritize primitives and simple objects (valibot 1.7-2.1x faster for primitives)
- ⚡ You need the smallest bundle size (~12KB vs property-validator's ~5KB + overhead)
- ⚡ Modularity is more important than raw performance for complex validation
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

**Note:** v0.7.0 implements Phase 3 code generation, achieving 100% win rate vs zod across ALL categories.

### Completed Optimizations ✅

v0.7.0 successfully closed all performance gaps with zod:

1. **Inline Property Expansion** ✅ COMPLETE in v0.7.0
   - v0.6.0: Compiled object validators to eliminate allocations
   - v0.7.0: Phase 3 code generation with `new Function()` for inline property access
   - **Result:** Object arrays now 1.07-2.8x faster than zod ✅

2. **Fast Boolean API** ✅ COMPLETE in v0.7.0
   - Zero-allocation validation for boolean-only checks
   - Returns primitive `true`/`false` instead of Result objects
   - **Result:** 73-116x faster than zod ✅

3. **Simple Object Optimization** ✅ COMPLETE in v0.7.0
   - Phase 3 optimizations improved simple objects from 861k to 2.4M ops/sec
   - **Result:** 2.4x faster than zod ✅

### Future Optimization Opportunities (v0.8.0+)

Now that performance targets are met, future optimizations could focus on:

1. **CSP-Compatible Mode Improvements**
   - Current CSP fallback is functional but slower (no code generation)
   - Explore alternative optimizations that don't require `new Function()`
   - Trade-off: Complexity vs security environment support

2. **Lazy Path Allocation**
   - Only allocate path arrays when validation fails
   - Could further improve success-path performance
   - Trade-off: More complex code, marginal gains now that we beat zod

3. **Schema Caching**
   - Cache compiled validators across schema instances
   - Could reduce memory usage for repeated schema definitions
   - Trade-off: Memory management complexity

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

