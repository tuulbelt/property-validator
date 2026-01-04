/**
 * v0.8.0 JIT Research - CSP Compatibility Test
 *
 * Content Security Policy (CSP) can block `new Function()` and `eval()`.
 * This tests whether our JIT approach can detect and fallback gracefully.
 */

// ============================================================================
// CSP Detection
// ============================================================================

/**
 * Test if new Function() is available.
 * Returns true if JIT compilation is possible.
 */
function isJITAvailable(): boolean {
  try {
    // Attempt to create a simple function
    const testFn = new Function('return true');
    return testFn() === true;
  } catch {
    // CSP or other restriction blocks new Function()
    return false;
  }
}

console.log('=== v0.8.0 JIT Research: CSP Compatibility ===\n');

const jitAvailable = isJITAvailable();
console.log(`JIT (new Function) available: ${jitAvailable ? 'YES ✓' : 'NO ✗'}`);

// ============================================================================
// Fallback Strategy
// ============================================================================

interface ValidatorFactory<T> {
  (data: unknown): boolean;
}

/**
 * Create a validator with automatic JIT/closure fallback.
 *
 * This is the pattern we should use in v0.8.0:
 * - Attempt JIT compilation first (faster)
 * - Fallback to closure-based if CSP blocks it
 */
function createObjectValidator(
  properties: Record<string, 'string' | 'number' | 'boolean'>
): ValidatorFactory<Record<string, unknown>> {
  // Try JIT first
  if (isJITAvailable()) {
    try {
      // Generate JIT code
      const checks: string[] = [
        "typeof data === 'object' && data !== null"
      ];

      for (const [key, type] of Object.entries(properties)) {
        const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
          ? `data.${key}`
          : `data['${key.replace(/'/g, "\\'")}']`;

        switch (type) {
          case 'string':
            checks.push(`typeof ${safeKey} === 'string'`);
            break;
          case 'number':
            checks.push(`typeof ${safeKey} === 'number' && !Number.isNaN(${safeKey})`);
            break;
          case 'boolean':
            checks.push(`typeof ${safeKey} === 'boolean'`);
            break;
        }
      }

      const code = `return ${checks.join(' && ')}`;
      console.log('\n[JIT] Generated code:');
      console.log(`  function(data) { ${code} }`);

      return new Function('data', code) as ValidatorFactory<Record<string, unknown>>;
    } catch (e) {
      console.log(`[JIT] Compilation failed, falling back to closure: ${e}`);
    }
  }

  // Fallback to closure-based
  console.log('\n[Closure] Using closure-based validator');
  return (data: unknown): boolean => {
    if (typeof data !== 'object' || data === null) return false;
    const obj = data as Record<string, unknown>;

    for (const [key, type] of Object.entries(properties)) {
      const value = obj[key];
      switch (type) {
        case 'string':
          if (typeof value !== 'string') return false;
          break;
        case 'number':
          if (typeof value !== 'number' || Number.isNaN(value)) return false;
          break;
        case 'boolean':
          if (typeof value !== 'boolean') return false;
          break;
      }
    }
    return true;
  };
}

// ============================================================================
// Test
// ============================================================================

const validator = createObjectValidator({
  name: 'string',
  age: 'number',
  active: 'boolean'
});

const testCases = [
  { data: { name: 'Alice', age: 30, active: true }, expected: true },
  { data: { name: 'Bob', age: 25, active: false }, expected: true },
  { data: { name: 123, age: 30, active: true }, expected: false },
  { data: { name: 'Alice', age: 'thirty', active: true }, expected: false },
  { data: null, expected: false },
  { data: 'not an object', expected: false },
];

console.log('\n--- Test Results ---');
for (const { data, expected } of testCases) {
  const result = validator(data);
  const pass = result === expected;
  console.log(`${pass ? '✓' : '✗'} validate(${JSON.stringify(data)}) = ${result} (expected: ${expected})`);
}

// ============================================================================
// CSP Simulation (for documentation)
// ============================================================================

console.log('\n=== CSP Notes ===');
console.log(`
In browsers with strict CSP, the following headers block new Function():

  Content-Security-Policy: script-src 'self'
  Content-Security-Policy: default-src 'self'; script-src 'self'

To allow new Function(), use:

  Content-Security-Policy: script-src 'self' 'unsafe-eval'

Our v0.8.0 strategy:
  1. Attempt JIT compilation at validator creation time
  2. If CSP blocks it, catch the error and use closure-based
  3. Both paths produce identical results
  4. Performance difference: ~19x for objects, negligible for primitives

This means:
  - In Node.js: Always use JIT (no CSP restrictions)
  - In browsers: Automatically adapt to environment
  - Zero user configuration required
`);
