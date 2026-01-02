#!/usr/bin/env node --import tsx
/**
 * Trace exactly WHERE cloning happens
 */

import { v, validate, validateWithPath } from '../src/index.ts';

const input = { name: 'Alice', age: 30 };

console.log('Original input:', input);
console.log('Input address (for comparison):', input);

// Test individual validators
const nameValidator = v.string();
const nameResult = validate(nameValidator, 'Alice');
console.log('\nString validator:');
console.log('  Input: "Alice"');
console.log('  Result:', nameResult);
console.log('  Same?', 'Alice' === nameResult.value);

// Test object validator
const UserSchema = v.object({
  name: v.string(),
  age: v.number(),
});

console.log('\nObject validator:');
const result = validate(UserSchema, input);
console.log('  Result:', result);
console.log('  Input === result.value?', input === result.value);

// Try validateWithPath directly
console.log('\nDirect validateWithPath call:');
const directResult = validateWithPath(UserSchema, input, [], new WeakSet(), 0, {});
console.log('  Result:', directResult);
console.log('  Input === result.value?', input === directResult.value);
