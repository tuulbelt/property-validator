/**
 * String validator built-in constraints tests
 * v0.8.5 Phase 7: Built-in validators
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { v, validate } from '../src/index.ts';

describe('string validators: email()', () => {
  const emailValidator = v.string().email();

  test('accepts valid email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.org',
      'user+tag@example.co.uk',
      'a@b.co',
      'user123@test-domain.com',
    ];

    for (const email of validEmails) {
      const result = validate(emailValidator, email);
      assert.strictEqual(result.ok, true, `Expected "${email}" to be valid`);
    }
  });

  test('rejects invalid email addresses', () => {
    const invalidEmails = [
      'not-an-email',
      '@missing-local.com',
      'missing-domain@',
      'missing@.com',
      'spaces in@email.com',
      '',
    ];

    for (const email of invalidEmails) {
      const result = validate(emailValidator, email);
      assert.strictEqual(result.ok, false, `Expected "${email}" to be invalid`);
    }
  });

  test('provides clear error message', () => {
    const result = validate(emailValidator, 'not-an-email');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /valid email address/);
    }
  });
});

describe('string validators: url()', () => {
  const urlValidator = v.string().url();

  test('accepts valid URLs', () => {
    const validUrls = [
      'http://example.com',
      'https://www.example.com',
      'https://example.com/path/to/resource',
      'https://example.com?query=value',
      'https://example.com:8080/path',
    ];

    for (const url of validUrls) {
      const result = validate(urlValidator, url);
      assert.strictEqual(result.ok, true, `Expected "${url}" to be valid`);
    }
  });

  test('rejects invalid URLs', () => {
    const invalidUrls = [
      'not-a-url',
      'ftp://example.com', // Only http/https
      'example.com', // Missing protocol
      '://missing-protocol.com',
      '',
    ];

    for (const url of invalidUrls) {
      const result = validate(urlValidator, url);
      assert.strictEqual(result.ok, false, `Expected "${url}" to be invalid`);
    }
  });

  test('provides clear error message', () => {
    const result = validate(urlValidator, 'not-a-url');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /valid URL/);
    }
  });
});

describe('string validators: uuid()', () => {
  const uuidValidator = v.string().uuid();

  test('accepts valid UUIDs', () => {
    const validUuids = [
      '123e4567-e89b-12d3-a456-426614174000', // v1
      '550e8400-e29b-41d4-a716-446655440000', // v4
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8', // v1
      'f47ac10b-58cc-4372-a567-0e02b2c3d479', // v4
    ];

    for (const uuid of validUuids) {
      const result = validate(uuidValidator, uuid);
      assert.strictEqual(result.ok, true, `Expected "${uuid}" to be valid`);
    }
  });

  test('rejects invalid UUIDs', () => {
    const invalidUuids = [
      'not-a-uuid',
      '123e4567-e89b-12d3-a456', // Too short
      '123e4567-e89b-12d3-a456-426614174000-extra', // Too long
      '123e4567e89b12d3a456426614174000', // Missing dashes
      '',
    ];

    for (const uuid of invalidUuids) {
      const result = validate(uuidValidator, uuid);
      assert.strictEqual(result.ok, false, `Expected "${uuid}" to be invalid`);
    }
  });

  test('provides clear error message', () => {
    const result = validate(uuidValidator, 'not-a-uuid');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /valid UUID/);
    }
  });
});

describe('string validators: pattern()', () => {
  test('validates against custom regex pattern', () => {
    const phoneValidator = v.string().pattern(/^\d{3}-\d{4}$/, 'phone number');

    assert.strictEqual(validate(phoneValidator, '123-4567').ok, true);
    assert.strictEqual(validate(phoneValidator, '1234567').ok, false);
    assert.strictEqual(validate(phoneValidator, 'abc-defg').ok, false);
  });

  test('uses custom error message', () => {
    const zipValidator = v.string().pattern(/^\d{5}$/, 'US zip code');
    const result = validate(zipValidator, 'invalid');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /US zip code/);
    }
  });

  test('uses default error message without custom message', () => {
    const validator = v.string().pattern(/^\d+$/);
    const result = validate(validator, 'abc');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /pattern/);
    }
  });
});

describe('string validators: min() and max()', () => {
  test('min() validates minimum length', () => {
    const validator = v.string().min(3);
    assert.strictEqual(validate(validator, 'abc').ok, true);
    assert.strictEqual(validate(validator, 'abcd').ok, true);
    assert.strictEqual(validate(validator, 'ab').ok, false);
  });

  test('max() validates maximum length', () => {
    const validator = v.string().max(5);
    assert.strictEqual(validate(validator, 'abc').ok, true);
    assert.strictEqual(validate(validator, 'abcde').ok, true);
    assert.strictEqual(validate(validator, 'abcdef').ok, false);
  });

  test('min() and max() can be chained', () => {
    const validator = v.string().min(2).max(5);
    assert.strictEqual(validate(validator, 'a').ok, false);
    assert.strictEqual(validate(validator, 'ab').ok, true);
    assert.strictEqual(validate(validator, 'abcde').ok, true);
    assert.strictEqual(validate(validator, 'abcdef').ok, false);
  });

  test('provides clear error messages', () => {
    const minValidator = v.string().min(3);
    const result = validate(minValidator, 'ab');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /at least 3/);
    }

    const maxValidator = v.string().max(3);
    const result2 = validate(maxValidator, 'abcd');
    assert.strictEqual(result2.ok, false);
    if (!result2.ok) {
      assert.match(result2.error, /at most 3/);
    }
  });
});

describe('string validators: length()', () => {
  test('validates exact length', () => {
    const validator = v.string().length(5);
    assert.strictEqual(validate(validator, 'abcde').ok, true);
    assert.strictEqual(validate(validator, 'abcd').ok, false);
    assert.strictEqual(validate(validator, 'abcdef').ok, false);
  });

  test('provides clear error message', () => {
    const validator = v.string().length(5);
    const result = validate(validator, 'abc');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /exactly 5/);
    }
  });
});

describe('string validators: nonempty()', () => {
  test('rejects empty strings', () => {
    const validator = v.string().nonempty();
    assert.strictEqual(validate(validator, '').ok, false);
    assert.strictEqual(validate(validator, 'a').ok, true);
  });

  test('provides clear error message', () => {
    const validator = v.string().nonempty();
    const result = validate(validator, '');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /cannot be empty/);
    }
  });
});

describe('string validators: startsWith(), endsWith(), includes()', () => {
  test('startsWith() validates prefix', () => {
    const validator = v.string().startsWith('hello');
    assert.strictEqual(validate(validator, 'hello world').ok, true);
    assert.strictEqual(validate(validator, 'world hello').ok, false);
  });

  test('endsWith() validates suffix', () => {
    const validator = v.string().endsWith('world');
    assert.strictEqual(validate(validator, 'hello world').ok, true);
    assert.strictEqual(validate(validator, 'world hello').ok, false);
  });

  test('includes() validates substring', () => {
    const validator = v.string().includes('middle');
    assert.strictEqual(validate(validator, 'start middle end').ok, true);
    assert.strictEqual(validate(validator, 'start end').ok, false);
  });

  test('methods can be chained', () => {
    const validator = v.string().startsWith('http').includes('example').endsWith('.com');
    assert.strictEqual(validate(validator, 'http://example.com').ok, true);
    assert.strictEqual(validate(validator, 'http://test.com').ok, false);
  });
});

describe('string validators: edge cases', () => {
  test('uuid: accepts uppercase UUIDs', () => {
    const validator = v.string().uuid();
    assert.strictEqual(validate(validator, '550E8400-E29B-41D4-A716-446655440000').ok, true);
  });

  test('uuid: rejects nil UUID (version 0 - not v1-v5)', () => {
    // The nil UUID is version 0, our uuid() validates v1-v5 only
    const validator = v.string().uuid();
    assert.strictEqual(validate(validator, '00000000-0000-0000-0000-000000000000').ok, false);
  });

  test('startsWith: empty prefix matches all strings', () => {
    const validator = v.string().startsWith('');
    assert.strictEqual(validate(validator, 'anything').ok, true);
    assert.strictEqual(validate(validator, '').ok, true);
  });

  test('endsWith: empty suffix matches all strings', () => {
    const validator = v.string().endsWith('');
    assert.strictEqual(validate(validator, 'anything').ok, true);
    assert.strictEqual(validate(validator, '').ok, true);
  });

  test('includes: empty substring matches all strings', () => {
    const validator = v.string().includes('');
    assert.strictEqual(validate(validator, 'anything').ok, true);
    assert.strictEqual(validate(validator, '').ok, true);
  });

  test('email: rejects emails with consecutive dots', () => {
    const validator = v.string().email();
    assert.strictEqual(validate(validator, 'test..test@example.com').ok, false);
  });

  test('url: accepts URLs with query params and fragments', () => {
    const validator = v.string().url();
    assert.strictEqual(validate(validator, 'https://example.com?foo=bar&baz=qux').ok, true);
    assert.strictEqual(validate(validator, 'https://example.com#section').ok, true);
    assert.strictEqual(validate(validator, 'https://example.com/path?query=1#frag').ok, true);
  });

  test('min: validates boundary exactly', () => {
    const validator = v.string().min(0);
    assert.strictEqual(validate(validator, '').ok, true); // 0 length is >= 0
  });

  test('max: validates boundary exactly', () => {
    const validator = v.string().max(0);
    assert.strictEqual(validate(validator, '').ok, true); // 0 length is <= 0
    assert.strictEqual(validate(validator, 'a').ok, false);
  });

  test('pattern: preserves regex flags', () => {
    const validator = v.string().pattern(/^hello$/i); // case insensitive
    assert.strictEqual(validate(validator, 'hello').ok, true);
    assert.strictEqual(validate(validator, 'HELLO').ok, true);
    assert.strictEqual(validate(validator, 'HeLLo').ok, true);
  });

  test('non-string types are rejected', () => {
    const validator = v.string().email();
    assert.strictEqual(validate(validator, 123).ok, false);
    assert.strictEqual(validate(validator, null).ok, false);
    assert.strictEqual(validate(validator, undefined).ok, false);
    assert.strictEqual(validate(validator, {}).ok, false);
  });
});

describe('string validators: chaining multiple constraints', () => {
  test('email with length constraints', () => {
    const validator = v.string().email().min(10).max(50);
    assert.strictEqual(validate(validator, 'a@b.co').ok, false); // Too short
    assert.strictEqual(validate(validator, 'test@example.com').ok, true);
  });

  test('uuid with additional refinements', () => {
    const validator = v.string().uuid();
    assert.strictEqual(validate(validator, '550e8400-e29b-41d4-a716-446655440000').ok, true);
  });

  test('complex chain of constraints', () => {
    const usernameValidator = v.string()
      .min(3)
      .max(20)
      .pattern(/^[a-z0-9_]+$/, 'lowercase alphanumeric with underscores');

    assert.strictEqual(validate(usernameValidator, 'john_doe').ok, true);
    assert.strictEqual(validate(usernameValidator, 'ab').ok, false); // Too short
    assert.strictEqual(validate(usernameValidator, 'John_Doe').ok, false); // Uppercase
  });
});

// ============================================================================
// New validators: datetime, date, time, ip, ipv4, ipv6
// ============================================================================

describe('string validators: datetime()', () => {
  const datetimeValidator = v.string().datetime();

  test('accepts valid ISO 8601 datetimes', () => {
    const validDatetimes = [
      '2024-01-15T10:30:00Z',
      '2024-12-31T23:59:59Z',
      '2024-01-01T00:00:00Z',
      '2024-06-15T14:30:00.123Z',
      '2024-06-15T14:30:00+05:30',
      '2024-06-15T14:30:00-08:00',
    ];

    for (const dt of validDatetimes) {
      const result = validate(datetimeValidator, dt);
      assert.strictEqual(result.ok, true, `Expected "${dt}" to be valid`);
    }
  });

  test('rejects invalid datetimes', () => {
    const invalidDatetimes = [
      '2024-01-15',           // Date only
      '10:30:00',             // Time only
      '2024-13-01T00:00:00Z', // Invalid month
      '2024-01-32T00:00:00Z', // Invalid day
      '2024-01-15T25:00:00Z', // Invalid hour
      'not-a-datetime',
      '',
    ];

    for (const dt of invalidDatetimes) {
      const result = validate(datetimeValidator, dt);
      assert.strictEqual(result.ok, false, `Expected "${dt}" to be invalid`);
    }
  });

  test('provides clear error message', () => {
    const result = validate(datetimeValidator, 'invalid');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /ISO 8601 datetime/);
    }
  });
});

describe('string validators: date()', () => {
  const dateValidator = v.string().date();

  test('accepts valid ISO 8601 dates', () => {
    const validDates = [
      '2024-01-15',
      '2024-12-31',
      '2024-01-01',
      '1999-06-30',
    ];

    for (const d of validDates) {
      const result = validate(dateValidator, d);
      assert.strictEqual(result.ok, true, `Expected "${d}" to be valid`);
    }
  });

  test('rejects invalid dates', () => {
    const invalidDates = [
      '2024-13-01', // Invalid month
      '2024-01-32', // Invalid day
      '2024/01/15', // Wrong separator
      '01-15-2024', // Wrong order
      '2024-1-15',  // Missing leading zero
      '',
    ];

    for (const d of invalidDates) {
      const result = validate(dateValidator, d);
      assert.strictEqual(result.ok, false, `Expected "${d}" to be invalid`);
    }
  });
});

describe('string validators: time()', () => {
  const timeValidator = v.string().time();

  test('accepts valid ISO 8601 times', () => {
    const validTimes = [
      '00:00:00',
      '23:59:59',
      '12:30:45',
      '12:30:45.123',
      '12:30:45.123456',
    ];

    for (const t of validTimes) {
      const result = validate(timeValidator, t);
      assert.strictEqual(result.ok, true, `Expected "${t}" to be valid`);
    }
  });

  test('rejects invalid times', () => {
    const invalidTimes = [
      '24:00:00', // Invalid hour
      '12:60:00', // Invalid minute
      '12:30:60', // Invalid second
      '12:30',    // Missing seconds
      '',
    ];

    for (const t of invalidTimes) {
      const result = validate(timeValidator, t);
      assert.strictEqual(result.ok, false, `Expected "${t}" to be invalid`);
    }
  });
});

describe('string validators: ipv4()', () => {
  const ipv4Validator = v.string().ipv4();

  test('accepts valid IPv4 addresses', () => {
    const validIps = [
      '192.168.1.1',
      '10.0.0.1',
      '255.255.255.255',
      '0.0.0.0',
      '127.0.0.1',
    ];

    for (const ip of validIps) {
      const result = validate(ipv4Validator, ip);
      assert.strictEqual(result.ok, true, `Expected "${ip}" to be valid`);
    }
  });

  test('rejects invalid IPv4 addresses', () => {
    const invalidIps = [
      '256.1.1.1',      // Octet > 255
      '192.168.1',      // Missing octet
      '192.168.1.1.1',  // Extra octet
      '192.168.1.a',    // Non-numeric
      '::1',            // IPv6
      '',
    ];

    for (const ip of invalidIps) {
      const result = validate(ipv4Validator, ip);
      assert.strictEqual(result.ok, false, `Expected "${ip}" to be invalid`);
    }
  });

  test('provides clear error message', () => {
    const result = validate(ipv4Validator, 'invalid');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /IPv4/);
    }
  });
});

describe('string validators: ipv6()', () => {
  const ipv6Validator = v.string().ipv6();

  test('accepts valid IPv6 addresses', () => {
    const validIps = [
      '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      '2001:db8:85a3::8a2e:370:7334',
      '::1',
      '::',
      'fe80::1',
      '2001:db8::',
    ];

    for (const ip of validIps) {
      const result = validate(ipv6Validator, ip);
      assert.strictEqual(result.ok, true, `Expected "${ip}" to be valid`);
    }
  });

  test('rejects invalid IPv6 addresses', () => {
    const invalidIps = [
      '192.168.1.1',    // IPv4
      '2001:db8:85a3::8a2e:370g:7334', // Invalid character
      '2001:db8:85a3:0000:0000:8a2e:0370:7334:extra', // Too long
      '',
    ];

    for (const ip of invalidIps) {
      const result = validate(ipv6Validator, ip);
      assert.strictEqual(result.ok, false, `Expected "${ip}" to be invalid`);
    }
  });
});

describe('string validators: ip() (IPv4 or IPv6)', () => {
  const ipValidator = v.string().ip();

  test('accepts valid IPv4 addresses', () => {
    assert.strictEqual(validate(ipValidator, '192.168.1.1').ok, true);
    assert.strictEqual(validate(ipValidator, '10.0.0.1').ok, true);
  });

  test('accepts valid IPv6 addresses', () => {
    assert.strictEqual(validate(ipValidator, '::1').ok, true);
    assert.strictEqual(validate(ipValidator, '2001:db8::1').ok, true);
  });

  test('rejects invalid IP addresses', () => {
    assert.strictEqual(validate(ipValidator, 'not-an-ip').ok, false);
    assert.strictEqual(validate(ipValidator, '256.1.1.1').ok, false);
    assert.strictEqual(validate(ipValidator, '').ok, false);
  });
});
