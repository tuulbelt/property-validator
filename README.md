# Property Validator

[![Tests](https://github.com/tuulbelt/property-validator/actions/workflows/test.yml/badge.svg)](https://github.com/tuulbelt/property-validator/actions/workflows/test.yml)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success)
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
  email: v.string().email()
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

- `v.string()` — String validator
- `v.number()` — Number validator
- `v.boolean()` — Boolean validator
- `v.array(itemValidator)` — Array validator
- `v.object(shape)` — Object validator with shape
- `v.optional(validator)` — Optional field
- `v.nullable(validator)` — Nullable field

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

## Future Enhancements

Planned improvements for future versions:

### High Priority (v0.2.0)
- **Constraints**: `.min()`, `.max()`, `.pattern()` for strings/numbers
- **Better error paths**: Show full property path in nested objects (e.g., `user.address.city`)
- **oneOf()**: Union/enum validation for multiple type options
- **TypeScript inference utility**: `TypeOf<typeof schema>` for extracting inferred types

### Medium Priority (v0.3.0)
- Schema generation from existing TypeScript types
- Custom error message templates
- Async validators for database/API checks

### Performance (v0.4.0)
- Optimizations for large datasets
- Streaming validation for large files
- Cached validator compilation

### As Needed
- Plugin API for custom type handlers
- Schema versioning and migration utilities
- Benchmarking suite against other validators
- JSON Schema standard compatibility layer
- Binary serialization format for schemas

## Demo

![Demo](docs/demo.gif)

**[▶ View interactive recording on asciinema.org](#)**

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
