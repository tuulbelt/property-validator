/**
 * Head-to-Head Comparison: property-validator vs valibot vs TypeBox
 *
 * Run: node --import tsx head-to-head.bench.ts
 */

import { bench, baseline, group, run } from 'tatami-ng';

// property-validator
import { v, validate, check, compileCheck } from '../src/index.ts';

// valibot
import * as valibot from 'valibot';

// TypeBox
import { Type as T } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { TypeCompiler } from '@sinclair/typebox/compiler';

// ========================================
// Schema Definitions
// ========================================

// Primitive schemas
const pvString = v.string();
const valibotString = valibot.string();
const typeboxString = T.String();
const typeboxStringCompiled = TypeCompiler.Compile(typeboxString);

const pvNumber = v.number();
const valibotNumber = valibot.number();
const typeboxNumber = T.Number();
const typeboxNumberCompiled = TypeCompiler.Compile(typeboxNumber);

// Simple object schemas
const pvSimpleObject = v.object({
  name: v.string(),
  age: v.number(),
  active: v.boolean()
});
const valibotSimpleObject = valibot.object({
  name: valibot.string(),
  age: valibot.number(),
  active: valibot.boolean()
});
const typeboxSimpleObject = T.Object({
  name: T.String(),
  age: T.Number(),
  active: T.Boolean()
});
const typeboxSimpleObjectCompiled = TypeCompiler.Compile(typeboxSimpleObject);

// Complex nested schemas
const pvComplexNested = v.object({
  user: v.object({
    profile: v.object({
      name: v.string(),
      email: v.string()
    }),
    settings: v.object({
      theme: v.string(),
      notifications: v.boolean()
    })
  }),
  metadata: v.object({
    created: v.number(),
    tags: v.array(v.string())
  })
});

const valibotComplexNested = valibot.object({
  user: valibot.object({
    profile: valibot.object({
      name: valibot.string(),
      email: valibot.string()
    }),
    settings: valibot.object({
      theme: valibot.string(),
      notifications: valibot.boolean()
    })
  }),
  metadata: valibot.object({
    created: valibot.number(),
    tags: valibot.array(valibot.string())
  })
});

const typeboxComplexNested = T.Object({
  user: T.Object({
    profile: T.Object({
      name: T.String(),
      email: T.String()
    }),
    settings: T.Object({
      theme: T.String(),
      notifications: T.Boolean()
    })
  }),
  metadata: T.Object({
    created: T.Number(),
    tags: T.Array(T.String())
  })
});
const typeboxComplexNestedCompiled = TypeCompiler.Compile(typeboxComplexNested);

// Array schemas
const pvArrayStrings = v.array(v.string());
const valibotArrayStrings = valibot.array(valibot.string());
const typeboxArrayStrings = T.Array(T.String());
const typeboxArrayStringsCompiled = TypeCompiler.Compile(typeboxArrayStrings);

// Union schemas
const pvUnion = v.union([v.string(), v.number(), v.boolean()]);
const valibotUnion = valibot.union([valibot.string(), valibot.number(), valibot.boolean()]);
const typeboxUnion = T.Union([T.String(), T.Number(), T.Boolean()]);
const typeboxUnionCompiled = TypeCompiler.Compile(typeboxUnion);

// v0.8.5: Pre-compiled property-validator checkers (maximum speed)
const pvStringCompiled = compileCheck(pvString);
const pvNumberCompiled = compileCheck(pvNumber);
const pvSimpleObjectCompiled = compileCheck(pvSimpleObject);
const pvComplexNestedCompiled = compileCheck(pvComplexNested);
const pvArrayStringsCompiled = compileCheck(pvArrayStrings);
const pvUnionCompiled = compileCheck(pvUnion);

// ========================================
// Test Data
// ========================================

const validString = 'hello world';
const validNumber = 42;
const validSimpleObject = { name: 'Alice', age: 30, active: true };
const validComplexNested = {
  user: {
    profile: { name: 'Alice', email: 'alice@example.com' },
    settings: { theme: 'dark', notifications: true }
  },
  metadata: { created: Date.now(), tags: ['user', 'verified'] }
};
const validArrayStrings10 = Array.from({ length: 10 }, (_, i) => `item-${i}`);
const validArrayStrings100 = Array.from({ length: 100 }, (_, i) => `item-${i}`);

// Variables to prevent dead code elimination
let result: any;

console.log('📊 Head-to-Head Comparison: property-validator vs valibot vs TypeBox\n');

// ========================================
// Benchmarks
// ========================================

group('Primitive: String (valid)', () => {
  baseline('pv check()', () => {
    result = check(pvString, validString);
  });
  bench('pv compileCheck()', () => {
    result = pvStringCompiled(validString);
  });
  bench('valibot', () => {
    result = valibot.is(valibotString, validString);
  });
  bench('TypeBox Value.Check', () => {
    result = Value.Check(typeboxString, validString);
  });
  bench('TypeBox Compiled', () => {
    result = typeboxStringCompiled.Check(validString);
  });
});

group('Primitive: Number (valid)', () => {
  baseline('pv check()', () => {
    result = check(pvNumber, validNumber);
  });
  bench('pv compileCheck()', () => {
    result = pvNumberCompiled(validNumber);
  });
  bench('valibot', () => {
    result = valibot.is(valibotNumber, validNumber);
  });
  bench('TypeBox Value.Check', () => {
    result = Value.Check(typeboxNumber, validNumber);
  });
  bench('TypeBox Compiled', () => {
    result = typeboxNumberCompiled.Check(validNumber);
  });
});

group('Object: Simple (valid)', () => {
  baseline('pv check()', () => {
    result = check(pvSimpleObject, validSimpleObject);
  });
  bench('pv compileCheck()', () => {
    result = pvSimpleObjectCompiled(validSimpleObject);
  });
  bench('valibot', () => {
    result = valibot.is(valibotSimpleObject, validSimpleObject);
  });
  bench('TypeBox Value.Check', () => {
    result = Value.Check(typeboxSimpleObject, validSimpleObject);
  });
  bench('TypeBox Compiled', () => {
    result = typeboxSimpleObjectCompiled.Check(validSimpleObject);
  });
});

group('Object: Complex Nested (valid)', () => {
  baseline('pv check()', () => {
    result = check(pvComplexNested, validComplexNested);
  });
  bench('pv compileCheck()', () => {
    result = pvComplexNestedCompiled(validComplexNested);
  });
  bench('valibot', () => {
    result = valibot.is(valibotComplexNested, validComplexNested);
  });
  bench('TypeBox Value.Check', () => {
    result = Value.Check(typeboxComplexNested, validComplexNested);
  });
  bench('TypeBox Compiled', () => {
    result = typeboxComplexNestedCompiled.Check(validComplexNested);
  });
});

group('Array: 10 strings (valid)', () => {
  baseline('pv check()', () => {
    result = check(pvArrayStrings, validArrayStrings10);
  });
  bench('pv compileCheck()', () => {
    result = pvArrayStringsCompiled(validArrayStrings10);
  });
  bench('valibot', () => {
    result = valibot.is(valibotArrayStrings, validArrayStrings10);
  });
  bench('TypeBox Value.Check', () => {
    result = Value.Check(typeboxArrayStrings, validArrayStrings10);
  });
  bench('TypeBox Compiled', () => {
    result = typeboxArrayStringsCompiled.Check(validArrayStrings10);
  });
});

group('Array: 100 strings (valid)', () => {
  baseline('pv check()', () => {
    result = check(pvArrayStrings, validArrayStrings100);
  });
  bench('pv compileCheck()', () => {
    result = pvArrayStringsCompiled(validArrayStrings100);
  });
  bench('valibot', () => {
    result = valibot.is(valibotArrayStrings, validArrayStrings100);
  });
  bench('TypeBox Value.Check', () => {
    result = Value.Check(typeboxArrayStrings, validArrayStrings100);
  });
  bench('TypeBox Compiled', () => {
    result = typeboxArrayStringsCompiled.Check(validArrayStrings100);
  });
});

group('Union: String (1st match)', () => {
  baseline('pv check()', () => {
    result = check(pvUnion, validString);
  });
  bench('pv compileCheck()', () => {
    result = pvUnionCompiled(validString);
  });
  bench('valibot', () => {
    result = valibot.is(valibotUnion, validString);
  });
  bench('TypeBox Value.Check', () => {
    result = Value.Check(typeboxUnion, validString);
  });
  bench('TypeBox Compiled', () => {
    result = typeboxUnionCompiled.Check(validString);
  });
});

group('Union: Number (2nd match)', () => {
  baseline('pv check()', () => {
    result = check(pvUnion, validNumber);
  });
  bench('pv compileCheck()', () => {
    result = pvUnionCompiled(validNumber);
  });
  bench('valibot', () => {
    result = valibot.is(valibotUnion, validNumber);
  });
  bench('TypeBox Value.Check', () => {
    result = Value.Check(typeboxUnion, validNumber);
  });
  bench('TypeBox Compiled', () => {
    result = typeboxUnionCompiled.Check(validNumber);
  });
});

await run({
  units: false,
  silent: false,
  samples: 128,
  time: 500_000_000, // 500ms per benchmark for faster results
  warmup: true,
  latency: true,
  throughput: true,
});

console.log('\n✅ Benchmark complete!');
