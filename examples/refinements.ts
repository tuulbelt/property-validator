#!/usr/bin/env -S npx tsx
/**
 * Refinement Validators - Examples
 * Demonstrates .refine() for custom validation logic beyond type checking
 */

import { v, validate } from '../src/index.ts';

console.log('=== Refinement Validators Examples ===\n');

// Example 1: Simple number refinement
console.log('1. Positive Number:');
const PositiveNumber = v.number().refine(n => n > 0, 'Must be positive');

console.log('  validate(5):', validate(PositiveNumber, 5)); // ok: true
console.log('  validate(-5):', validate(PositiveNumber, -5)); // ok: false
console.log('  validate(0):', validate(PositiveNumber, 0)); // ok: false
console.log('');

// Example 2: String pattern validation
console.log('2. Email Validation:');
const Email = v.string().refine(
  s => s.includes('@') && s.includes('.') && s.indexOf('@') < s.lastIndexOf('.'),
  'Invalid email format'
);

console.log('  validate("user@example.com"):', validate(Email, 'user@example.com')); // ok: true
console.log('  validate("invalid"):', validate(Email, 'invalid')); // ok: false
console.log('  validate("no-at-sign.com"):', validate(Email, 'no-at-sign.com')); // ok: false
console.log('');

// Example 3: URL validation
console.log('3. URL Validation:');
const URL = v.string().refine(
  s => s.startsWith('http://') || s.startsWith('https://'),
  'URL must start with http:// or https://'
);

console.log('  validate("https://example.com"):', validate(URL, 'https://example.com')); // ok: true
console.log('  validate("example.com"):', validate(URL, 'example.com')); // ok: false
console.log('');

// Example 4: Chaining multiple refinements
console.log('4. Chained Refinements (positive, even, less than 100):');
const ConstrainedNumber = v.number()
  .refine(n => n > 0, 'Must be positive')
  .refine(n => n % 2 === 0, 'Must be even')
  .refine(n => n < 100, 'Must be less than 100');

console.log('  validate(50):', validate(ConstrainedNumber, 50)); // ok: true (positive, even, < 100)
console.log('  validate(51):', validate(ConstrainedNumber, 51)); // ok: false (odd)
console.log('  validate(150):', validate(ConstrainedNumber, 150)); // ok: false (>= 100)
console.log('  validate(-10):', validate(ConstrainedNumber, -10)); // ok: false (negative)
console.log('');

// Example 5: String length validation
console.log('5. String Length Constraints:');
const Password = v.string()
  .refine(s => s.length >= 8, 'Password must be at least 8 characters')
  .refine(s => s.length <= 100, 'Password must be at most 100 characters')
  .refine(s => /[A-Z]/.test(s), 'Password must contain uppercase letter')
  .refine(s => /[a-z]/.test(s), 'Password must contain lowercase letter')
  .refine(s => /[0-9]/.test(s), 'Password must contain number');

console.log('  validate("Password123"):', validate(Password, 'Password123')); // ok: true
console.log('  validate("short"):', validate(Password, 'short')); // ok: false (too short)
console.log('  validate("password123"):', validate(Password, 'password123')); // ok: false (no uppercase)
console.log('');

// Example 6: Array refinement (non-empty)
console.log('6. Non-Empty Array:');
const NonEmptyArray = v.array(v.string()).refine(
  arr => arr.length > 0,
  'Array must not be empty'
);

console.log('  validate(["a", "b"]):', validate(NonEmptyArray, ['a', 'b'])); // ok: true
console.log('  validate([]):', validate(NonEmptyArray, [])); // ok: false
console.log('');

// Example 7: Array unique elements
console.log('7. Unique Array Elements:');
const UniqueArray = v.array(v.string()).refine(
  arr => new Set(arr).size === arr.length,
  'Array must contain unique elements'
);

console.log('  validate(["a", "b", "c"]):', validate(UniqueArray, ['a', 'b', 'c'])); // ok: true
console.log('  validate(["a", "b", "a"]):', validate(UniqueArray, ['a', 'b', 'a'])); // ok: false
console.log('');

// Example 8: Object refinement (cross-field validation)
console.log('8. Cross-Field Validation:');
const DateRange = v.object({
  startDate: v.number(),
  endDate: v.number()
}).refine(
  obj => obj.endDate > obj.startDate,
  'End date must be after start date'
);

console.log('  validate({ startDate: 1, endDate: 5 }):', validate(DateRange, { startDate: 1, endDate: 5 })); // ok: true
console.log('  validate({ startDate: 5, endDate: 1 }):', validate(DateRange, { startDate: 5, endDate: 1 })); // ok: false
console.log('');

// Example 9: Range validation
console.log('9. Number Range (0-100):');
const Percentage = v.number()
  .refine(n => n >= 0, 'Must be >= 0')
  .refine(n => n <= 100, 'Must be <= 100');

console.log('  validate(50):', validate(Percentage, 50)); // ok: true
console.log('  validate(0):', validate(Percentage, 0)); // ok: true
console.log('  validate(100):', validate(Percentage, 100)); // ok: true
console.log('  validate(-1):', validate(Percentage, -1)); // ok: false
console.log('  validate(101):', validate(Percentage, 101)); // ok: false
console.log('');

// Example 10: Combining refinements with transforms
console.log('10. Refinement + Transform:');
const TrimmedEmail = v.string()
  .transform(s => s.trim())
  .refine(s => s.includes('@'), 'Must be an email');

console.log('  validate("  user@example.com  "):', validate(TrimmedEmail, '  user@example.com  ')); // ok: true (trimmed)
console.log('  validate("  invalid  "):', validate(TrimmedEmail, '  invalid  ')); // ok: false
console.log('');

console.log('=== All Refinement Examples Complete ===');
