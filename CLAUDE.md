# {{TOOL_NAME}} - Development Guide

**Tool:** {{tool-name}} (`{{short-name}}`)
**Language:** TypeScript
**Type:** CLI + Library
**Repository:** https://github.com/tuulbelt/{{tool-name}}
**Part of:** [Tuulbelt](https://github.com/tuulbelt/tuulbelt)

---

## Quick Reference

**Commands:**
```bash
npm install            # Install dev dependencies
npm test               # Run all tests
npm run build          # Build TypeScript
npx tsc --noEmit       # Type check
{{short-name}} --help  # CLI help
```

**CLI Names:**
- Short: `{{short-name}}` (recommended)
- Long: `{{tool-name}}`

**Test Count:** {{X}} tests (unit + integration + CLI)

---

## What This Tool Does

{{One sentence description of what this tool does and why it exists.}}

**Use Cases:**
- {{Use case 1}}
- {{Use case 2}}
- {{Use case 3}}

**Key Features:**
- Zero runtime dependencies
- Works with Node.js 18+
- TypeScript support with strict mode
- Composable via CLI or library API

---

## Architecture

**Core Components:**

1. **`src/index.ts`** - Main library and CLI entry point
   - Core functions
   - CLI argument parsing
   - Error handling

2. **`test/`** - Test suite
   - Unit tests
   - Integration tests
   - CLI tests

**Key Algorithms/Patterns:**
{{Describe main algorithms or patterns used}}

---

## Development Workflow

### Adding New Features

1. **Update library** (`src/index.ts`)
2. **Add tests** (`test/index.test.ts`)
3. **Update CLI** if needed
4. **Run quality checks:**
   ```bash
   npm test
   npm run build
   npx tsc --noEmit
   ```
5. **Update README** with examples
6. **Test dogfooding scripts** if applicable

### Testing Strategy

**Unit Tests:**
- Test core functions independently
- Cover edge cases: empty input, invalid input, boundary conditions
- Test error handling

**Integration Tests:**
- End-to-end functionality
- CLI behavior
- File I/O scenarios

**Run tests:**
```bash
npm test                    # All tests
npm test -- --grep "pattern"  # Specific test
```

### Code Style

**TypeScript Standards:**
- ES modules only (`import`, not `require()`)
- Use `node:` prefix for built-ins
- Explicit return types on exported functions
- Result pattern for error handling
- Zero `any` types (use `unknown` with type guards)

**Error Handling Pattern:**
```typescript
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: Error };

export function doSomething(input: string): Result<Output> {
  if (!input) {
    return { ok: false, error: new Error('Input required') };
  }

  try {
    const result = processInput(input);
    return { ok: true, value: result };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}
```

---

## Zero Dependencies Principle

**This tool has ZERO runtime dependencies.**

- Uses only Node.js built-in modules
- No npm packages in `dependencies` section
- Dev dependencies OK (TypeScript, test runners, `@types/*`)

**Verification:**
```bash
# CI automatically checks this
jq '.dependencies // {}' package.json
# Should output: {}
```

---

## Dogfooding

{{Describe how this tool is used by other Tuulbelt tools or validates itself}}

### Used By

{{List tools that depend on this as a library}}

### Uses

{{List Tuulbelt tools this depends on}}

### Dogfooding Scripts

**Test Flakiness Detection:**
```bash
./scripts/dogfood-flaky.sh  # Validate test determinism (10 runs)
```

**Output Consistency Validation:**
```bash
./scripts/dogfood-diff.sh   # Verify consistent outputs (100 runs)
```

These scripts require meta repo context but tool works standalone.

---

## Release Checklist

Before tagging a new version:

- [ ] All tests pass: `npm test`
- [ ] Type check passes: `npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`
- [ ] Zero runtime dependencies verified
- [ ] README updated with new features
- [ ] CHANGELOG.md updated
- [ ] Version bumped in `package.json`
- [ ] Tag created: `git tag vX.Y.Z`
- [ ] Pushed to GitHub: `git push origin main --tags`

---

## Common Tasks

**Add new CLI flag:**
1. Update argument parsing in `src/index.ts`
2. Add validation logic
3. Update help text
4. Add tests
5. Update README

**Add new export function:**
1. Add function to `src/index.ts`
2. Add JSDoc documentation
3. Export from module
4. Add unit tests
5. Add to README API section

**Performance optimization:**
1. Profile current implementation
2. Identify bottleneck
3. Optimize algorithm or data structures
4. Verify tests still pass
5. Document improvement in CHANGELOG

---

## Troubleshooting

**Tests fail with module resolution errors:**
- Check `tsconfig.json` has correct `module` and `moduleResolution`
- Verify imports use `.js` extension for ES modules
- Run `npm install` to ensure dev dependencies installed

**Type errors:**
- Run `npx tsc --noEmit` to see all errors
- Check `@types/node` is installed
- Verify strict mode is enabled in `tsconfig.json`

**CLI doesn't work after `npm link`:**
- Check shebang is present: `#!/usr/bin/env -S npx tsx`
- Verify `bin` field in `package.json` points to correct file
- Run `npm unlink && npm link` to refresh symlink

---

## Related Tools

**In Tuulbelt:**
{{List related Tuulbelt tools}}

**External:**
{{List external tools that solve similar problems and how this differs}}

---

## Links

- **Repository:** https://github.com/tuulbelt/{{tool-name}}
- **Meta Repo:** https://github.com/tuulbelt/tuulbelt
- **Issues:** https://github.com/tuulbelt/tuulbelt/issues (centralized)
- **Documentation:** https://tuulbelt.github.io/tuulbelt/tools/{{tool-name}}/
- **Principles:** https://github.com/tuulbelt/tuulbelt/blob/main/PRINCIPLES.md

---

**Last Updated:** {{YYYY-MM-DD}}
**Version:** 0.1.0
**Status:** Active Development
