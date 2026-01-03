# Changelog

All notable changes to Property Validator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Benchmarking Migration:** Migrated all benchmarks from tinybench to tatami-ng v0.8.18
  - Variance improved from ±19.4% (tinybench) to ±0.86% (tatami-ng) - 13.1x more stable
  - All competitor benchmarks (zod, yup, valibot) migrated to tatami-ng
  - Created comprehensive baseline comparison documentation (`BASELINE_COMPARISON.md`)
  - Updated BASELINE.md with reliable tatami-ng data
  - Ready for v0.7.5 optimization work with trustworthy benchmarking infrastructure

### Added
- **Baseline Comparison Documentation:**
  - `benchmarks/BASELINE_COMPARISON.md` (336 lines) - Head-to-head comparison vs zod, yup, valibot
  - Performance gap analysis with optimization targets
  - Statistical rigor: p-values, confidence intervals, variance <5%
- **Performance Baseline (v0.7.0 with tatami-ng):**
  - 2-3x faster than zod on primitives, 2-9x on objects
  - 7-8x faster than yup on primitives, 8-17x on objects
  - 2.1x slower than valibot on primitives (primary optimization target)
  - 4-5x faster than valibot on unions

## [0.4.0] - 2026-01-02

### Added
- Schema compilation (`v.compile()`) for optimized repeated validation
  - 3.4x performance improvement for compiled validators
  - Automatic caching via WeakMap to prevent memory leaks
- Advanced error formatting
  - `error.format('json')` — Structured JSON output
  - `error.format('text')` — Human-readable plain text
  - `error.format('color')` — ANSI color codes for terminal output
  - Debug mode traces with validation path and value context
- Circular reference detection and handling
  - `v.lazy()` for recursive schema definitions
  - Automatic circular reference detection during validation
  - Prevents infinite loops in recursive data structures
- Security limits for resource exhaustion protection
  - `maxDepth` config option (default: 100) for nested structures
  - `maxProperties` config option (default: 1000) for object size
  - `maxItems` config option (default: 10,000) for array length
  - Clear error messages on limit violations
- Performance benchmarks suite (`benchmarks/`)
  - Comparison against zod and yup
  - 6-10x faster for primitive validation
  - 2-5x faster for unions
  - 5-15x faster for refinements
  - Detailed performance analysis in `benchmarks/README.md`
- Real-world example files
  - `examples/api-server.ts` — HTTP API request/response validation
  - `examples/react-forms.ts` — React form validation patterns
  - `examples/cli-config.ts` — CLI configuration validation
- Migration guide (`MIGRATION.md`) with comparisons to zod, yup, and joi
- 85 new tests for v0.4.0 features (total: 511 tests, exceeding 491 target)

### Changed
- Enhanced ValidationError with formatting methods
- Improved error messages to include full validation path
- Optimized primitive validators with fast-path compilation
- Updated README with performance benchmarks section
- Enhanced documentation with migration guide

### Performance Improvements
- String validation: 3.42x faster with compilation (33M → 113M ops/sec)
- Number/Boolean validation: ~4x faster with compilation
- Union validation: 2-5x faster than zod
- Refinement validation: 5-15x faster than zod
- Primitive validation: 6-10x faster than zod/yup

### Implementation Notes
- Schema compilation enabled by default for repeated validations
- Error formatting methods available on ValidationError instances
- Lazy evaluation prevents infinite recursion in circular schemas
- Security limits configurable via validation config object
- Zero runtime dependencies maintained
- All 511 tests passing (104.1% of target)

## [0.3.0] - 2026-01-02

### Added
- Union validators (`v.union()`) for multi-type validation
- Literal validators (`v.literal()`) for exact value matching
- Enum validators (`v.enum()`) as syntactic sugar for union of literals
- Refinement validators (`.refine()`) for custom validation logic
- Transform validators (`.transform()`) for value transformation with type changes
- Chainable optional/nullable methods (`.optional()`, `.nullable()`, `.nullish()`)
- Default value support (`.default()`) with static and lazy defaults
- Enhanced error messages for unions, refinements, and literals
- New example files: `examples/unions.ts`, `examples/refinements.ts`, `examples/optional-nullable.ts`
- Full TypeScript type inference for all new features
- 225 new tests (total: 426 tests)

### Changed
- Refactored validator architecture to support method chaining
- Improved error aggregation for union type failures
- Enhanced type inference for transformed values

### Implementation Notes
- All validators now support refinements, transforms, optional/nullable, and defaults
- Default values apply only to `undefined`, not `null`
- Lazy defaults (functions) are called on each validation
- Zero runtime dependencies maintained

## [0.2.0] - 2026-01-02

### Added
- Enhanced array validator with fluent API (`.min()`, `.max()`, `.length()`, `.nonempty()`)
- Tuple validator (`v.tuple()`) with fixed-length and per-index validation
- Nested array support (2D, 3D, 4+ levels)
- Full TypeScript type inference via `TupleType` helper
- 125 new tests (total: 226 tests)
- New example files: `examples/arrays.ts`, `examples/tuples.ts`

### Implementation Notes
- Array validator supports length constraints and element validation
- Tuple validator validates exact length and per-index types
- Zero runtime dependencies maintained

## [0.1.0] - 2026-01-01

### Added
- Initial release with basic validators
- String, number, boolean validators
- Array and object validators
- Optional and nullable validators
- Nested validator support
- CLI tool with `propval` short name
- TypeScript-first design with type inference
- Zero runtime dependencies
- Comprehensive test suite (16 tests)

### Implementation Notes
- Zero runtime dependencies (Node.js built-in modules only)
- TypeScript with strict type checking
- Framework-agnostic design (works with React, Vue, Svelte, vanilla JS)
