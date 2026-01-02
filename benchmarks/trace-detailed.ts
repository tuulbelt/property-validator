#!/usr/bin/env node --import tsx
/**
 * Detailed trace with object IDs
 */

// Monkey-patch validateWithPath to log
import * as mod from '../src/index.ts';

const originalValidateWithPath = (mod as any).validateWithPath;

let callDepth = 0;
(mod as any).validateWithPath = function(validator: any, data: any, path: any, seen: any, depth: any, options: any) {
  const indent = '  '.repeat(callDepth);
  if (typeof data === 'object' && data !== null) {
    console.log(`${indent}validateWithPath called with object:`, data);
  }
  callDepth++;
  const result = originalValidateWithPath(validator, data, path, seen, depth, options);
  callDepth--;
  if (result.ok && typeof result.value === 'object' && result.value !== null) {
    console.log(`${indent}validateWithPath returning:`, result.value);
    console.log(`${indent}Same object?`, data === result.value);
  }
  return result;
};

const { v, validate } = mod;

const input = { name: 'Alice', age: 30 };
console.log('Original input:', input);
console.log('\n=== Starting validation ===\n');

const UserSchema = v.object({
  name: v.string(),
  age: v.number(),
});

const result = validate(UserSchema, input);

console.log('\n=== Validation complete ===\n');
console.log('Final result.value:', result.value);
console.log('Final check - input === result.value?', input === result.value);
