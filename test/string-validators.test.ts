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
