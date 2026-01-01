# Property Validator / `propval`

[![Tests](https://github.com/tuulbelt/property-validator/actions/workflows/test.yml/badge.svg)](https://github.com/tuulbelt/property-validator/actions/workflows/test.yml)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![Dogfooded](https://img.shields.io/badge/dogfooded-🐕-purple)
![Tests](https://img.shields.io/badge/tests-101%2B%20passing-success)
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

Tuulbelt tools validate each other via devDependencies. This tool uses test-flakiness-detector to validate test determinism.

**How It Works:**

```bash
npm run dogfood    # Runs tests 10 times to catch flaky tests
```

This runs automatically in CI on every push/PR.

**Configuration (package.json):**

```json
{
  "scripts": {
    "dogfood": "flaky --test 'npm test' --runs 10"
  },
  "devDependencies": {
    "@tuulbelt/test-flakiness-detector": "git+https://github.com/tuulbelt/test-flakiness-detector.git"
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

Potential improvements for future versions:

- Schema generation from TypeScript types
- Custom error message templates
- Async validators for database checks
- Integration with popular form libraries
- Performance optimizations for large datasets

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
