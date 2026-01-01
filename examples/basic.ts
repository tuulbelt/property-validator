/**
 * Basic usage example for Tool Name
 *
 * Run this example:
 *   npx tsx examples/basic.ts
 */

import { process } from '../src/index.js';

// Example 1: Basic usage
console.log('Example 1: Basic usage');
const result1 = process('hello world');
console.log('Input: "hello world"');
console.log('Output:', result1);
console.log();

// Example 2: With verbose option
console.log('Example 2: With verbose option');
const result2 = process('testing verbose mode', { verbose: true });
console.log('Input: "testing verbose mode"');
console.log('Output:', result2);
console.log();

// Example 3: Empty input
console.log('Example 3: Empty input');
const result3 = process('');
console.log('Input: ""');
console.log('Output:', result3);
console.log();

// Example 4: Special characters
console.log('Example 4: Special characters');
const result4 = process('Hello! @#$ 123');
console.log('Input: "Hello! @#$ 123"');
console.log('Output:', result4);
