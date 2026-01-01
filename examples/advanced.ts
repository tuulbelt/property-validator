/**
 * Advanced usage patterns for tool-name
 *
 * This example demonstrates:
 * - Performance optimization patterns
 * - Resource limit handling
 * - Batch processing with pre-allocation
 * - Streaming patterns for large data
 * - Error handling strategies
 *
 * Run this example:
 *   npx tsx examples/advanced.ts
 */

import { process, type Config, type Result } from '../src/index.js';

/**
 * Example: Pre-allocate arrays when size is known
 *
 * Performance pattern:
 * - new Array(size) pre-allocates memory
 * - Avoids dynamic resizing and copying
 * - Improves performance for known-size collections
 */
function batchProcessOptimized(inputs: string[], config: Config): Result[] {
  // Pre-allocate: we know we'll have exactly inputs.length results
  const results = new Array<Result>(inputs.length);

  for (let i = 0; i < inputs.length; i++) {
    results[i] = process(inputs[i], config);
  }

  return results;
}

/**
 * Example: Resource limit pattern
 *
 * Pattern used in tools that handle large inputs:
 * - Define constants for resource limits
 * - Check limits before processing
 * - Provide clear error messages
 */
const MAX_INPUT_LENGTH = 1_000_000; // 1 million characters

function processWithLimit(input: string, config: Config): Result {
  // Check resource limit before processing
  if (input.length > MAX_INPUT_LENGTH) {
    return {
      success: false,
      data: '',
      error: `Input length ${input.length} exceeds maximum ${MAX_INPUT_LENGTH} characters`,
    };
  }

  return process(input, config);
}

/**
 * Example: Streaming pattern for large inputs
 *
 * Use when input is too large to process all at once
 * Generator functions enable lazy evaluation
 */
function* processChunks(
  input: string,
  chunkSize: number,
  config: Config,
): Generator<Result, void, undefined> {
  for (let i = 0; i < input.length; i += chunkSize) {
    const chunk = input.slice(i, i + chunkSize);
    yield process(chunk, config);
  }
}

/**
 * Example: Async batch processing with concurrency limit
 *
 * Useful for I/O-bound operations
 */
async function processBatchAsync(
  inputs: string[],
  config: Config,
  concurrency: number = 5,
): Promise<Result[]> {
  const results = new Array<Result>(inputs.length);
  const executing: Promise<void>[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const promise = Promise.resolve().then(() => {
      results[i] = process(inputs[i], config);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => p === promise),
        1,
      );
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Example: Pre-sizing Sets and Maps
 *
 * Performance pattern for collections with known size
 */
function deduplicateWithPresize(inputs: string[]): string[] {
  // Note: JavaScript Set doesn't have capacity constructor
  // But we can pre-allocate the result array
  const unique = new Set(inputs);
  return Array.from(unique);
}

// Main execution
async function main() {
  console.log('Tool Name - Advanced Usage Patterns\n');

  const config: Config = { verbose: false };

  // Example 1: Batch processing with pre-allocation
  console.log('Example 1: Batch processing (optimized)');
  const inputs = ['hello', 'world', 'typescript', 'performance'];
  const results = batchProcessOptimized(inputs, config);
  console.log(`  Processed ${results.length} inputs:`);
  results.forEach((r, i) => {
    if (r.success) {
      console.log(`    [${i}] ${r.data}`);
    }
  });
  console.log();

  // Example 2: Resource limit handling
  console.log('Example 2: Resource limit');
  const largeInput = 'x'.repeat(2_000_000); // Exceeds MAX_INPUT_LENGTH
  const limitResult = processWithLimit(largeInput, config);
  if (!limitResult.success) {
    console.log(`  Error (expected): ${limitResult.error}`);
  }
  console.log();

  // Example 3: Streaming with generators
  console.log('Example 3: Streaming with generators');
  const largeText = 'hello world '.repeat(100); // 1200 chars
  let chunkCount = 0;
  for (const result of processChunks(largeText, 100, config)) {
    if (result.success) chunkCount++;
  }
  console.log(`  Processed ${chunkCount} chunks`);
  console.log();

  // Example 4: Async batch with concurrency limit
  console.log('Example 4: Async batch processing (concurrency: 3)');
  const asyncInputs = ['one', 'two', 'three', 'four', 'five'];
  const asyncResults = await processBatchAsync(asyncInputs, config, 3);
  console.log(`  Processed ${asyncResults.filter((r) => r.success).length} successfully`);
  console.log();

  // Example 5: Deduplication
  console.log('Example 5: Deduplication');
  const duplicates = ['hello', 'world', 'hello', 'typescript', 'world'];
  const unique = deduplicateWithPresize(duplicates);
  console.log(`  Input: ${duplicates.length} items, Unique: ${unique.length} items`);
  console.log();

  console.log('Performance Tips:');
  console.log('  - Pre-allocate arrays with new Array(size) when size is known');
  console.log('  - Check resource limits before processing large inputs');
  console.log('  - Use generators for lazy/streaming evaluation');
  console.log('  - Use async concurrency limits for I/O-bound operations');
  console.log('  - Profile with: node --prof your-script.js && node --prof-process isolate-*.log');
  console.log();

  console.log('Done!');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
