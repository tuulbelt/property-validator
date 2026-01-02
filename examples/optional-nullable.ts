#!/usr/bin/env -S npx tsx
/**
 * Optional/Nullable Validators - Examples
 * Demonstrates .optional(), .nullable(), .nullish(), and .default() methods
 */

import { v, validate } from '../src/index.ts';

console.log('=== Optional/Nullable Validators Examples ===\n');

// Example 1: Optional fields
console.log('1. Optional String:');
const OptionalString = v.string().optional();

console.log('  validate("hello"):', validate(OptionalString, 'hello')); // ok: true, value: "hello"
console.log('  validate(undefined):', validate(OptionalString, undefined)); // ok: true, value: undefined
console.log('  validate(null):', validate(OptionalString, null)); // ok: false (null not allowed)
console.log('');

// Example 2: Nullable fields
console.log('2. Nullable Number:');
const NullableNumber = v.number().nullable();

console.log('  validate(42):', validate(NullableNumber, 42)); // ok: true, value: 42
console.log('  validate(null):', validate(NullableNumber, null)); // ok: true, value: null
console.log('  validate(undefined):', validate(NullableNumber, undefined)); // ok: false (undefined not allowed)
console.log('');

// Example 3: Nullish (undefined or null)
console.log('3. Nullish Boolean (accepts undefined and null):');
const NullishBoolean = v.boolean().nullish();

console.log('  validate(true):', validate(NullishBoolean, true)); // ok: true, value: true
console.log('  validate(undefined):', validate(NullishBoolean, undefined)); // ok: true, value: undefined
console.log('  validate(null):', validate(NullishBoolean, null)); // ok: true, value: null
console.log('');

// Example 4: Optional with default value
console.log('4. Optional with Default:');
const OptionalWithDefault = v.string().optional().default('default-value');

console.log('  validate("custom"):', validate(OptionalWithDefault, 'custom')); // ok: true, value: "custom"
console.log('  validate(undefined):', validate(OptionalWithDefault, undefined)); // ok: true, value: "default-value"
console.log('');

// Example 5: Static defaults
console.log('5. Static Default Values:');
const ConfigWithDefaults = v.object({
  port: v.number().default(3000),
  host: v.string().default('localhost'),
  debug: v.boolean().default(false)
});

console.log('  validate({}):', validate(ConfigWithDefaults, {}));
// ok: false (requires all fields, but will apply defaults for undefined)

console.log('  validate({ port: undefined, host: undefined, debug: undefined }):');
const result = validate(ConfigWithDefaults, { port: undefined, host: undefined, debug: undefined });
console.log('  ', result); // ok: true, applies defaults
console.log('');

// Example 6: Lazy defaults (functions)
console.log('6. Lazy Default (timestamp generator):');
let counter = 0;
const WithLazyDefault = v.number().default(() => {
  counter++;
  return Date.now() + counter;
});

console.log('  validate(undefined) #1:', validate(WithLazyDefault, undefined)); // Calls function
console.log('  validate(undefined) #2:', validate(WithLazyDefault, undefined)); // Calls function again (different value)
console.log('  validate(42):', validate(WithLazyDefault, 42)); // Uses provided value, doesn't call function
console.log('');

// Example 7: Nullable vs Optional in objects
console.log('7. Optional vs Nullable in Objects:');
const User = v.object({
  name: v.string(),
  email: v.string().optional(),      // Can be undefined (field can be omitted)
  phone: v.string().nullable(),       // Can be null (field must be present)
  bio: v.string().nullish()           // Can be undefined or null
});

console.log('  validate({ name: "Alice", phone: null, bio: undefined }):');
console.log('  ', validate(User, { name: 'Alice', phone: null, bio: undefined }));
// ok: false (email is undefined but not provided)

console.log('  validate({ name: "Alice", email: undefined, phone: null, bio: undefined }):');
console.log('  ', validate(User, { name: 'Alice', email: undefined, phone: null, bio: undefined }));
// ok: true (all fields match types)
console.log('');

// Example 8: Combining optional with refinements
console.log('8. Optional with Refinements:');
const OptionalPositiveNumber = v.number()
  .refine(n => n > 0, 'Must be positive')
  .optional();

console.log('  validate(5):', validate(OptionalPositiveNumber, 5)); // ok: true
console.log('  validate(undefined):', validate(OptionalPositiveNumber, undefined)); // ok: true
console.log('  validate(-5):', validate(OptionalPositiveNumber, -5)); // ok: false (not positive)
console.log('');

// Example 9: Array with default
console.log('9. Array with Default:');
const TagsWithDefault = v.array(v.string()).default([]);

console.log('  validate(["tag1", "tag2"]):', validate(TagsWithDefault, ['tag1', 'tag2'])); // ok: true
console.log('  validate(undefined):', validate(TagsWithDefault, undefined)); // ok: true, value: []
console.log('');

// Example 10: Null vs Undefined distinction
console.log('10. Null vs Undefined Distinction:');
const DefaultAppliesOnlyToUndefined = v.string().nullable().default('fallback');

console.log('  validate(undefined):', validate(DefaultAppliesOnlyToUndefined, undefined));
// ok: true, value: "fallback"

console.log('  validate(null):', validate(DefaultAppliesOnlyToUndefined, null));
// ok: true, value: null (default NOT applied to null)

console.log('  validate("custom"):', validate(DefaultAppliesOnlyToUndefined, 'custom'));
// ok: true, value: "custom"
console.log('');

console.log('=== All Optional/Nullable Examples Complete ===');
