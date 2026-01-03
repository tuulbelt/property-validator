# Property Validator Specification

## Overview

Runtime type validation library with TypeScript inference for validating data at system boundaries (API responses, user input, file parsing).

## Problem

TypeScript provides compile-time type safety, but those types disappear at runtime. When data crosses boundaries:
- API responses may not match expected types
- User input is always `unknown` at runtime
- File parsing produces untyped data
- No runtime validation = silent bugs and crashes

Most validation libraries require:
- Heavy external dependencies (vulnerable supply chain)
- Maintaining separate schemas alongside TypeScript types
- Complex configuration and setup

Property Validator provides lightweight runtime validation with zero external dependencies that infers directly from TypeScript types.

## Design Goals

1. **Zero dependencies** — Uses only Node.js standard library
2. **Type safe** — Full TypeScript support with automatic type inference
3. **Composable** — Validators compose to build complex schemas
4. **Clear errors** — Error messages show exactly what failed and why
5. **Chainable** — Fluent API for building validators (`.refine().transform().optional()`)
6. **Predictable** — Deterministic validation (same input → same output)

## Interface

### Library API

```typescript
import { validate, v, Validator, Result } from '@tuulbelt/property-validator';

// Result type
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

// Core validation function
function validate<T>(validator: Validator<T>, data: unknown): Result<T>;

// Validator builders
const v = {
  // Primitives
  string(): Validator<string>;
  number(): Validator<number>;
  boolean(): Validator<boolean>;

  // Collections
  array<T>(itemValidator: Validator<T>): ArrayValidator<T>;
  tuple<T extends readonly Validator<any>[]>(validators: T): Validator<TupleType<T>>;

  // Objects
  object<T extends Record<string, Validator<any>>>(shape: T): Validator<ObjectType<T>>;

  // Unions and Literals
  union<T extends readonly Validator<any>[]>(validators: T): Validator<UnionType<T>>;
  literal<T extends string | number | boolean | null>(value: T): Validator<T>;
  enum<T extends readonly string[]>(values: T): Validator<T[number]>;

  // Modifiers (deprecated - use chainable methods)
  optional<T>(validator: Validator<T>): Validator<T | undefined>;
  nullable<T>(validator: Validator<T>): Validator<T | null>;
};

// Validator interface (all validators implement this)
interface Validator<T> {
  validate(data: unknown): data is T;
  error(data: unknown): string;

  // Chainable methods (all validators)
  refine(predicate: (value: T) => boolean, message: string): Validator<T>;
  transform<U>(fn: (value: T) => U): Validator<U>;
  optional(): Validator<T | undefined>;
  nullable(): Validator<T | null>;
  nullish(): Validator<T | undefined | null>;
  default(value: T | (() => T)): Validator<T>;
}

// Array validator (extends Validator)
interface ArrayValidator<T> extends Validator<T[]> {
  min(n: number): ArrayValidator<T>;
  max(n: number): ArrayValidator<T>;
  length(n: number): ArrayValidator<T>;
  nonempty(): ArrayValidator<T>;
}
```

### CLI Interface

```
Usage: propval [options] [file]
       property-validator [options] [file]

Validate JSON data against a validator schema.

Options:
  --schema <file>   Path to schema file (required)
  -h, --help        Show help message

Arguments:
  file              JSON file to validate (default: stdin)

Examples:
  echo '{"name":"Alice"}' | propval --schema user.schema.json
  propval --schema user.schema.json data.json
```

### Input Format

The `validate()` function accepts:
- Any JavaScript value (`unknown` type)
- Validates against provided validator schema
- Returns `Result<T>` with typed value or error message

### Output Format

**Success:**
```typescript
{
  ok: true,
  value: T  // Typed according to validator
}
```

**Failure:**
```typescript
{
  ok: false,
  error: string  // Clear error message
}
```

## Validator Specifications

### Primitive Validators

#### `v.string()`

**Validates:** `typeof data === 'string'`

**Error message:** `"Expected string, got <type>"`

**Example:**
```typescript
validate(v.string(), 'hello');  // { ok: true, value: 'hello' }
validate(v.string(), 123);      // { ok: false, error: 'Expected string, got number' }
```

#### `v.number()`

**Validates:** `typeof data === 'number' && !isNaN(data)`

**Error message:** `"Expected number, got <type>"`

**Example:**
```typescript
validate(v.number(), 42);    // { ok: true, value: 42 }
validate(v.number(), NaN);   // { ok: false, error: 'Expected number, got NaN' }
```

#### `v.boolean()`

**Validates:** `typeof data === 'boolean'`

**Error message:** `"Expected boolean, got <type>"`

**Example:**
```typescript
validate(v.boolean(), true);     // { ok: true, value: true }
validate(v.boolean(), 'true');   // { ok: false, error: 'Expected boolean, got string' }
```

### Collection Validators

#### `v.array(itemValidator)`

**Validates:**
- `Array.isArray(data)` returns true
- Every element passes `itemValidator.validate(element)`

**Error message:**
- Not an array: `"Expected array, got <type>"`
- Invalid element: `"Element at index N: <element error>"`
- Length constraint: `"Array length must be ..."`

**Methods:**
- `.min(n)` — Array must have at least `n` elements
- `.max(n)` — Array must have at most `n` elements
- `.length(n)` — Array must have exactly `n` elements
- `.nonempty()` — Array must have at least 1 element (equivalent to `.min(1)`)

**Example:**
```typescript
const numbersValidator = v.array(v.number()).min(1).max(10);
validate(numbersValidator, [1, 2, 3]);  // { ok: true, value: [1, 2, 3] }
validate(numbersValidator, []);         // { ok: false, error: 'Array length must be at least 1' }
validate(numbersValidator, [1, 'two']); // { ok: false, error: 'Element at index 1: Expected number, got string' }
```

#### `v.tuple([validator1, validator2, ...])`

**Validates:**
- `Array.isArray(data)` returns true
- `data.length` matches validators array length
- Each element at index `i` passes `validators[i].validate(data[i])`

**Error message:**
- Not an array: `"Expected array, got <type>"`
- Wrong length: `"Expected tuple of length N, got M"`
- Invalid element: `"Element at index N: <element error>"`

**Type inference:**
```typescript
const coord = v.tuple([v.number(), v.number()]);
// Infers: Validator<[number, number]>
```

**Example:**
```typescript
const personValidator = v.tuple([v.string(), v.number(), v.boolean()]);
validate(personValidator, ['Alice', 30, true]);  // { ok: true, value: ['Alice', 30, true] }
validate(personValidator, ['Alice', 30]);        // { ok: false, error: 'Expected tuple of length 3, got 2' }
```

#### `v.object(shape)`

**Validates:**
- `typeof data === 'object'` and `data !== null`
- For each property in `shape`, validates `data[property]` against `shape[property]` validator

**Error message:**
- Not an object: `"Expected object, got <type>"`
- Invalid property: `"Property 'name': <property error>"`

**Type inference:**
```typescript
const userValidator = v.object({
  name: v.string(),
  age: v.number()
});
// Infers: Validator<{ name: string; age: number }>
```

**Example:**
```typescript
validate(userValidator, { name: 'Alice', age: 30 });  // { ok: true, value: { name: 'Alice', age: 30 } }
validate(userValidator, { name: 'Bob' });             // { ok: false, error: "Property 'age': Expected number, got undefined" }
```

### Union and Literal Validators

#### `v.union([validator1, validator2, ...])`

**Validates:**
- At least one validator in the array passes `validator.validate(data)`

**Error message:**
- Single option: Uses that validator's error message
- Multiple options: `"Expected one of:\n  - <error1>\n  - <error2>"`

**Type inference:**
```typescript
const stringOrNumber = v.union([v.string(), v.number()]);
// Infers: Validator<string | number>
```

**Example:**
```typescript
validate(stringOrNumber, 'hello');  // { ok: true, value: 'hello' }
validate(stringOrNumber, 42);       // { ok: true, value: 42 }
validate(stringOrNumber, true);     // { ok: false, error: 'Expected one of: ...' }
```

#### `v.literal(value)`

**Validates:**
- `data === value` (strict equality check)

**Error message:** `"Expected literal value <value>, got <data>"`

**Supported types:**
- `string`
- `number`
- `boolean`
- `null`

**Example:**
```typescript
const helloValidator = v.literal('hello');
validate(helloValidator, 'hello');  // { ok: true, value: 'hello' }
validate(helloValidator, 'world');  // { ok: false, error: "Expected literal value 'hello', got 'world'" }
```

#### `v.enum(values)`

**Validates:**
- `values.includes(data)` returns true

**Error message:** `"Expected one of ['a', 'b', 'c'], got <data>"`

**Type inference:**
```typescript
const statusValidator = v.enum(['active', 'inactive', 'pending']);
// Infers: Validator<'active' | 'inactive' | 'pending'>
```

**Example:**
```typescript
validate(statusValidator, 'active');    // { ok: true, value: 'active' }
validate(statusValidator, 'archived');  // { ok: false, error: "Expected one of ['active', 'inactive', 'pending'], got 'archived'" }
```

**Implementation note:** `v.enum(values)` is syntactic sugar for `v.union(values.map(v => v.literal(v)))`

### Chainable Methods

#### `.refine(predicate, message)`

**Behavior:**
- Adds custom validation logic after base validator passes
- Multiple refinements can be chained (evaluated in order)
- First failed refinement stops validation and returns its error message

**Error message:**
- Base validator fails: Uses base validator's error message
- Refinement fails: Uses custom `message`

**Example:**
```typescript
const positiveNumber = v.number().refine(n => n > 0, 'Must be positive');
validate(positiveNumber, 5);     // { ok: true, value: 5 }
validate(positiveNumber, -5);    // { ok: false, error: 'Must be positive' }
validate(positiveNumber, 'foo'); // { ok: false, error: 'Expected number, got string' }

const password = v.string()
  .refine(s => s.length >= 8, 'Password must be at least 8 characters')
  .refine(s => /[A-Z]/.test(s), 'Password must contain uppercase letter');
validate(password, 'short');     // { ok: false, error: 'Password must be at least 8 characters' }
validate(password, 'longpass');  // { ok: false, error: 'Password must contain uppercase letter' }
```

#### `.transform(fn)`

**Behavior:**
- After validation passes, applies transformation function to the value
- Changes output type from `T` to `U`
- Can be chained with other transforms

**Type inference:**
```typescript
const parsedInt = v.string().transform(s => parseInt(s, 10));
// Type: Validator<number> (not Validator<string>)
```

**Example:**
```typescript
const result = validate(parsedInt, '42');
if (result.ok) {
  console.log(result.value);  // 42 (number)
  console.log(typeof result.value);  // 'number'
}

const normalized = v.string()
  .transform(s => s.trim())
  .transform(s => s.toLowerCase());
validate(normalized, '  HELLO  ');  // { ok: true, value: 'hello' }
```

#### `.optional()`

**Behavior:**
- Allows `undefined` in addition to base validator's type
- Validation passes if `data === undefined` OR base validator passes

**Type inference:**
```typescript
const optionalString = v.string().optional();
// Type: Validator<string | undefined>
```

**Example:**
```typescript
validate(optionalString, 'hello');     // { ok: true, value: 'hello' }
validate(optionalString, undefined);   // { ok: true, value: undefined }
validate(optionalString, null);        // { ok: false, error: 'Expected string, got null' }
```

#### `.nullable()`

**Behavior:**
- Allows `null` in addition to base validator's type
- Validation passes if `data === null` OR base validator passes

**Type inference:**
```typescript
const nullableNumber = v.number().nullable();
// Type: Validator<number | null>
```

**Example:**
```typescript
validate(nullableNumber, 42);         // { ok: true, value: 42 }
validate(nullableNumber, null);       // { ok: true, value: null }
validate(nullableNumber, undefined);  // { ok: false, error: 'Expected number, got undefined' }
```

#### `.nullish()`

**Behavior:**
- Allows both `undefined` and `null` in addition to base validator's type
- Validation passes if `data === undefined` OR `data === null` OR base validator passes

**Type inference:**
```typescript
const nullishBoolean = v.boolean().nullish();
// Type: Validator<boolean | undefined | null>
```

**Example:**
```typescript
validate(nullishBoolean, true);       // { ok: true, value: true }
validate(nullishBoolean, undefined);  // { ok: true, value: undefined }
validate(nullishBoolean, null);       // { ok: true, value: null }
```

#### `.default(value)`

**Behavior:**
- Applies default value when `data === undefined`
- **ONLY applies to `undefined`, NOT to `null`**
- If `value` is a function, it's called each validation (lazy default)
- If `value` is static, same value is used each time

**Type inference:** Same as base validator type (not optional)

**Example:**
```typescript
const withDefault = v.string().default('default-value');
validate(withDefault, 'custom');    // { ok: true, value: 'custom' }
validate(withDefault, undefined);   // { ok: true, value: 'default-value' }
validate(withDefault, null);        // { ok: false, error: 'Expected string, got null' }

// Lazy default
let counter = 0;
const withLazy = v.number().default(() => ++counter);
validate(withLazy, undefined);  // { ok: true, value: 1 }
validate(withLazy, undefined);  // { ok: true, value: 2 }
```

## Behavior

### Normal Operation

1. Accept `unknown` data
2. Validate against validator schema
3. Apply transformations if present
4. Apply default values if data is `undefined`
5. Return `{ ok: true, value: T }` with typed value

### Error Cases

| Condition | Behavior |
|-----------|----------|
| Type mismatch | Return error with clear type expectation |
| Array element invalid | Return error with element index |
| Object property invalid | Return error with property path |
| Refinement fails | Return custom error message |
| Union all fail | Return aggregated errors from all options |
| Tuple length mismatch | Return expected vs actual length |

### Edge Cases

| Input | Validator | Output |
|-------|-----------|--------|
| Empty string `""` | `v.string()` | `{ ok: true, value: "" }` |
| `NaN` | `v.number()` | `{ ok: false, error: "Expected number, got NaN" }` |
| Empty array `[]` | `v.array(v.number()).min(1)` | `{ ok: false, error: "Array length must be at least 1" }` |
| `undefined` | `v.string().optional()` | `{ ok: true, value: undefined }` |
| `undefined` | `v.string().default('x')` | `{ ok: true, value: 'x' }` |
| `null` | `v.string().nullable()` | `{ ok: true, value: null }` |
| `null` | `v.string().default('x')` | `{ ok: false, error: "Expected string, got null" }` |

## Examples

### Example 1: API Response Validation

```typescript
const apiResponse = v.union([
  v.object({ type: v.literal('success'), data: v.string() }),
  v.object({ type: v.literal('error'), message: v.string() })
]);

const result = validate(apiResponse, await fetch('/api').then(r => r.json()));
if (result.ok) {
  if (result.value.type === 'success') {
    console.log('Data:', result.value.data);  // TypeScript knows this exists
  } else {
    console.error('Error:', result.value.message);  // TypeScript knows this exists
  }
}
```

### Example 2: Configuration with Defaults

```typescript
const configValidator = v.object({
  port: v.number().default(3000),
  host: v.string().default('localhost'),
  debug: v.boolean().default(false)
});

const result = validate(configValidator, {
  port: undefined,
  host: undefined,
  debug: undefined
});
// { ok: true, value: { port: 3000, host: 'localhost', debug: false } }
```

### Example 3: Form Validation with Refinements

```typescript
const signupForm = v.object({
  email: v.string().refine(
    s => s.includes('@') && s.includes('.'),
    'Invalid email format'
  ),
  password: v.string()
    .refine(s => s.length >= 8, 'Password must be at least 8 characters')
    .refine(s => /[A-Z]/.test(s), 'Must contain uppercase letter')
    .refine(s => /[0-9]/.test(s), 'Must contain number'),
  age: v.number().refine(n => n >= 18, 'Must be 18 or older')
});
```

### Example 4: Transformations

```typescript
const userInput = v.object({
  username: v.string()
    .transform(s => s.trim())
    .transform(s => s.toLowerCase())
    .refine(s => s.length >= 3, 'Username must be at least 3 characters'),
  age: v.string()
    .transform(s => parseInt(s, 10))
    .refine(n => n > 0 && n < 150, 'Invalid age')
});

const result = validate(userInput, { username: '  ALICE  ', age: '30' });
// { ok: true, value: { username: 'alice', age: 30 } }
```

## Performance

- **Time complexity:**
  - Primitives: O(1)
  - Arrays: O(n) where n is array length
  - Objects: O(k) where k is number of properties
  - Nested structures: O(depth × elements)
  - Refinements: O(r) where r is number of refinements

- **Space complexity:** O(1) for validation, O(n) if transformations create new data

- **Determinism:** Same input always produces same output (no random behavior, no side effects)

## Security Considerations

- Input is treated as untrusted `unknown` data
- No code execution or eval
- No file system access
- No network access
- No shell command execution
- Type guards use strict checks (`===`, `typeof`, `Array.isArray()`)

## Future Extensions

Potential additions (without breaking changes):
- String constraints: `.pattern()`, `.email()`, `.url()`, `.uuid()`
- Number constraints: `.int()`, `.positive()`, `.negative()`, `.range(min, max)`
- Better error paths: Show full property path in nested objects (e.g., `user.address.city`)
- Async validators for database/API checks
- Schema generation from existing TypeScript types
- Record/Map validators for dynamic keys
- Intersection types

## Version History

### v0.3.0 (2026-01-02)

- Union validators (`v.union()`)
- Literal validators (`v.literal()`)
- Enum validators (`v.enum()`)
- Refinement validators (`.refine()`)
- Transform validators (`.transform()`)
- Chainable optional/nullable/nullish methods
- Default values (static and lazy)
- Enhanced error messages
- 225 new tests (total: 426 tests)

### v0.2.0 (2025-12-XX)

- Array constraints: `.min()`, `.max()`, `.length()`, `.nonempty()`
- Tuple validators with per-index types
- Nested array support
- 125 new tests (total: 226 tests)

### v0.1.0 (2025-12-XX)

- Initial release
- Primitive validators (string, number, boolean)
- Array and object validators
- Basic optional/nullable modifiers
- 101 tests
