#!/usr/bin/env node --import tsx
/**
 * Test: Do we return the input object directly or clone it?
 */

import { v, validate } from '../src/index.ts';

const UserSchema = v.object({
  name: v.string(),
  age: v.number(),
});

const input = { name: 'Alice', age: 30 };

const result = validate(UserSchema, input);

if (result.ok) {
  console.log('✓ Validation passed');
  console.log('Input object:', input);
  console.log('Result value:', result.value);
  console.log('');
  console.log('Are they the same object reference?');
  console.log('  input === result.value:', input === result.value);

  if (input === result.value) {
    console.log('  ✅ NO CLONING - returns input directly');
  } else {
    console.log('  ❌ CLONING DETECTED - returns a copy');
  }
}
