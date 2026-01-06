#!/usr/bin/env -S npx tsx
/**
 * Property Validator - CLI Module
 *
 * Command-line interface for property-validator.
 * Extracted from index.ts for better code organization (v0.12.0).
 */

import { realpathSync } from 'node:fs';
import { v, validate, check, VERSION } from './index.js';

/**
 * CLI options interface
 */
interface CliOptions {
  input: string;
  verbose: boolean;
  checkOnly: boolean;
  showApi: boolean;
}

/**
 * Parse command line arguments
 */
export function parseArgs(args: string[]): CliOptions {
  let input = '';
  let verbose = false;
  let checkOnly = false;
  let showApi = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--check' || arg === '-c') {
      checkOnly = true;
    } else if (arg === '--api') {
      showApi = true;
    } else if (arg === '--version' || arg === '-V') {
      console.log(`property-validator v${VERSION}`);
      console.log('Runtime type validation with TypeScript inference');
      process.exit(0);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: propval [options] <json-data>

Property Validator v${VERSION} - Runtime type validation with TypeScript inference.

Options:
  -v, --verbose  Enable verbose output
  -c, --check    Boolean-only output (exit code only, no output)
  --api          Show available validators and methods
  -V, --version  Show version
  -h, --help     Show this help message

Examples:
  # Validate JSON data against built-in user schema
  propval '{"name":"Alice","age":30,"email":"alice@example.com"}'

  # Check-only mode (boolean output)
  propval --check '{"name":"Alice","age":30,"email":"alice@example.com"}'
  echo $?  # 0 = valid, 1 = invalid

  # Verbose mode
  propval --verbose '{"name":"Alice","age":30,"email":"alice@example.com"}'

  # Show available API
  propval --api

Library Usage:
  import { v, validate, check } from 'property-validator';

  const schema = v.object({
    name: v.string().min(1),
    email: v.string().email(),
    age: v.number().int().positive()
  });

  const result = validate(schema, data);
  const isValid = check(schema, data);
`);
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      input = arg;
    }
  }

  return { input, verbose, checkOnly, showApi };
}

/**
 * Show API reference
 */
export function showApiReference(): void {
  console.log(`
Property Validator v${VERSION} - API Reference

═══════════════════════════════════════════════════════════════════
 Validation Functions
═══════════════════════════════════════════════════════════════════
  validate(schema, data)     Full validation with error details
  check(schema, data)        Boolean-only (faster, no errors)
  compileCheck(schema)       Pre-compiled boolean validator

═══════════════════════════════════════════════════════════════════
 String Validators
═══════════════════════════════════════════════════════════════════
  v.string()                 Base string validator
    .min(n)                  Minimum length
    .max(n)                  Maximum length
    .length(n)               Exact length
    .nonempty()              Non-empty string
    .pattern(regex, msg?)    Custom regex pattern
    .startsWith(prefix)      String prefix
    .endsWith(suffix)        String suffix
    .includes(substring)     Contains substring

  Format validators:
    .email()                 Valid email (RFC 5321)
    .url()                   Valid URL (http/https)
    .uuid()                  Valid UUID (v1-v5)
    .datetime()              ISO 8601 datetime
    .date()                  ISO 8601 date (YYYY-MM-DD)
    .time()                  ISO 8601 time (HH:MM:SS)

  Network validators:
    .ip()                    IPv4 or IPv6 address
    .ipv4()                  IPv4 address only
    .ipv6()                  IPv6 address only

  ID format validators (v0.9.5):
    .cuid()                  CUID format
    .cuid2()                 CUID2 format
    .ulid()                  ULID format (26 chars)
    .nanoid()                NanoID format (21 chars)

  Encoding validators (v0.9.5):
    .base64()                Base64 encoded string
    .hex()                   Hexadecimal string
    .jwt()                   JWT format (header.payload.sig)

═══════════════════════════════════════════════════════════════════
 Number Validators
═══════════════════════════════════════════════════════════════════
  v.number()                 Base number validator
    .int()                   Integer only
    .positive()              Greater than 0
    .negative()              Less than 0
    .nonnegative()           >= 0
    .nonpositive()           <= 0
    .min(n)                  Minimum value
    .max(n)                  Maximum value
    .range(min, max)         Between min and max
    .finite()                Not Infinity or NaN
    .safeInt()               Safe integer range
    .multipleOf(n)           Must be multiple of n

  Extended validators (v0.9.5):
    .port()                  Valid port (0-65535)
    .latitude()              Latitude (-90 to 90)
    .longitude()             Longitude (-180 to 180)
    .percentage()            Percentage (0-100)

═══════════════════════════════════════════════════════════════════
 Other Validators
═══════════════════════════════════════════════════════════════════
  v.boolean()                Boolean type
  v.array(itemValidator)     Array with item validation
  v.tuple([...])             Fixed-length tuple
  v.object({...})            Object with property schemas
  v.record(keyValidator, valueValidator)  Dynamic key objects
  v.union([...])             One of multiple types
  v.discriminatedUnion(key, [...])  Tagged unions
  v.literal(value)           Exact value match
  v.optional(validator)      Optional field
  v.nullable(validator)      Nullable field
  v.nullish(validator)       Optional + nullable
  v.any()                    Accept any value
  v.unknown()                Accept any (type-safe)
  v.never()                  Always fails
  v.lazy(() => schema)       Recursive schemas

═══════════════════════════════════════════════════════════════════
 Object Modifiers (v0.11.0)
═══════════════════════════════════════════════════════════════════
  v.object({...}).strict()       Reject unknown properties
  v.object({...}).passthrough()  Allow unknown properties

═══════════════════════════════════════════════════════════════════
 Example
═══════════════════════════════════════════════════════════════════
  const UserSchema = v.object({
    id: v.string().ulid(),
    name: v.string().min(1).max(100),
    email: v.string().email(),
    age: v.number().int().positive().max(150),
    website: v.optional(v.string().url()),
    location: v.optional(v.object({
      lat: v.number().latitude(),
      lng: v.number().longitude()
    }))
  });

  const result = validate(UserSchema, userData);
  if (result.ok) {
    console.log(result.value.name);  // TypeScript knows the type!
  }
`);
}

/**
 * CLI entry point
 */
export function main(): void {
  const args = globalThis.process?.argv?.slice(2) ?? [];
  const { input, verbose, checkOnly, showApi } = parseArgs(args);

  // Show API reference if requested
  if (showApi) {
    showApiReference();
    globalThis.process?.exit(0);
    return;
  }

  if (!input) {
    console.error('Error: No input provided');
    console.error('Usage: propval [options] <json-data>');
    console.error('Try: propval --help');
    globalThis.process?.exit(1);
    return;
  }

  try {
    const data = JSON.parse(input);

    // Demo schema using built-in validators
    const userValidator = v.object({
      name: v.string().min(1).max(100),
      age: v.number().int().positive().max(150),
      email: v.string().email(),
    });

    // Check-only mode: use check() for faster boolean validation
    if (checkOnly) {
      const isValid = check(userValidator, data);
      globalThis.process?.exit(isValid ? 0 : 1);
      return;
    }

    // Full validation with error details
    const result = validate(userValidator, data);

    if (result.ok) {
      if (verbose) {
        console.error('[INFO] Validation successful');
      }
      console.log(JSON.stringify(result.value, null, 2));
    } else {
      console.error(`Validation error: ${result.error}`);
      globalThis.process?.exit(1);
    }
  } catch (error) {
    console.error(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
    globalThis.process?.exit(1);
  }
}

// Check if this module is being run directly
// Must resolve symlinks for npm link support (argv1 may be symlink path)
const argv1 = globalThis.process?.argv?.[1];
if (argv1) {
  try {
    const realPath = realpathSync(argv1);
    if (import.meta.url === `file://${realPath}`) {
      main();
    }
  } catch {
    // Fallback for non-existent paths
    if (import.meta.url === `file://${argv1}`) {
      main();
    }
  }
}
