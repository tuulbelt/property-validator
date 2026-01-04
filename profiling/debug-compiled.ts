/**
 * Debug why nested objects don't get _compiled
 */
import { v } from '../src/index.ts';

// Simple object - should have _compiled
const simple = v.object({ id: v.number(), name: v.string() });
console.log('Simple object _compiled:', !!(simple as any)._compiled);
console.log('Simple object _validateWithPath:', !!(simple as any)._validateWithPath);

// Array validator
const arr = v.array(v.string());
console.log('\nArray _compiled:', !!(arr as any)._compiled);
console.log('Array _validateWithPath:', !!(arr as any)._validateWithPath);
console.log('Array _hasRefinements:', !!(arr as any)._hasRefinements);
console.log('Array _transform:', !!(arr as any)._transform);

// Object with array
const objWithArray = v.object({ tags: v.array(v.string()) });
console.log('\nObject with array _compiled:', !!(objWithArray as any)._compiled);

// Check if array validator affects parent object's plain check
const arrValidator = v.array(v.string());
console.log('\nChecking array validator properties:');
console.log('  _hasRefinements:', arrValidator._hasRefinements);
console.log('  _transform:', (arrValidator as any)._transform);
console.log('  _default:', (arrValidator as any)._default);

// Object with nested object (no array)
const nestedNoArray = v.object({
  id: v.number(),
  inner: v.object({ name: v.string() })
});
console.log('\nNested object (no array) _compiled:', !!(nestedNoArray as any)._compiled);

// What about optional?
const optional = v.optional(v.string());
console.log('\nOptional _compiled:', !!(optional as any)._compiled);
console.log('Optional _hasRefinements:', optional._hasRefinements);
console.log('Optional _transform:', !!(optional as any)._transform);
