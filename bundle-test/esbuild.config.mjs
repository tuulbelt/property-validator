/**
 * Tree-Shaking Verification Test
 *
 * This script builds two bundles:
 * 1. full-bundle.js - Imports everything
 * 2. minimal-bundle.js - Imports only string + email
 *
 * The minimal bundle should be significantly smaller if tree-shaking works.
 */

import * as esbuild from 'esbuild';
import { writeFileSync, statSync, mkdirSync, existsSync } from 'node:fs';

const outdir = './bundle-test/dist';

// Ensure output directory exists
if (!existsSync(outdir)) {
  mkdirSync(outdir, { recursive: true });
}

// Full bundle - imports everything
const fullCode = `
import {
  // Core
  v, validate, check, compile, compileCheck,
  // Validators
  string, number, boolean, array, tuple, object,
  optional, nullable, union, literal, lazy, enum_,
  // String refinements
  email, url, uuid, minLength, maxLength, length, nonempty,
  pattern, startsWith, endsWith, includes,
  datetime, date, time, ip, ipv4, ipv6,
  // Number refinements
  int, safeInt, positive, negative, nonnegative, nonpositive,
  min, max, range, finite, multipleOf,
  // Array refinements
  minItems, maxItems, itemCount, nonemptyArray
} from '../src/index.js';

// Use everything to prevent DCE
const schema = v.object({
  name: v.string().email(),
  age: v.number().int().positive()
});
console.log(validate(schema, { name: 'test@test.com', age: 25 }));
`;

// Minimal bundle - imports only string + email (tree-shakeable)
const minimalCode = `
import { string, email, validate } from '../src/index.js';

const schema = string(email());
console.log(validate(schema, 'test@test.com'));
`;

// Write test files
writeFileSync('./bundle-test/full.ts', fullCode);
writeFileSync('./bundle-test/minimal.ts', minimalCode);

async function build() {
  try {
    // Build full bundle
    await esbuild.build({
      entryPoints: ['./bundle-test/full.ts'],
      bundle: true,
      minify: true,
      outfile: `${outdir}/full-bundle.js`,
      format: 'esm',
      platform: 'node',
      treeShaking: true,
    });

    // Build minimal bundle
    await esbuild.build({
      entryPoints: ['./bundle-test/minimal.ts'],
      bundle: true,
      minify: true,
      outfile: `${outdir}/minimal-bundle.js`,
      format: 'esm',
      platform: 'node',
      treeShaking: true,
    });

    // Report sizes
    const fullSize = statSync(`${outdir}/full-bundle.js`).size;
    const minimalSize = statSync(`${outdir}/minimal-bundle.js`).size;

    console.log('\n📦 Bundle Size Comparison:\n');
    console.log(`Full bundle:    ${(fullSize / 1024).toFixed(2)} KB`);
    console.log(`Minimal bundle: ${(minimalSize / 1024).toFixed(2)} KB`);
    console.log(`\nReduction: ${((1 - minimalSize / fullSize) * 100).toFixed(1)}%`);

    if (minimalSize < fullSize * 0.9) {
      console.log('\n✅ Tree-shaking is working! Minimal bundle is significantly smaller.');
    } else {
      console.log('\n⚠️  Minimal bundle is not much smaller - check tree-shaking configuration.');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
