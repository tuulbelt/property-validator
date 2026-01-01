# Dogfooding Strategy: {{tool-name}}

This document outlines how this tool uses other Tuulbelt tools as devDependencies for validation.

## How Dogfooding Works

Tuulbelt tools validate each other by adding them as `devDependencies` via git URLs:

```json
{
  "devDependencies": {
    "@tuulbelt/test-flakiness-detector": "git+https://github.com/tuulbelt/test-flakiness-detector.git"
  }
}
```

This runs in CI automatically via `npm run dogfood`.

---

## Step 1: Answer These Questions

Before adding dogfood dependencies, answer these questions about your tool:

### Q1: Does your tool have tests? (Almost always YES)
- **YES** → Add test-flakiness-detector (validates test determinism)
- **NO** → Add tests first!

### Q2: Does your tool produce deterministic output?
- **YES** (same input → same output every time) → Consider output-diffing-utility
- **NO** (output varies by design, e.g., port allocation, timestamps) → Skip diff validation

### Q3: Does your tool use file-based locking or semaphores?
- **YES** (uses `file-based-semaphore-ts`) → Test concurrent scenarios
- **NO** → Skip semaphore validation

### Q4: Does your tool process file paths?
- **YES** (handles file paths, directories) → Consider cross-platform-path-normalizer
- **NO** → Skip path validation

### Q5: Does your tool have long-running operations?
- **YES** (operations that benefit from progress tracking) → Consider cli-progress-reporting
- **NO** → Skip progress integration

---

## Step 2: Default Setup (All Tools)

**Every TypeScript tool includes test-flakiness-detector by default:**

```json
{
  "scripts": {
    "dogfood": "npm run dogfood:flaky",
    "dogfood:flaky": "flaky --test 'npm test' --runs 10"
  },
  "devDependencies": {
    "@tuulbelt/test-flakiness-detector": "git+https://github.com/tuulbelt/test-flakiness-detector.git"
  }
}
```

The `dogfood` script runs all `dogfood:*` scripts. Add more as needed.

This validates that all tests pass consistently across 10 runs, catching:
- Race conditions
- Shared state between tests
- Non-deterministic logic
- Timing-dependent failures

---

## Step 3: Additional Compositions (Based on Answers)

### If Q2 = YES: Add dogfood:diff

For tools with deterministic output, add output consistency validation:

```json
{
  "scripts": {
    "dogfood": "npm run dogfood:flaky && npm run dogfood:diff",
    "dogfood:flaky": "flaky --test 'npm test' --runs 10",
    "dogfood:diff": "node test/dogfood-diff.js"
  },
  "devDependencies": {
    "@tuulbelt/test-flakiness-detector": "git+https://github.com/tuulbelt/test-flakiness-detector.git",
    "@tuulbelt/output-diffing-utility": "git+https://github.com/tuulbelt/output-diffing-utility.git"
  }
}
```

Create `test/dogfood-diff.js` to run your tool twice and compare outputs.

**Good candidates:**
- config-file-merger (same config → same merged output)
- cross-platform-path-normalizer (same path → same normalized path)
- structured-error-handler (same error → same serialized format)

**Bad candidates:**
- port-resolver (different port each time by design)
- output-diffing-utility (circular - can't validate itself)

### If Q3 = YES: Add dogfood:semaphore

For tools using file-based locking, add concurrency validation:

```json
{
  "scripts": {
    "dogfood": "npm run dogfood:flaky && npm run dogfood:semaphore",
    "dogfood:flaky": "flaky --test 'npm test' --runs 10",
    "dogfood:semaphore": "node test/dogfood-semaphore.js"
  },
  "devDependencies": {
    "@tuulbelt/test-flakiness-detector": "git+https://github.com/tuulbelt/test-flakiness-detector.git",
    "@tuulbelt/file-based-semaphore-ts": "git+https://github.com/tuulbelt/file-based-semaphore-ts.git"
  }
}
```

Create `test/dogfood-semaphore.js` to test concurrent access scenarios.

### If Q5 = YES: Add cli-progress-reporting

For tools with long-running operations that show progress:

```json
{
  "devDependencies": {
    "@tuulbelt/cli-progress-reporting": "git+https://github.com/tuulbelt/cli-progress-reporting.git"
  }
}
```

---

## Step 4: CI Integration

Dogfooding runs automatically in CI via the `test.yml` workflow:

```yaml
- name: Dogfood (flakiness detection)
  run: npm run dogfood
```

This catches flaky tests before they reach production.

---

## Available Tuulbelt Tools for Composition

| Tool | Use For | When to Add |
|------|---------|-------------|
| test-flakiness-detector | Validating test determinism | Always (default) |
| output-diffing-utility | Comparing outputs | If deterministic output |
| file-based-semaphore-ts | Concurrency control | If using file locks |
| cross-platform-path-normalizer | Path handling | If processing paths |
| cli-progress-reporting | Progress display | If long-running ops |

---

## Anti-Patterns (What NOT to Do)

1. **Don't add output-diffing if output is non-deterministic** (will always fail)
2. **Don't dogfood just to dogfood** - each dependency must provide real value
3. **Don't use a tool to validate itself** (circular validation)
4. **Don't add all tools** - pick only what applies to your tool

---

## Checklist

- [ ] Answer all 5 questions above
- [ ] Add ONLY the dependencies that apply to your tool
- [ ] Verify `npm run dogfood` passes locally
- [ ] CI runs dogfood automatically
- [ ] Update README Dogfooding section

---

**Status:** Template - answer questions and customize for your tool
