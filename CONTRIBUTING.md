# Contributing to [Tool Name]

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js 18+ (for TypeScript tools)
- Git
- Basic understanding of TypeScript and Node.js

### Clone and Install

```bash
git clone https://github.com/tuulbelt/[tool-name].git
cd [tool-name]
npm install  # Installs devDependencies only
```

### Run Tests

```bash
npm test  # Run all tests
npm run build  # Verify TypeScript compiles
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Follow existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Run Quality Checks

Before committing, run:

```bash
npm test         # All tests must pass
npm run build    # TypeScript must compile
npx tsc --noEmit # Type checking
```

### 4. Commit Changes

Use clear, descriptive commit messages:

```bash
git commit -m "feat: add new validation feature"
git commit -m "fix: handle edge case in parser"
git commit -m "docs: update README with examples"
```

**Commit message format:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub.

## Code Standards

### TypeScript Style

- Use strict mode (`strict: true` in tsconfig.json)
- No `any` types (use `unknown` and type guards)
- Explicit return types on all exported functions
- Use `node:` prefix for built-in modules

**Example:**

```typescript
import { readFileSync } from 'node:fs';

export function processData(input: string): Result<Data> {
  // Implementation
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: Error };
```

### Testing

- All new features must have tests
- Aim for 80%+ code coverage
- Include edge case testing
- Test error handling

### Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Include examples for new features

## Versioning

This tool uses [Semantic Versioning](https://semver.org/):

- **`0.x.y`** — Initial development (API may change)
- **`1.0.0`** — First stable release
- **`2.0.0`** — Breaking changes increment major version

### Release Process

1. Update version in `package.json`:
   ```bash
   npm version patch  # For bug fixes (0.1.0 → 0.1.1)
   npm version minor  # For new features (0.1.0 → 0.2.0)
   npm version major  # For breaking changes (0.1.0 → 1.0.0)
   ```

2. Update `CHANGELOG.md` with changes:
   ```markdown
   ## [0.2.0] - 2025-01-15
   ### Added
   - New validation feature
   ### Fixed
   - Edge case handling bug
   ```

3. Commit and tag:
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: release v0.2.0"
   git tag v0.2.0
   ```

4. Push to GitHub:
   ```bash
   git push && git push --tags
   ```

5. (Optional) GitHub Release created automatically via workflow

## Tuulbelt Principles

This tool follows Tuulbelt design principles:

1. **Single Problem** — Solves one thing well
2. **Zero Dependencies** — No runtime dependencies
3. **Portable Interface** — CLI + library API
4. **Composable** — Works with pipes and other tools
5. **Proven Implementation** — No experimental features

See [PRINCIPLES.md](https://github.com/tuulbelt/tuulbelt/blob/main/PRINCIPLES.md) for details.

## Questions?

- **Issues:** [GitHub Issues](https://github.com/tuulbelt/[tool-name]/issues)
- **Meta Repo:** [tuulbelt/tuulbelt](https://github.com/tuulbelt/tuulbelt)
- **Docs:** See README.md

Thank you for contributing! 🎉
