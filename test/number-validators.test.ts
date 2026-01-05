/**
 * Number validator built-in constraints tests
 * v0.8.5 Phase 7: Built-in validators
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { v, validate } from '../src/index.ts';

describe('number validators: int()', () => {
  const intValidator = v.number().int();

  test('accepts integer values', () => {
    const validInts = [0, 1, -1, 42, -100, 1000000];

    for (const num of validInts) {
      const result = validate(intValidator, num);
      assert.strictEqual(result.ok, true, `Expected ${num} to be valid integer`);
    }
  });

  test('rejects non-integer values', () => {
    const invalidValues = [1.5, -0.1, 3.14159, 0.001];

    for (const num of invalidValues) {
      const result = validate(intValidator, num);
      assert.strictEqual(result.ok, false, `Expected ${num} to be invalid integer`);
    }
  });

  test('provides clear error message', () => {
    const result = validate(intValidator, 1.5);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /integer/);
    }
  });
});

describe('number validators: positive()', () => {
  const positiveValidator = v.number().positive();

  test('accepts positive numbers', () => {
    const validNums = [1, 0.001, 100, 3.14];

    for (const num of validNums) {
      const result = validate(positiveValidator, num);
      assert.strictEqual(result.ok, true, `Expected ${num} to be positive`);
    }
  });

  test('rejects zero and negative numbers', () => {
    const invalidNums = [0, -1, -0.001, -100];

    for (const num of invalidNums) {
      const result = validate(positiveValidator, num);
      assert.strictEqual(result.ok, false, `Expected ${num} to be rejected as not positive`);
    }
  });

  test('provides clear error message', () => {
    const result = validate(positiveValidator, -5);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /positive/);
    }
  });
});

describe('number validators: negative()', () => {
  const negativeValidator = v.number().negative();

  test('accepts negative numbers', () => {
    const validNums = [-1, -0.001, -100, -3.14];

    for (const num of validNums) {
      const result = validate(negativeValidator, num);
      assert.strictEqual(result.ok, true, `Expected ${num} to be negative`);
    }
  });

  test('rejects zero and positive numbers', () => {
    const invalidNums = [0, 1, 0.001, 100];

    for (const num of invalidNums) {
      const result = validate(negativeValidator, num);
      assert.strictEqual(result.ok, false, `Expected ${num} to be rejected as not negative`);
    }
  });

  test('provides clear error message', () => {
    const result = validate(negativeValidator, 5);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /negative/);
    }
  });
});

describe('number validators: nonnegative()', () => {
  const nonnegValidator = v.number().nonnegative();

  test('accepts zero and positive numbers', () => {
    const validNums = [0, 1, 0.001, 100];

    for (const num of validNums) {
      const result = validate(nonnegValidator, num);
      assert.strictEqual(result.ok, true, `Expected ${num} to be nonnegative`);
    }
  });

  test('rejects negative numbers', () => {
    const invalidNums = [-1, -0.001, -100];

    for (const num of invalidNums) {
      const result = validate(nonnegValidator, num);
      assert.strictEqual(result.ok, false, `Expected ${num} to be rejected`);
    }
  });
});

describe('number validators: nonpositive()', () => {
  const nonposValidator = v.number().nonpositive();

  test('accepts zero and negative numbers', () => {
    const validNums = [0, -1, -0.001, -100];

    for (const num of validNums) {
      const result = validate(nonposValidator, num);
      assert.strictEqual(result.ok, true, `Expected ${num} to be nonpositive`);
    }
  });

  test('rejects positive numbers', () => {
    const invalidNums = [1, 0.001, 100];

    for (const num of invalidNums) {
      const result = validate(nonposValidator, num);
      assert.strictEqual(result.ok, false, `Expected ${num} to be rejected`);
    }
  });
});

describe('number validators: min() and max()', () => {
  test('min() validates minimum value', () => {
    const validator = v.number().min(5);
    assert.strictEqual(validate(validator, 5).ok, true); // Inclusive
    assert.strictEqual(validate(validator, 10).ok, true);
    assert.strictEqual(validate(validator, 4.9).ok, false);
  });

  test('max() validates maximum value', () => {
    const validator = v.number().max(10);
    assert.strictEqual(validate(validator, 10).ok, true); // Inclusive
    assert.strictEqual(validate(validator, 5).ok, true);
    assert.strictEqual(validate(validator, 10.1).ok, false);
  });

  test('min() and max() can be chained', () => {
    const validator = v.number().min(0).max(100);
    assert.strictEqual(validate(validator, -1).ok, false);
    assert.strictEqual(validate(validator, 0).ok, true);
    assert.strictEqual(validate(validator, 50).ok, true);
    assert.strictEqual(validate(validator, 100).ok, true);
    assert.strictEqual(validate(validator, 101).ok, false);
  });

  test('provides clear error messages', () => {
    const minValidator = v.number().min(5);
    const result = validate(minValidator, 3);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /at least 5/);
    }

    const maxValidator = v.number().max(10);
    const result2 = validate(maxValidator, 15);
    assert.strictEqual(result2.ok, false);
    if (!result2.ok) {
      assert.match(result2.error, /at most 10/);
    }
  });
});

describe('number validators: range()', () => {
  test('validates value within range (inclusive)', () => {
    const validator = v.number().range(0, 100);
    assert.strictEqual(validate(validator, 0).ok, true);
    assert.strictEqual(validate(validator, 50).ok, true);
    assert.strictEqual(validate(validator, 100).ok, true);
    assert.strictEqual(validate(validator, -1).ok, false);
    assert.strictEqual(validate(validator, 101).ok, false);
  });

  test('provides clear error message', () => {
    const validator = v.number().range(10, 20);
    const result = validate(validator, 25);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /between 10 and 20/);
    }
  });
});

describe('number validators: finite()', () => {
  const finiteValidator = v.number().finite();

  test('accepts finite numbers', () => {
    const validNums = [0, 1, -1, 3.14, Number.MAX_VALUE, Number.MIN_VALUE];

    for (const num of validNums) {
      const result = validate(finiteValidator, num);
      assert.strictEqual(result.ok, true, `Expected ${num} to be finite`);
    }
  });

  test('rejects Infinity and -Infinity', () => {
    assert.strictEqual(validate(finiteValidator, Infinity).ok, false);
    assert.strictEqual(validate(finiteValidator, -Infinity).ok, false);
  });

  test('rejects NaN', () => {
    assert.strictEqual(validate(finiteValidator, NaN).ok, false);
  });

  test('provides clear error message', () => {
    const result = validate(finiteValidator, Infinity);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /finite/);
    }
  });
});

describe('number validators: safeInt()', () => {
  const safeIntValidator = v.number().safeInt();

  test('accepts safe integers', () => {
    const validNums = [0, 1, -1, 42, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];

    for (const num of validNums) {
      const result = validate(safeIntValidator, num);
      assert.strictEqual(result.ok, true, `Expected ${num} to be safe integer`);
    }
  });

  test('rejects non-integers', () => {
    assert.strictEqual(validate(safeIntValidator, 1.5).ok, false);
    assert.strictEqual(validate(safeIntValidator, 3.14).ok, false);
  });

  test('rejects unsafe integers', () => {
    assert.strictEqual(validate(safeIntValidator, Number.MAX_SAFE_INTEGER + 1).ok, false);
    assert.strictEqual(validate(safeIntValidator, Number.MIN_SAFE_INTEGER - 1).ok, false);
  });

  test('provides clear error message', () => {
    const result = validate(safeIntValidator, 1.5);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /safe integer/);
    }
  });
});

describe('number validators: chaining multiple constraints', () => {
  test('positive integer', () => {
    const validator = v.number().int().positive();
    assert.strictEqual(validate(validator, 1).ok, true);
    assert.strictEqual(validate(validator, 0).ok, false); // Not positive
    assert.strictEqual(validate(validator, -1).ok, false); // Not positive
    assert.strictEqual(validate(validator, 1.5).ok, false); // Not integer
  });

  test('percentage value', () => {
    const validator = v.number().min(0).max(100).finite();
    assert.strictEqual(validate(validator, 0).ok, true);
    assert.strictEqual(validate(validator, 50).ok, true);
    assert.strictEqual(validate(validator, 100).ok, true);
    assert.strictEqual(validate(validator, -1).ok, false);
    assert.strictEqual(validate(validator, 101).ok, false);
  });

  test('age validator (safe positive integer)', () => {
    const validator = v.number().int().positive().max(150);
    assert.strictEqual(validate(validator, 25).ok, true);
    assert.strictEqual(validate(validator, 1).ok, true);
    assert.strictEqual(validate(validator, 0).ok, false);
    assert.strictEqual(validate(validator, 200).ok, false);
  });

  test('latitude/longitude validator', () => {
    const latValidator = v.number().range(-90, 90);
    const lngValidator = v.number().range(-180, 180);

    assert.strictEqual(validate(latValidator, 0).ok, true);
    assert.strictEqual(validate(latValidator, 45.5).ok, true);
    assert.strictEqual(validate(latValidator, -91).ok, false);

    assert.strictEqual(validate(lngValidator, 0).ok, true);
    assert.strictEqual(validate(lngValidator, -180).ok, true);
    assert.strictEqual(validate(lngValidator, 181).ok, false);
  });
});

describe('number validators: edge cases', () => {
  test('negative zero (-0) is treated as zero', () => {
    const positiveValidator = v.number().positive();
    const negativeValidator = v.number().negative();
    const nonnegValidator = v.number().nonnegative();
    const nonposValidator = v.number().nonpositive();

    // -0 === 0 in JavaScript, so -0 is neither positive nor negative
    assert.strictEqual(validate(positiveValidator, -0).ok, false);
    assert.strictEqual(validate(negativeValidator, -0).ok, false);
    assert.strictEqual(validate(nonnegValidator, -0).ok, true);  // >= 0
    assert.strictEqual(validate(nonposValidator, -0).ok, true);  // <= 0
  });

  test('scientific notation is valid', () => {
    const validator = v.number().positive();
    assert.strictEqual(validate(validator, 1e10).ok, true);
    assert.strictEqual(validate(validator, 1e-10).ok, true);
    assert.strictEqual(validate(validator, 1.5e3).ok, true);
  });

  test('very large numbers', () => {
    const validator = v.number().finite();
    assert.strictEqual(validate(validator, Number.MAX_VALUE).ok, true);
    assert.strictEqual(validate(validator, -Number.MAX_VALUE).ok, true);
  });

  test('very small numbers', () => {
    const validator = v.number().positive();
    assert.strictEqual(validate(validator, Number.MIN_VALUE).ok, true); // Smallest positive
    assert.strictEqual(validate(validator, Number.EPSILON).ok, true);
  });

  test('int() handles edge case integers', () => {
    const validator = v.number().int();
    assert.strictEqual(validate(validator, 0).ok, true);
    assert.strictEqual(validate(validator, -0).ok, true);
    assert.strictEqual(validate(validator, 1.0).ok, true); // 1.0 is integer
    assert.strictEqual(validate(validator, 2.00000000001).ok, false);
  });

  test('NaN is rejected by all number validators', () => {
    const validators = [
      v.number(),
      v.number().int(),
      v.number().positive(),
      v.number().finite(),
    ];

    for (const validator of validators) {
      const result = validate(validator, NaN);
      assert.strictEqual(result.ok, false, 'NaN should be rejected');
    }
  });

  test('non-number types are rejected', () => {
    const validator = v.number().positive();
    assert.strictEqual(validate(validator, '123').ok, false);
    assert.strictEqual(validate(validator, null).ok, false);
    assert.strictEqual(validate(validator, undefined).ok, false);
    assert.strictEqual(validate(validator, {}).ok, false);
    assert.strictEqual(validate(validator, []).ok, false);
  });

  test('range with equal min and max', () => {
    const validator = v.number().range(5, 5);
    assert.strictEqual(validate(validator, 5).ok, true);
    assert.strictEqual(validate(validator, 4.9999).ok, false);
    assert.strictEqual(validate(validator, 5.0001).ok, false);
  });

  test('min/max with decimal bounds', () => {
    const validator = v.number().min(0.5).max(1.5);
    assert.strictEqual(validate(validator, 0.5).ok, true);
    assert.strictEqual(validate(validator, 1.0).ok, true);
    assert.strictEqual(validate(validator, 1.5).ok, true);
    assert.strictEqual(validate(validator, 0.49).ok, false);
    assert.strictEqual(validate(validator, 1.51).ok, false);
  });
});
