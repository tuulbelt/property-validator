# Migration Guide

Migrating from zod, yup, or joi to property-validator.

## Overview

Property Validator is a lightweight, zero-dependency runtime validation library with TypeScript inference. If you're coming from zod, yup, or joi, this guide will help you migrate.

**Key Benefits:**
- ✅ Zero external dependencies (uses only Node.js standard library)
- ✅ 6-10x faster than zod/yup for primitive validation
- ✅ TypeScript-first design with automatic type inference
- ✅ Framework-agnostic (works with React, Vue, Express, etc.)
- ✅ Clear, actionable error messages

## Feature Comparison

| Feature | property-validator | zod | yup | joi |
|---------|-------------------|-----|-----|-----|
| **Zero Dependencies** | ✅ | ❌ | ❌ | ❌ |
| **TypeScript Inference** | ✅ | ✅ | ⚠️ (partial) | ❌ |
| **Primitives** | ✅ | ✅ | ✅ | ✅ |
| **Objects** | ✅ | ✅ | ✅ | ✅ |
| **Arrays** | ✅ | ✅ | ✅ | ✅ |
| **Tuples** | ✅ | ✅ | ✅ | ❌ |
| **Unions** | ✅ | ✅ | ❌ | ❌ |
| **Literals** | ✅ | ✅ | ❌ | ❌ |
| **Refinements** | ✅ | ✅ | ✅ | ✅ |
| **Transforms** | ✅ | ✅ | ✅ | ❌ |
| **Optional/Nullable** | ✅ | ✅ | ✅ | ✅ |
| **Defaults** | ✅ | ✅ | ✅ | ✅ |
| **Async Validation** | ⚠️ (manual) | ✅ | ✅ | ✅ |
| **Recursive Schemas** | ✅ (via `v.lazy`) | ✅ | ✅ | ✅ |
| **Error Formatting** | ✅ (JSON, text, color) | ✅ | ✅ | ✅ |
| **Schema Compilation** | ✅ | ✅ | ❌ | ❌ |
| **Performance** | **Fast** (6-10x vs zod/yup) | Good | Slow | Slow |

## Side-by-Side Examples

### Basic Validation

**Zod:**
```typescript
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
});

const result = UserSchema.safeParse(data);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

**property-validator:**
```typescript
import { validate, v } from '@tuulbelt/property-validator';

const UserSchema = v.object({
  name: v.string(),
  age: v.number(),
  email: v.string().refine(
    s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
    'Invalid email format'
  ),
});

const result = validate(UserSchema, data);
if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error);
}
```

### Arrays with Constraints

**Yup:**
```typescript
import * as yup from 'yup';

const schema = yup.array()
  .of(yup.number())
  .min(1)
  .max(10);

const result = await schema.validate(data);
```

**property-validator:**
```typescript
import { validate, v } from '@tuulbelt/property-validator';

const schema = v.array(v.number())
  .min(1)
  .max(10);

const result = validate(schema, data);
```

### Unions and Literals

**Zod:**
```typescript
import { z } from 'zod';

const StatusSchema = z.union([
  z.literal('pending'),
  z.literal('approved'),
  z.literal('rejected')
]);

// Or use enum shorthand
const StatusSchema = z.enum(['pending', 'approved', 'rejected']);
```

**property-validator:**
```typescript
import { v } from '@tuulbelt/property-validator';

const StatusSchema = v.union([
  v.literal('pending'),
  v.literal('approved'),
  v.literal('rejected')
]);

// Or use enum shorthand
const StatusSchema = v.enum(['pending', 'approved', 'rejected']);
```

### Refinements (Custom Validation)

**Zod:**
```typescript
const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .refine(s => /[A-Z]/.test(s), 'Must contain uppercase')
  .refine(s => /[0-9]/.test(s), 'Must contain number');
```

**property-validator:**
```typescript
const PasswordSchema = v.string()
  .refine(s => s.length >= 8, 'Password must be at least 8 characters')
  .refine(s => /[A-Z]/.test(s), 'Must contain uppercase')
  .refine(s => /[0-9]/.test(s), 'Must contain number');
```

### Transforms

**Zod:**
```typescript
const ParsedIntSchema = z.string().transform(s => parseInt(s, 10));
```

**property-validator:**
```typescript
const ParsedIntSchema = v.string().transform(s => parseInt(s, 10));
```

### Optional and Nullable

**Zod:**
```typescript
const schema = z.object({
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().nullable(),
  bio: z.string().nullish(), // undefined or null
});
```

**property-validator:**
```typescript
const schema = v.object({
  name: v.string(),
  email: v.string().optional(),
  phone: v.string().nullable(),
  bio: v.string().nullish(), // undefined or null
});
```

### Default Values

**Zod:**
```typescript
const ConfigSchema = z.object({
  port: z.number().default(3000),
  host: z.string().default('localhost'),
});
```

**property-validator:**
```typescript
const ConfigSchema = v.object({
  port: v.number().default(3000),
  host: v.string().default('localhost'),
});
```

### Recursive Schemas

**Zod:**
```typescript
type Category = {
  name: string;
  subcategories: Category[];
};

const CategorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({
    name: z.string(),
    subcategories: z.array(CategorySchema),
  })
);
```

**property-validator:**
```typescript
type Category = {
  name: string;
  subcategories: Category[];
};

const CategorySchema = v.lazy(() =>
  v.object({
    name: v.string(),
    subcategories: v.array(CategorySchema),
  })
);
```

## Performance Comparison

Based on benchmarks (see `benchmarks/README.md`):

| Operation | property-validator | zod | yup |
|-----------|-------------------|-----|-----|
| **Primitive Validation** | **113M ops/sec** | 17M ops/sec | 11M ops/sec |
| **Compilation Speedup** | **3.4x** | 2.1x | N/A |
| **Union Validation** | **35M ops/sec** | 7M ops/sec | N/A |
| **Refinements** | **15M ops/sec** | 1M ops/sec | N/A |
| **Array Validation** | 8M ops/sec | **45M ops/sec** | 12M ops/sec |

**Key Takeaways:**
- ✅ property-validator is 6-10x faster for primitives, unions, and refinements
- ⚠️ zod is currently faster for array validation (optimization in progress)
- ✅ property-validator has zero dependencies, zod/yup have 3-15 dependencies each

## Key Differences

### 1. Result Object Structure

**Zod:**
```typescript
const result = schema.safeParse(data);
if (result.success) {
  result.data; // Validated data
} else {
  result.error; // ZodError object
}
```

**property-validator:**
```typescript
const result = validate(schema, data);
if (result.ok) {
  result.value; // Validated data
} else {
  result.error; // ValidationError object
}
```

### 2. Error Handling

**Zod:**
- Throws errors by default (`parse()`)
- Returns result object with `.safeParse()`

**property-validator:**
- Always returns result object (never throws)
- Errors are values, not exceptions

### 3. Async Validation

**Yup:**
```typescript
const schema = yup.string().test('unique', 'Username taken', async (value) => {
  return await checkUnique(value);
});
```

**property-validator:**
```typescript
// Manual async validation (async validators not built-in yet)
const result = validate(schema, data);
if (result.ok) {
  const isUnique = await checkUnique(result.value.username);
  if (!isUnique) {
    // Handle error
  }
}
```

### 4. Dependencies

**Zod:** 3 dependencies (peer deps)
**Yup:** 8 dependencies
**Joi:** 15 dependencies
**property-validator:** 0 dependencies ✅

## Migration Steps

### Step 1: Install property-validator

```bash
git clone https://github.com/tuulbelt/property-validator.git
cd property-validator
npm install  # Dev dependencies only
npm link     # Enable 'propval' command globally
```

### Step 2: Replace Imports

**Before (zod):**
```typescript
import { z } from 'zod';
```

**After (property-validator):**
```typescript
import { validate, v, type Infer } from '@tuulbelt/property-validator';
```

### Step 3: Update Schema Definitions

**Before (zod):**
```typescript
const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

type User = z.infer<typeof UserSchema>;
```

**After (property-validator):**
```typescript
const UserSchema = v.object({
  name: v.string(),
  age: v.number(),
});

type User = Infer<typeof UserSchema>;
```

### Step 4: Update Validation Calls

**Before (zod):**
```typescript
const result = UserSchema.safeParse(data);
if (result.success) {
  // Use result.data
} else {
  // Use result.error
}
```

**After (property-validator):**
```typescript
const result = validate(UserSchema, data);
if (result.ok) {
  // Use result.value
} else {
  // Use result.error
}
```

### Step 5: Update Error Formatting

**Before (zod):**
```typescript
if (!result.success) {
  console.error(result.error.flatten());
}
```

**After (property-validator):**
```typescript
if (!result.ok) {
  console.error(result.error.format('text'));
  // Or: result.error.format('json')
  // Or: result.error.format('color') for ANSI terminal colors
}
```

## Incompatibilities

### Features Not Yet Supported

1. **Async Validators** — Manual async validation required (see [Example 4 in react-forms.ts](examples/react-forms.ts))
2. **Branded Types** — Use TypeScript brands manually
3. **Preprocess** — Use `.transform()` instead
4. **Coercion** — Use explicit `.transform()` instead of implicit coercion
5. **Catch** — Use `.default()` for fallback values
6. **Superrefine** — Chain multiple `.refine()` calls instead

### Breaking Changes from Zod

1. **Result object keys**: `result.success` → `result.ok`, `result.data` → `result.value`
2. **No throwing by default**: `schema.parse()` does not exist, use `validate()` which returns a result
3. **Error type**: `ZodError` → `ValidationError` (different structure)
4. **Inference type**: `z.infer<T>` → `Infer<T>`

## When to Use Which Library

### Use property-validator when:
- ✅ You want zero external dependencies
- ✅ Performance is critical (high-throughput validation)
- ✅ You're building a library and want minimal dependency footprint
- ✅ TypeScript type inference is essential
- ✅ You need a lightweight validation solution (<5KB)

### Use zod when:
- ⚠️ You need built-in async validators
- ⚠️ You're already using zod and migration cost is high
- ⚠️ You need branded types or advanced TypeScript features
- ⚠️ You prefer throwing errors over result objects

### Use yup when:
- ⚠️ You're using Formik (tight integration)
- ⚠️ You need object schema mutation (`.concat()`, `.omit()`)

### Use joi when:
- ⚠️ You're building a Node.js API server and prefer joi's API
- ⚠️ You need joi-specific features (alternatives, assertions)

## Examples

See the `examples/` directory for complete migration examples:

- [Basic Validation](examples/basic.ts)
- [Advanced Patterns](examples/advanced.ts)
- [Arrays and Tuples](examples/arrays.ts)
- [Unions and Literals](examples/unions.ts)
- [Refinements](examples/refinements.ts)
- [Optional and Nullable](examples/optional-nullable.ts)
- [API Server Validation](examples/api-server.ts)
- [React Form Validation](examples/react-forms.ts)
- [CLI Configuration](examples/cli-config.ts)

## Support

If you encounter issues during migration:

1. Check the [API reference](README.md#api)
2. Review the [examples](examples/)
3. Open an issue: https://github.com/tuulbelt/property-validator/issues

## Contributing

Found a migration pattern not covered here? Submit a PR to improve this guide:

1. Add the pattern to this document
2. Include code examples (before/after)
3. Test the example to ensure it works

---

**Last Updated:** 2026-01-02
**Version:** v0.4.0
