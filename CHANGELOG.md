# Changelog

All notable changes to Property Validator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Nothing yet

### Changed
- Nothing yet

### Fixed
- Nothing yet

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
