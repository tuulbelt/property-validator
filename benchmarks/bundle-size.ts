#!/usr/bin/env -S npx tsx
/**
 * Bundle Size Benchmark (v0.9.2)
 *
 * Measures bundle sizes for different import configurations:
 * - Full import (everything)
 * - /v import (v namespace + validate)
 * - /lite import (named exports only)
 * - Minimal usage (string + object + validate)
 *
 * Uses esbuild for accurate tree-shaking measurement.
 */

import { build } from 'esbuild';
import { writeFileSync, readFileSync, unlinkSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const tmpDir = join(__dirname, '.bundle-tmp');

interface BundleConfig {
  name: string;
  code: string;
  description: string;
}

// Generate configs with absolute paths
function getConfigs(): BundleConfig[] {
  const srcPath = join(projectRoot, 'src');

  return [
    {
      name: 'full',
      description: 'Full import (everything)',
      code: `
import { v, validate, check, compile, compileCheck, string, number, boolean, object, array, tuple, union, literal, lazy, optional, nullable, enum_ } from '${srcPath}/index.ts';
import { email, url, uuid, minLength, maxLength, pattern } from '${srcPath}/refinements/string.ts';
import { int, positive, negative, range, min, max } from '${srcPath}/refinements/number.ts';

// Use everything to prevent tree-shaking
const schema = v.object({
  name: v.string().email(),
  age: v.number().positive(),
  tags: v.array(v.string()),
});
const result = validate(schema, { name: "test@example.com", age: 25, tags: ["a"] });
const isValid = check(schema, { name: "test", age: 1, tags: [] });
const compiled = compile(schema);
const compiledCheck = compileCheck(schema);

// Named exports
const s = string(email());
const n = number(int(), positive());
const o = object({ x: string() });
const a = array(number());
const t = tuple([string(), number()]);
const u = union([string(), number()]);
const l = literal("test");
const z = lazy(() => string());
const opt = optional(string());
const nul = nullable(string());
const e = enum_(["a", "b"]);

console.log(result, isValid, s, n, o, a, t, u, l, z, opt, nul, e, compiled, compiledCheck);
`
    },
    {
      name: 'v-namespace',
      description: '/v import (v namespace)',
      code: `
import { v, validate, check } from '${srcPath}/v.ts';

const schema = v.object({
  name: v.string().email(),
  age: v.number().positive(),
});
const result = validate(schema, { name: "test", age: 25 });
const isValid = check(schema, { name: "test", age: 1 });
console.log(result, isValid);
`
    },
    {
      name: 'lite',
      description: '/lite import (named exports)',
      code: `
import { validate, check, string, number, object, email, positive } from '${srcPath}/lite.ts';

const schema = object({
  name: string(email()),
  age: number(positive()),
});
const result = validate(schema, { name: "test", age: 25 });
const isValid = check(schema, { name: "test", age: 1 });
console.log(result, isValid);
`
    },
    {
      name: 'minimal',
      description: 'Minimal (validate + string + object)',
      code: `
import { validate, string, object } from '${srcPath}/lite.ts';

const schema = object({ name: string() });
const result = validate(schema, { name: "test" });
console.log(result);
`
    },
    {
      name: 'primitives-only',
      description: 'Primitives only (string + number + validate)',
      code: `
import { validate, string, number } from '${srcPath}/lite.ts';

const s = string();
const n = number();
const r1 = validate(s, "test");
const r2 = validate(n, 42);
console.log(r1, r2);
`
    },
    {
      name: 'with-refinements',
      description: 'With refinements (email + int + positive)',
      code: `
import { validate, string, number, email, int, positive } from '${srcPath}/lite.ts';

const emailSchema = string(email());
const ageSchema = number(int(), positive());
const r1 = validate(emailSchema, "test@example.com");
const r2 = validate(ageSchema, 25);
console.log(r1, r2);
`
    },
    {
      name: 'complex-schema',
      description: 'Complex nested schema',
      code: `
import { validate, string, number, object, array, optional, email, positive } from '${srcPath}/lite.ts';

const UserSchema = object({
  name: string(),
  email: string(email()),
  age: number(positive()),
  address: optional(object({
    street: string(),
    city: string(),
  })),
  tags: array(string()),
});

const result = validate(UserSchema, {
  name: "Alice",
  email: "alice@example.com",
  age: 30,
  tags: ["admin"],
});
console.log(result);
`
    },
  ];
}

async function measureBundleSize(config: BundleConfig): Promise<{ minified: number; gzipped: number }> {
  // Create temp file
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }

  const inputFile = join(tmpDir, `${config.name}.ts`);
  const outputFile = join(tmpDir, `${config.name}.js`);

  writeFileSync(inputFile, config.code);

  try {
    // Build with esbuild (tree-shaking enabled)
    await build({
      entryPoints: [inputFile],
      bundle: true,
      minify: true,
      format: 'esm',
      platform: 'node',
      treeShaking: true,
      outfile: outputFile,
      external: ['node:fs', 'node:path', 'node:url', 'node:child_process'], // External Node.js built-ins
      logLevel: 'silent',
    });

    // Read output
    const output = readFileSync(outputFile, 'utf-8');
    const minified = Buffer.byteLength(output, 'utf-8');
    const gzipped = gzipSync(output).length;

    return { minified, gzipped };
  } finally {
    // Cleanup
    try { unlinkSync(inputFile); } catch {}
    try { unlinkSync(outputFile); } catch {}
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function main() {
  console.log('Property Validator v0.9.2 - Bundle Size Analysis');
  console.log('='.repeat(60));
  console.log('');

  const configs = getConfigs();
  const results: Array<{ name: string; description: string; minified: number; gzipped: number }> = [];

  for (const config of configs) {
    process.stdout.write(`Measuring ${config.name}... `);
    try {
      const { minified, gzipped } = await measureBundleSize(config);
      results.push({ name: config.name, description: config.description, minified, gzipped });
      console.log(`✓ ${formatSize(minified)} (${formatSize(gzipped)} gzip)`);
    } catch (error) {
      console.log(`✗ Error: ${(error as Error).message}`);
    }
  }

  // Cleanup temp directory
  try { rmSync(tmpDir, { recursive: true }); } catch {}

  console.log('');
  console.log('Bundle Size Summary');
  console.log('='.repeat(60));
  console.log('');
  console.log('| Configuration | Minified | Gzipped | Description |');
  console.log('|---------------|----------|---------|-------------|');

  for (const result of results) {
    console.log(`| ${result.name.padEnd(13)} | ${formatSize(result.minified).padEnd(8)} | ${formatSize(result.gzipped).padEnd(7)} | ${result.description} |`);
  }

  console.log('');

  // Savings comparison
  const full = results.find(r => r.name === 'full');
  const lite = results.find(r => r.name === 'lite');
  const minimal = results.find(r => r.name === 'minimal');

  if (full && lite && minimal) {
    console.log('Savings Analysis');
    console.log('-'.repeat(60));
    console.log(`Full bundle: ${formatSize(full.minified)} (${formatSize(full.gzipped)} gzip)`);
    console.log(`/lite import: ${formatSize(lite.minified)} (${((1 - lite.minified / full.minified) * 100).toFixed(0)}% smaller)`);
    console.log(`Minimal: ${formatSize(minimal.minified)} (${((1 - minimal.minified / full.minified) * 100).toFixed(0)}% smaller)`);
  }

  console.log('');
  console.log('Import Recommendations');
  console.log('-'.repeat(60));
  console.log('• For smallest bundles: Use /lite with named imports');
  console.log('• For fluent API (v.string().email()): Use /v');
  console.log('• For full access: Use main entry point');
}

main().catch(console.error);
