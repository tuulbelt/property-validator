/**
 * Number validator built-in constraints tests
 * v0.8.5 Phase 7: Built-in validators
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { v } from '../src/index.js';
import { validate } from '../src/index.ts';

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

// ============================================================================
// New validator: multipleOf
// ============================================================================

describe('number validators: multipleOf()', () => {
  test('validates multiples of integer', () => {
    const validator = v.number().multipleOf(5);
    assert.strictEqual(validate(validator, 0).ok, true);
    assert.strictEqual(validate(validator, 5).ok, true);
    assert.strictEqual(validate(validator, 10).ok, true);
    assert.strictEqual(validate(validator, 15).ok, true);
    assert.strictEqual(validate(validator, -5).ok, true);
    assert.strictEqual(validate(validator, 3).ok, false);
    assert.strictEqual(validate(validator, 7).ok, false);
  });

  test('validates multiples of decimal (currency)', () => {
    const validator = v.number().multipleOf(0.01);
    assert.strictEqual(validate(validator, 0).ok, true);
    assert.strictEqual(validate(validator, 0.01).ok, true);
    assert.strictEqual(validate(validator, 0.99).ok, true);
    assert.strictEqual(validate(validator, 1.50).ok, true);
    assert.strictEqual(validate(validator, 19.99).ok, true);
    // Due to floating point, 0.001 would be rejected
  });

  test('validates multiples of 0.5 (half steps)', () => {
    const validator = v.number().multipleOf(0.5);
    assert.strictEqual(validate(validator, 0).ok, true);
    assert.strictEqual(validate(validator, 0.5).ok, true);
    assert.strictEqual(validate(validator, 1.0).ok, true);
    assert.strictEqual(validate(validator, 1.5).ok, true);
    assert.strictEqual(validate(validator, 2.0).ok, true);
    assert.strictEqual(validate(validator, 0.3).ok, false);
    assert.strictEqual(validate(validator, 1.7).ok, false);
  });

  test('handles negative numbers', () => {
    const validator = v.number().multipleOf(3);
    assert.strictEqual(validate(validator, -3).ok, true);
    assert.strictEqual(validate(validator, -6).ok, true);
    assert.strictEqual(validate(validator, -9).ok, true);
    assert.strictEqual(validate(validator, -4).ok, false);
  });

  test('provides clear error message', () => {
    const validator = v.number().multipleOf(10);
    const result = validate(validator, 7);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /multiple of 10/);
    }
  });

  test('can be chained with other validators', () => {
    // Price validator: positive, max 2 decimal places, max 1000
    const priceValidator = v.number().positive().multipleOf(0.01).max(1000);
    assert.strictEqual(validate(priceValidator, 9.99).ok, true);
    assert.strictEqual(validate(priceValidator, 100).ok, true);
    assert.strictEqual(validate(priceValidator, 0).ok, false);     // Not positive
    assert.strictEqual(validate(priceValidator, 1001).ok, false);  // Too high
  });
});

// ============================================================================
// v0.9.5: Extended Number Validators
// ============================================================================

describe('number validators: port()', () => {
  test('accepts valid port numbers (0-65535)', () => {
    const validator = v.number().port();
    const validPorts = [0, 1, 80, 443, 3000, 8080, 65535];

    for (const port of validPorts) {
      const result = validate(validator, port);
      assert.strictEqual(result.ok, true, `Expected ${port} to be valid port`);
    }
  });

  test('rejects invalid port numbers', () => {
    const validator = v.number().port();
    const invalidPorts = [-1, 65536, 70000, 1.5, 3.14];

    for (const port of invalidPorts) {
      const result = validate(validator, port);
      assert.strictEqual(result.ok, false, `Expected ${port} to be invalid port`);
    }
  });

  test('port requires integer (rejects decimals)', () => {
    const validator = v.number().port();
    assert.strictEqual(validate(validator, 80.5).ok, false);
    assert.strictEqual(validate(validator, 443.99).ok, false);
  });

  test('provides clear error message', () => {
    const validator = v.number().port();
    const result = validate(validator, 70000);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /port/);
    }
  });
});

describe('number validators: latitude()', () => {
  test('accepts valid latitudes (-90 to 90)', () => {
    const validator = v.number().latitude();
    const validLats = [-90, -45.5, 0, 45.5, 90, 51.5074, -33.8688];

    for (const lat of validLats) {
      const result = validate(validator, lat);
      assert.strictEqual(result.ok, true, `Expected ${lat} to be valid latitude`);
    }
  });

  test('rejects invalid latitudes', () => {
    const validator = v.number().latitude();
    const invalidLats = [-91, 91, -180, 180, 100, -100];

    for (const lat of invalidLats) {
      const result = validate(validator, lat);
      assert.strictEqual(result.ok, false, `Expected ${lat} to be invalid latitude`);
    }
  });

  test('accepts decimal latitudes', () => {
    const validator = v.number().latitude();
    assert.strictEqual(validate(validator, 40.7128).ok, true);  // New York
    assert.strictEqual(validate(validator, -34.6037).ok, true); // Buenos Aires
  });

  test('provides clear error message', () => {
    const validator = v.number().latitude();
    const result = validate(validator, 95);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /latitude/);
    }
  });
});

describe('number validators: longitude()', () => {
  test('accepts valid longitudes (-180 to 180)', () => {
    const validator = v.number().longitude();
    const validLngs = [-180, -90, 0, 90, 180, -122.4194, 139.6917];

    for (const lng of validLngs) {
      const result = validate(validator, lng);
      assert.strictEqual(result.ok, true, `Expected ${lng} to be valid longitude`);
    }
  });

  test('rejects invalid longitudes', () => {
    const validator = v.number().longitude();
    const invalidLngs = [-181, 181, -200, 200, 360, -360];

    for (const lng of invalidLngs) {
      const result = validate(validator, lng);
      assert.strictEqual(result.ok, false, `Expected ${lng} to be invalid longitude`);
    }
  });

  test('accepts decimal longitudes', () => {
    const validator = v.number().longitude();
    assert.strictEqual(validate(validator, -74.006).ok, true);   // New York
    assert.strictEqual(validate(validator, 151.2093).ok, true);  // Sydney
  });

  test('provides clear error message', () => {
    const validator = v.number().longitude();
    const result = validate(validator, 200);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /longitude/);
    }
  });
});

describe('number validators: percentage()', () => {
  test('accepts valid percentages (0 to 100)', () => {
    const validator = v.number().percentage();
    const validPcts = [0, 25, 50, 75, 100, 33.33, 66.67];

    for (const pct of validPcts) {
      const result = validate(validator, pct);
      assert.strictEqual(result.ok, true, `Expected ${pct} to be valid percentage`);
    }
  });

  test('rejects invalid percentages', () => {
    const validator = v.number().percentage();
    const invalidPcts = [-1, -0.1, 100.1, 101, 200];

    for (const pct of invalidPcts) {
      const result = validate(validator, pct);
      assert.strictEqual(result.ok, false, `Expected ${pct} to be invalid percentage`);
    }
  });

  test('accepts decimal percentages', () => {
    const validator = v.number().percentage();
    assert.strictEqual(validate(validator, 0.5).ok, true);
    assert.strictEqual(validate(validator, 99.9).ok, true);
  });

  test('provides clear error message', () => {
    const validator = v.number().percentage();
    const result = validate(validator, 150);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /percentage/);
    }
  });
});

// ============================================================================
// v0.9.5: Functional API tests (tree-shakeable)
// ============================================================================

import { number, port, latitude, longitude, percentage, int } from '../src/index.js';

describe('v0.9.5 functional API: number validators', () => {
  test('port() as functional refinement', () => {
    const validator = number(port());
    assert.strictEqual(validate(validator, 8080).ok, true);
    assert.strictEqual(validate(validator, 70000).ok, false);
  });

  test('latitude() as functional refinement', () => {
    const validator = number(latitude());
    assert.strictEqual(validate(validator, 45.5).ok, true);
    assert.strictEqual(validate(validator, 95).ok, false);
  });

  test('longitude() as functional refinement', () => {
    const validator = number(longitude());
    assert.strictEqual(validate(validator, -122.4).ok, true);
    assert.strictEqual(validate(validator, 200).ok, false);
  });

  test('percentage() as functional refinement', () => {
    const validator = number(percentage());
    assert.strictEqual(validate(validator, 50).ok, true);
    assert.strictEqual(validate(validator, 150).ok, false);
  });
});

describe('v0.9.5: chaining new number validators', () => {
  test('port with additional constraints', () => {
    // Well-known ports (1-1023) require root
    const wellKnownPort = v.number().port().max(1023);
    assert.strictEqual(validate(wellKnownPort, 80).ok, true);
    assert.strictEqual(validate(wellKnownPort, 443).ok, true);
    assert.strictEqual(validate(wellKnownPort, 8080).ok, false); // Too high
  });

  test('coordinates as combined validator', () => {
    // Create a coordinate pair validator
    const latValidator = v.number().latitude();
    const lngValidator = v.number().longitude();

    // Test some real cities
    assert.strictEqual(validate(latValidator, 51.5074).ok, true);  // London lat
    assert.strictEqual(validate(lngValidator, -0.1278).ok, true);  // London lng
    assert.strictEqual(validate(latValidator, 35.6762).ok, true);  // Tokyo lat
    assert.strictEqual(validate(lngValidator, 139.6503).ok, true); // Tokyo lng
  });

  test('percentage as integer only', () => {
    // Some systems require integer percentages
    const intPercentage = v.number().percentage().int();
    assert.strictEqual(validate(intPercentage, 50).ok, true);
    assert.strictEqual(validate(intPercentage, 50.5).ok, false); // Must be integer
  });

  test('functional API: combining refinements', () => {
    // Port that's also positive (redundant but demonstrates chaining)
    const validator = number(port(), int());
    assert.strictEqual(validate(validator, 8080).ok, true);
    assert.strictEqual(validate(validator, 80.5).ok, false);
  });
});
