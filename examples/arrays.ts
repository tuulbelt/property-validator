#!/usr/bin/env -S npx tsx
/**
 * Array Validator Examples
 *
 * Demonstrates array validation with:
 * - Basic arrays
 * - Length constraints
 * - Nested arrays
 * - Arrays of objects
 * - Type-safe validation
 */

import { validate, v } from '../src/index.js';

console.log('=== Array Validator Examples ===\n');

// ============================================================================
// 1. Basic Array Validation
// ============================================================================

console.log('1. Basic Arrays:');

const numbersValidator = v.array(v.number());
const numbers = [1, 2, 3, 4, 5];
const result1 = validate(numbersValidator, numbers);

console.log(`  Input: ${JSON.stringify(numbers)}`);
console.log(`  Valid: ${result1.ok}`);
if (result1.ok) {
  console.log(`  Type-safe access: ${result1.value[0]} (inferred as number)`);
}
console.log();

// ============================================================================
// 2. Length Constraints
// ============================================================================

console.log('2. Length Constraints:');

// Minimum length
const tagsValidator = v.array(v.string()).min(1).max(5);
const tags = ['typescript', 'validation', 'runtime'];
const result2 = validate(tagsValidator, tags);

console.log(`  Input: ${JSON.stringify(tags)}`);
console.log(`  Constraint: min 1, max 5 elements`);
console.log(`  Valid: ${result2.ok}\n`);

// Non-empty constraint
const requiredFieldsValidator = v.array(v.string()).nonempty();
const emptyArray: string[] = [];
const result3 = validate(requiredFieldsValidator, emptyArray);

console.log(`  Input: ${JSON.stringify(emptyArray)}`);
console.log(`  Constraint: nonempty`);
console.log(`  Valid: ${result3.ok}`);
if (!result3.ok) {
  console.log(`  Error: ${result3.error}`);
}
console.log();

// Exact length
const rgbValidator = v.array(v.number()).length(3);
const rgb = [255, 128, 0];
const result4 = validate(rgbValidator, rgb);

console.log(`  Input: ${JSON.stringify(rgb)}`);
console.log(`  Constraint: exactly 3 elements`);
console.log(`  Valid: ${result4.ok}\n`);

// ============================================================================
// 3. Arrays of Objects
// ============================================================================

console.log('3. Arrays of Objects:');

const userValidator = v.object({
  name: v.string(),
  age: v.number(),
  active: v.boolean(),
});

const usersValidator = v.array(userValidator);

const users = [
  { name: 'Alice', age: 30, active: true },
  { name: 'Bob', age: 25, active: false },
  { name: 'Charlie', age: 35, active: true },
];

const result5 = validate(usersValidator, users);

console.log(`  Input: ${JSON.stringify(users, null, 2)}`);
console.log(`  Valid: ${result5.ok}`);
if (result5.ok) {
  // Type-safe access with full type inference
  console.log(`  First user: ${result5.value[0].name}, age ${result5.value[0].age}`);
}
console.log();

// Invalid user (missing field)
const invalidUsers = [
  { name: 'Alice', age: 30, active: true },
  { name: 'Bob', age: 'twenty-five' }, // Invalid: age should be number
];

const result6 = validate(usersValidator, invalidUsers);
console.log(`  Invalid input: age is string instead of number`);
console.log(`  Valid: ${result6.ok}`);
if (!result6.ok) {
  console.log(`  Error: ${result6.error}`);
}
console.log();

// ============================================================================
// 4. Nested Arrays (2D Matrices)
// ============================================================================

console.log('4. Nested Arrays (2D Matrix):');

const matrixValidator = v.array(v.array(v.number()));
const matrix = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

const result7 = validate(matrixValidator, matrix);

console.log(`  Input: 3×3 matrix`);
console.log(`  Valid: ${result7.ok}`);
if (result7.ok) {
  console.log(`  Element [1][1]: ${result7.value[1][1]} (type: number)`);
}
console.log();

// Jagged array (variable row lengths)
const jaggedValidator = v.array(v.array(v.number()));
const jagged = [[1, 2], [3, 4, 5], [6]];
const result8 = validate(jaggedValidator, jagged);

console.log(`  Input: Jagged array ${JSON.stringify(jagged)}`);
console.log(`  Valid: ${result8.ok} (rows can have different lengths)\n`);

// ============================================================================
// 5. Nested Arrays with Constraints
// ============================================================================

console.log('5. Nested Arrays with Length Constraints:');

// Each row must have 2-4 elements
const constrainedMatrixValidator = v.array(
  v.array(v.number()).min(2).max(4)
);

const validMatrix = [[1, 2], [3, 4, 5], [6, 7, 8, 9]];
const result9 = validate(constrainedMatrixValidator, validMatrix);

console.log(`  Input: ${JSON.stringify(validMatrix)}`);
console.log(`  Constraint: each row must have 2-4 elements`);
console.log(`  Valid: ${result9.ok}\n`);

const invalidMatrix = [[1, 2], [3], [6, 7]]; // Second row violates min constraint
const result10 = validate(constrainedMatrixValidator, invalidMatrix);

console.log(`  Input: ${JSON.stringify(invalidMatrix)}`);
console.log(`  Constraint: each row must have 2-4 elements`);
console.log(`  Valid: ${result10.ok}`);
if (!result10.ok) {
  console.log(`  Error: ${result10.error}`);
}
console.log();

// ============================================================================
// 6. Arrays with Optional/Nullable Elements
// ============================================================================

console.log('6. Arrays with Optional/Nullable Elements:');

// Array that can contain null
const nullableArrayValidator = v.array(v.nullable(v.string()));
const mixedArray = ['Alice', null, 'Bob', null, 'Charlie'];
const result11 = validate(nullableArrayValidator, mixedArray);

console.log(`  Input: ${JSON.stringify(mixedArray)}`);
console.log(`  Valid: ${result11.ok}\n`);

// Optional array elements (undefined allowed)
const optionalArrayValidator = v.array(v.optional(v.number()));
const sparseArray = [1, undefined, 3, undefined, 5];
const result12 = validate(optionalArrayValidator, sparseArray);

console.log(`  Input: ${JSON.stringify(sparseArray)}`);
console.log(`  Valid: ${result12.ok}\n`);

// ============================================================================
// 7. Type Inference Example
// ============================================================================

console.log('7. Type Inference:');

const complexValidator = v.array(
  v.object({
    id: v.number(),
    tags: v.array(v.string()),
    metadata: v.nullable(
      v.object({
        created: v.string(),
        updated: v.string(),
      })
    ),
  })
);

const complexData = [
  {
    id: 1,
    tags: ['typescript', 'validation'],
    metadata: { created: '2024-01-01', updated: '2024-01-02' },
  },
  {
    id: 2,
    tags: ['runtime', 'types'],
    metadata: null,
  },
];

const result13 = validate(complexValidator, complexData);

console.log(`  Complex nested structure:`);
console.log(`  Valid: ${result13.ok}`);
if (result13.ok) {
  // TypeScript infers the full type automatically
  const firstItem = result13.value[0];
  console.log(`  First item tags: ${firstItem.tags.join(', ')}`);
  console.log(`  Metadata: ${firstItem.metadata?.created || 'null'}`);
}
console.log();

console.log('=== All Examples Complete ===');
