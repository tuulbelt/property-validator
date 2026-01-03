#!/usr/bin/env -S npx tsx
/**
 * Union Validators - Examples
 * Demonstrates v.union() for validating values that can be one of multiple types
 */

import { v, validate } from '../src/index.ts';

console.log('=== Union Validators Examples ===\n');

// Example 1: Simple string or number union
console.log('1. Simple Union (string | number):');
const StringOrNumber = v.union([v.string(), v.number()]);

const result1 = validate(StringOrNumber, 'hello');
console.log('  validate("hello"):', result1); // ok: true, value: "hello"

const result2 = validate(StringOrNumber, 42);
console.log('  validate(42):', result2); // ok: true, value: 42

const result3 = validate(StringOrNumber, true);
console.log('  validate(true):', result3); // ok: false
console.log('');

// Example 2: Multiple type options
console.log('2. Multiple Type Union (string | number | boolean | null):');
const MultiTypeUnion = v.union([v.string(), v.number(), v.boolean(), v.nullable(v.string())]);

const result4 = validate(MultiTypeUnion, true);
console.log('  validate(true):', result4); // ok: true, value: true

const result5 = validate(MultiTypeUnion, null);
console.log('  validate(null):', result5); // ok: true, value: null
console.log('');

// Example 3: Discriminated unions (tagged unions)
console.log('3. Discriminated Union (type-based):');
const UserOrAdmin = v.union([
  v.object({
    type: v.literal('user'),
    name: v.string(),
    email: v.string()
  }),
  v.object({
    type: v.literal('admin'),
    name: v.string(),
    role: v.string()
  })
]);

const user = { type: 'user', name: 'Alice', email: 'alice@example.com' };
const admin = { type: 'admin', name: 'Bob', role: 'superadmin' };

console.log('  validate(user):', validate(UserOrAdmin, user)); // ok: true
console.log('  validate(admin):', validate(UserOrAdmin, admin)); // ok: true
console.log('');

// Example 4: Union of arrays
console.log('4. Union of Arrays (string[] | number[]):');
const StringArrayOrNumberArray = v.union([v.array(v.string()), v.array(v.number())]);

const result6 = validate(StringArrayOrNumberArray, ['a', 'b', 'c']);
console.log('  validate(["a", "b", "c"]):', result6); // ok: true

const result7 = validate(StringArrayOrNumberArray, [1, 2, 3]);
console.log('  validate([1, 2, 3]):', result7); // ok: true

const result8 = validate(StringArrayOrNumberArray, [1, 'b', 3]);
console.log('  validate([1, "b", 3]):', result8); // ok: false (mixed types)
console.log('');

// Example 5: Union with literals
console.log('5. Union of Literals (status field):');
const Status = v.union([v.literal('pending'), v.literal('approved'), v.literal('rejected')]);

console.log('  validate("approved"):', validate(Status, 'approved')); // ok: true
console.log('  validate("invalid"):', validate(Status, 'invalid')); // ok: false
console.log('');

// Example 6: Enum as union sugar
console.log('6. Enum (syntactic sugar for union of literals):');
const Color = v.enum(['red', 'green', 'blue']);

console.log('  validate("red"):', validate(Color, 'red')); // ok: true
console.log('  validate("yellow"):', validate(Color, 'yellow')); // ok: false
console.log('');

// Example 7: Union with refinements
console.log('7. Union with Refinements:');
const PositiveOrNegative = v.union([
  v.number().refine(n => n > 0, 'Must be positive'),
  v.number().refine(n => n < 0, 'Must be negative')
]);

console.log('  validate(5):', validate(PositiveOrNegative, 5)); // ok: true
console.log('  validate(-5):', validate(PositiveOrNegative, -5)); // ok: true
console.log('  validate(0):', validate(PositiveOrNegative, 0)); // ok: false (neither positive nor negative)
console.log('');

// Example 8: Nested unions
console.log('8. Nested Union:');
const NestedUnion = v.object({
  value: v.union([v.string(), v.number(), v.boolean()])
});

console.log('  validate({ value: "text" }):', validate(NestedUnion, { value: 'text' })); // ok: true
console.log('  validate({ value: 42 }):', validate(NestedUnion, { value: 42 })); // ok: true
console.log('  validate({ value: true }):', validate(NestedUnion, { value: true })); // ok: true
console.log('');

// Example 9: Union with optional
console.log('9. Union with Optional:');
const OptionalUnion = v.union([v.string(), v.number()]).optional();

console.log('  validate(undefined):', validate(OptionalUnion, undefined)); // ok: true
console.log('  validate("hello"):', validate(OptionalUnion, 'hello')); // ok: true
console.log('  validate(42):', validate(OptionalUnion, 42)); // ok: true
console.log('');

console.log('=== All Union Examples Complete ===');
