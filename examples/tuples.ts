#!/usr/bin/env -S npx tsx
/**
 * Tuple Validator Examples
 *
 * Demonstrates tuple validation with:
 * - Fixed-length arrays
 * - Per-index type validation
 * - Mixed types
 * - Nested tuples
 * - Type-safe access
 */

import { validate, v } from '../src/index.js';

console.log('=== Tuple Validator Examples ===\n');

// ============================================================================
// 1. Basic Tuples
// ============================================================================

console.log('1. Basic Tuples:');

// Coordinate tuple [x, y]
const coordValidator = v.tuple([v.number(), v.number()]);
const coord = [10, 20];
const result1 = validate(coordValidator, coord);

console.log(`  Coordinate [x, y]: ${JSON.stringify(coord)}`);
console.log(`  Valid: ${result1.ok}`);
if (result1.ok) {
  console.log(`  Type-safe access: x=${result1.value[0]}, y=${result1.value[1]}`);
}
console.log();

// Invalid coordinate (wrong type)
const invalidCoord = [10, 'twenty'];
const result2 = validate(coordValidator, invalidCoord);

console.log(`  Invalid coordinate: ${JSON.stringify(invalidCoord)}`);
console.log(`  Valid: ${result2.ok}`);
if (!result2.ok) {
  console.log(`  Error: ${result2.error}`);
}
console.log();

// ============================================================================
// 2. Mixed-Type Tuples
// ============================================================================

console.log('2. Mixed-Type Tuples:');

// Person tuple [name, age, active]
const personValidator = v.tuple([v.string(), v.number(), v.boolean()]);
const person = ['Alice', 30, true];
const result3 = validate(personValidator, person);

console.log(`  Person [name, age, active]: ${JSON.stringify(person)}`);
console.log(`  Valid: ${result3.ok}`);
if (result3.ok) {
  const [name, age, active] = result3.value;
  console.log(`  Destructured: name=${name}, age=${age}, active=${active}`);
}
console.log();

// HTTP response tuple [status, body, headers]
const responseValidator = v.tuple([
  v.number(),
  v.string(),
  v.object({ 'content-type': v.string() }),
]);

const response = [
  200,
  '{"message":"success"}',
  { 'content-type': 'application/json' },
];

const result4 = validate(responseValidator, response);

console.log(`  HTTP Response: [status, body, headers]`);
console.log(`  Valid: ${result4.ok}`);
if (result4.ok) {
  console.log(`  Status: ${result4.value[0]}`);
  console.log(`  Content-Type: ${result4.value[2]['content-type']}`);
}
console.log();

// ============================================================================
// 3. Tuples with Optional Fields
// ============================================================================

console.log('3. Tuples with Optional Fields:');

// Config entry [key, value?, metadata?]
const configEntryValidator = v.tuple([
  v.string(),
  v.optional(v.string()),
  v.optional(v.object({ timestamp: v.string() })),
]);

const entry1 = ['database_url', 'postgres://localhost', { timestamp: '2024-01-01' }];
const result5 = validate(configEntryValidator, entry1);

console.log(`  Full entry: ${JSON.stringify(entry1)}`);
console.log(`  Valid: ${result5.ok}\n`);

const entry2 = ['feature_flag', undefined, undefined];
const result6 = validate(configEntryValidator, entry2);

console.log(`  Minimal entry: ${JSON.stringify(entry2)}`);
console.log(`  Valid: ${result6.ok}\n`);

// ============================================================================
// 4. Nested Tuples
// ============================================================================

console.log('4. Nested Tuples:');

// Line segment: [[x1, y1], [x2, y2]]
const lineSegmentValidator = v.tuple([
  v.tuple([v.number(), v.number()]),
  v.tuple([v.number(), v.number()]),
]);

const lineSegment = [[0, 0], [10, 10]];
const result7 = validate(lineSegmentValidator, lineSegment);

console.log(`  Line segment: ${JSON.stringify(lineSegment)}`);
console.log(`  Valid: ${result7.ok}`);
if (result7.ok) {
  const [[x1, y1], [x2, y2]] = result7.value;
  console.log(`  From (${x1}, ${y1}) to (${x2}, ${y2})`);
}
console.log();

// ============================================================================
// 5. Length Validation
// ============================================================================

console.log('5. Length Validation:');

// Tuple enforces exact length
const rgbValidator = v.tuple([v.number(), v.number(), v.number()]);

const validRgb = [255, 128, 0];
const result8 = validate(rgbValidator, validRgb);

console.log(`  RGB (3 elements): ${JSON.stringify(validRgb)}`);
console.log(`  Valid: ${result8.ok}\n`);

const invalidRgb = [255, 128]; // Too short
const result9 = validate(rgbValidator, invalidRgb);

console.log(`  RGB (2 elements): ${JSON.stringify(invalidRgb)}`);
console.log(`  Valid: ${result9.ok}`);
if (!result9.ok) {
  console.log(`  Error: ${result9.error}`);
}
console.log();

const tooLongRgb = [255, 128, 0, 255]; // Too long
const result10 = validate(rgbValidator, tooLongRgb);

console.log(`  RGB (4 elements): ${JSON.stringify(tooLongRgb)}`);
console.log(`  Valid: ${result10.ok}`);
if (!result10.ok) {
  console.log(`  Error: ${result10.error}`);
}
console.log();

// ============================================================================
// 6. Arrays of Tuples
// ============================================================================

console.log('6. Arrays of Tuples:');

// Array of coordinate tuples
const pointsValidator = v.array(v.tuple([v.number(), v.number()]));

const points = [
  [0, 0],
  [5, 10],
  [10, 20],
  [15, 30],
];

const result11 = validate(pointsValidator, points);

console.log(`  Points: ${JSON.stringify(points)}`);
console.log(`  Valid: ${result11.ok}`);
if (result11.ok) {
  console.log(`  ${result11.value.length} points validated`);
  result11.value.forEach(([x, y], i) => {
    console.log(`    Point ${i}: (${x}, ${y})`);
  });
}
console.log();

// ============================================================================
// 7. Empty Tuple
// ============================================================================

console.log('7. Empty Tuple:');

const emptyTupleValidator = v.tuple([]);
const emptyTuple: [] = [];
const result12 = validate(emptyTupleValidator, emptyTuple);

console.log(`  Empty tuple: ${JSON.stringify(emptyTuple)}`);
console.log(`  Valid: ${result12.ok}\n`);

// ============================================================================
// 8. Complex Nested Example
// ============================================================================

console.log('8. Complex Nested Structure:');

// API response: [success, data, metadata]
// data is array of user tuples [id, name, email]
const apiResponseValidator = v.tuple([
  v.boolean(), // success
  v.array(v.tuple([v.number(), v.string(), v.string()])), // users
  v.object({ timestamp: v.string(), version: v.string() }), // metadata
]);

const apiResponse = [
  true,
  [
    [1, 'Alice', 'alice@example.com'],
    [2, 'Bob', 'bob@example.com'],
    [3, 'Charlie', 'charlie@example.com'],
  ],
  { timestamp: '2024-01-01T00:00:00Z', version: '1.0' },
];

const result13 = validate(apiResponseValidator, apiResponse);

console.log(`  API Response with array of user tuples:`);
console.log(`  Valid: ${result13.ok}`);
if (result13.ok) {
  const [success, users, metadata] = result13.value;
  console.log(`  Success: ${success}`);
  console.log(`  Users: ${users.length} found`);
  users.forEach(([id, name, email]) => {
    console.log(`    User ${id}: ${name} (${email})`);
  });
  console.log(`  Version: ${metadata.version}`);
}
console.log();

// ============================================================================
// 9. Type Inference Example
// ============================================================================

console.log('9. Type Inference:');

// Database row: [id, created_at, updated_at, data]
const dbRowValidator = v.tuple([
  v.number(),
  v.string(),
  v.nullable(v.string()),
  v.object({
    title: v.string(),
    tags: v.array(v.string()),
  }),
]);

const dbRow = [
  42,
  '2024-01-01T00:00:00Z',
  null,
  { title: 'Example', tags: ['typescript', 'validation'] },
];

const result14 = validate(dbRowValidator, dbRow);

console.log(`  Database row: [id, created, updated, data]`);
console.log(`  Valid: ${result14.ok}`);
if (result14.ok) {
  // TypeScript infers the exact tuple type
  const [id, createdAt, updatedAt, data] = result14.value;
  console.log(`  ID: ${id} (type: number)`);
  console.log(`  Created: ${createdAt}`);
  console.log(`  Updated: ${updatedAt ?? 'never'}`);
  console.log(`  Title: ${data.title}`);
  console.log(`  Tags: ${data.tags.join(', ')}`);
}
console.log();

console.log('=== All Examples Complete ===');
