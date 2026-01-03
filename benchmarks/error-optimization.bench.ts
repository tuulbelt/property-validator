#!/usr/bin/env -S npx tsx
/**
 * Error Optimization Benchmarks
 *
 * Tests different ValidationError implementations to find the sweet spot
 * between performance and developer experience.
 */

import { Bench } from 'tinybench';

// Test data
const testData = { name: 123 }; // Invalid: name should be string

/**
 * BASELINE: Current ValidationError (extends Error, captures stack)
 */
class CurrentValidationError extends Error {
  public readonly path: string[];
  public readonly value: unknown;
  public readonly expected: string;
  public readonly code: string;

  constructor(options: {
    message: string;
    path?: string[];
    value?: unknown;
    expected?: string;
    code?: string;
  }) {
    super(options.message); // ← Captures stack trace (expensive!)
    this.name = 'ValidationError';
    this.path = options.path || [];
    this.value = options.value;
    this.expected = options.expected || '';
    this.code = options.code || 'VALIDATION_ERROR';
  }
}

/**
 * OPTION 1: Plain object (no Error inheritance, lazy stack)
 */
class LazyStackError {
  public readonly message: string;
  public readonly path: string[];
  public readonly value: unknown;
  public readonly expected: string;
  public readonly code: string;
  private _stack?: string;

  constructor(options: {
    message: string;
    path?: string[];
    value?: unknown;
    expected?: string;
    code?: string;
  }) {
    this.message = options.message;
    this.path = options.path || [];
    this.value = options.value;
    this.expected = options.expected || '';
    this.code = options.code || 'VALIDATION_ERROR';
  }

  // Only create Error (and capture stack) when accessed
  get stack(): string {
    if (!this._stack) {
      const err = new Error(this.message);
      this._stack = err.stack || '';
    }
    return this._stack;
  }
}

/**
 * OPTION 2: Message-only (minimal allocation)
 */
class MessageOnlyError {
  public readonly message: string;
  private _stack?: string;

  constructor(message: string) {
    this.message = message;
  }

  get stack(): string {
    if (!this._stack) {
      const err = new Error(this.message);
      this._stack = err.stack || '';
    }
    return this._stack;
  }
}

/**
 * OPTION 3: Combine path + value into message (no separate storage)
 */
class BakedMessageError {
  public readonly message: string;
  private _stack?: string;

  constructor(options: {
    message: string;
    path?: string[];
    value?: unknown;
    expected?: string;
  }) {
    // Bake path and value into message string
    const pathStr = options.path && options.path.length > 0
      ? ` at ${options.path.join('.')}`
      : '';
    const valueStr = options.value !== undefined
      ? ` (received: ${JSON.stringify(options.value)})`
      : '';

    this.message = `${options.message}${pathStr}${valueStr}`;
  }

  get stack(): string {
    if (!this._stack) {
      const err = new Error(this.message);
      this._stack = err.stack || '';
    }
    return this._stack;
  }
}

/**
 * OPTION 4: Frozen object (no class, pure data)
 */
function createFrozenError(options: {
  message: string;
  path?: string[];
  value?: unknown;
  expected?: string;
}): { readonly message: string; readonly path: string[]; readonly value: unknown } {
  return Object.freeze({
    message: options.message,
    path: options.path || [],
    value: options.value,
  });
}

/**
 * OPTION 5: Plain object literal (no freezing, no class)
 */
function createPlainError(options: {
  message: string;
  path?: string[];
  value?: unknown;
}): { message: string; path: string[]; value: unknown } {
  return {
    message: options.message,
    path: options.path || [],
    value: options.value,
  };
}

/**
 * OPTION 6: Just return the string (ultimate minimal)
 */
function createStringError(message: string): string {
  return message;
}

// Benchmark suite
const bench = new Bench({ time: 100 });

console.log('🔬 Error Creation Benchmarks\n');

bench
  .add('BASELINE: Current (extends Error)', () => {
    new CurrentValidationError({
      message: 'Expected string',
      path: ['name'],
      value: testData.name,
      expected: 'string',
    });
  })
  .add('OPTION 1: Lazy stack (no Error extends)', () => {
    new LazyStackError({
      message: 'Expected string',
      path: ['name'],
      value: testData.name,
      expected: 'string',
    });
  })
  .add('OPTION 2: Message only', () => {
    new MessageOnlyError('Expected string');
  })
  .add('OPTION 3: Baked message (path+value in string)', () => {
    new BakedMessageError({
      message: 'Expected string',
      path: ['name'],
      value: testData.name,
      expected: 'string',
    });
  })
  .add('OPTION 4: Frozen object', () => {
    createFrozenError({
      message: 'Expected string',
      path: ['name'],
      value: testData.name,
    });
  })
  .add('OPTION 5: Plain object literal', () => {
    createPlainError({
      message: 'Expected string',
      path: ['name'],
      value: testData.name,
    });
  })
  .add('OPTION 6: Just string (ultimate minimal)', () => {
    createStringError('Expected string');
  });

// Run benchmarks
await bench.warmup();
await bench.run();

// Display results
console.table(
  bench.tasks.map((task) => ({
    'Approach': task.name,
    'ops/sec': task.result?.hz.toLocaleString('en-US', { maximumFractionDigits: 0 }) || 'N/A',
    'Avg (ns)': task.result?.mean ? (task.result.mean * 1_000_000).toFixed(2) : 'N/A',
    'Margin': task.result?.rme ? `±${task.result.rme.toFixed(2)}%` : 'N/A',
  }))
);

console.log('\n📊 Analysis:\n');

// Calculate speedups relative to baseline
const baseline = bench.tasks[0].result?.hz || 1;
const results = bench.tasks.map((task, idx) => {
  const hz = task.result?.hz || 0;
  const speedup = hz / baseline;
  return { name: task.name, hz, speedup };
});

results.forEach((result, idx) => {
  if (idx === 0) {
    console.log(`${result.name}: BASELINE`);
  } else {
    console.log(`${result.name}: ${result.speedup.toFixed(2)}x ${result.speedup > 1 ? 'faster' : 'slower'}`);
  }
});

console.log('\n💡 Recommendations:\n');
console.log('1. If stack traces are needed: Use OPTION 1 (Lazy stack)');
console.log('2. If rich error details needed: Use OPTION 3 (Baked message)');
console.log('3. If minimal overhead needed: Use OPTION 2 (Message only)');
console.log('4. If ultimate speed needed: Use OPTION 6 (Just string)');
