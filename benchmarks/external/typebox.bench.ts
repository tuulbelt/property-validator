#!/usr/bin/env node --import tsx
/**
 * TypeBox - Competitor Benchmark (tatami-ng)
 *
 * Benchmarks TypeBox using same scenarios as property-validator for direct comparison.
 *
 * TypeBox has two validation APIs:
 * - Value.Check() - Dynamic validation (no JIT)
 * - TypeCompiler.Compile() + Check() - JIT-compiled validation (much faster)
 *
 * We benchmark BOTH to show the full picture.
 */

import { bench, group, run } from 'tatami-ng';
import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { TypeCompiler } from '@sinclair/typebox/compiler';

// ============================================================================
// Schemas (PRE-CREATED for fair benchmarking)
// ============================================================================

// Primitives
const StringSchema = Type.String();
const NumberSchema = Type.Number();

// Objects
const UserSchema = Type.Object({
  name: Type.String(),
  age: Type.Number(),
  email: Type.String(),
});

const ComplexSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  metadata: Type.Object({
    tags: Type.Array(Type.String()),
    priority: Type.Union([Type.Literal('low'), Type.Literal('medium'), Type.Literal('high')]),
    createdAt: Type.Number(),
  }),
  settings: Type.Optional(Type.Object({
    theme: Type.String(),
    notifications: Type.Boolean(),
  })),
});

// Arrays
const StringArraySchema = Type.Array(Type.String());
const NumberArraySchema = Type.Array(Type.Number());
const UserArraySchema = Type.Array(UserSchema);

// Unions
const UnionSchema = Type.Union([Type.String(), Type.Number(), Type.Boolean()]);

// ============================================================================
// Pre-compile TypeCompiler validators (this is the FAST path)
// ============================================================================
const CompiledString = TypeCompiler.Compile(StringSchema);
const CompiledNumber = TypeCompiler.Compile(NumberSchema);
const CompiledUser = TypeCompiler.Compile(UserSchema);
const CompiledComplex = TypeCompiler.Compile(ComplexSchema);
const CompiledStringArray = TypeCompiler.Compile(StringArraySchema);
const CompiledNumberArray = TypeCompiler.Compile(NumberArraySchema);
const CompiledUserArray = TypeCompiler.Compile(UserArraySchema);
const CompiledUnion = TypeCompiler.Compile(UnionSchema);

// ============================================================================
// Prevent Dead Code Elimination
// ============================================================================

let result: any;

// ============================================================================
// Benchmark Suite
// ============================================================================

console.log('\n🔥 TypeBox Competitor Benchmark (tatami-ng)\n');
console.log('Comparing Value.Check() (dynamic) vs TypeCompiler.Check() (JIT)\n');

group('Primitives - Value.Check (dynamic)', () => {
  bench('typebox-value: primitive string (valid)', () => {
    result = Value.Check(StringSchema, 'hello world');
  });

  bench('typebox-value: primitive number (valid)', () => {
    result = Value.Check(NumberSchema, 42);
  });

  bench('typebox-value: primitive string (invalid)', () => {
    result = Value.Check(StringSchema, 123);
  });
});

group('Primitives - TypeCompiler.Check (JIT)', () => {
  bench('typebox-jit: primitive string (valid)', () => {
    result = CompiledString.Check('hello world');
  });

  bench('typebox-jit: primitive number (valid)', () => {
    result = CompiledNumber.Check(42);
  });

  bench('typebox-jit: primitive string (invalid)', () => {
    result = CompiledString.Check(123);
  });
});

group('Objects - Value.Check (dynamic)', () => {
  bench('typebox-value: object simple (valid)', () => {
    result = Value.Check(UserSchema, { name: 'Alice', age: 30, email: 'alice@example.com' });
  });

  bench('typebox-value: object simple (invalid)', () => {
    result = Value.Check(UserSchema, { name: 'Bob', age: 'not-a-number' });
  });

  bench('typebox-value: object complex nested (valid)', () => {
    result = Value.Check(ComplexSchema, {
      id: 1,
      name: 'Test',
      metadata: {
        tags: ['tag1', 'tag2'],
        priority: 'high',
        createdAt: Date.now(),
      },
      settings: {
        theme: 'dark',
        notifications: true,
      },
    });
  });
});

group('Objects - TypeCompiler.Check (JIT)', () => {
  bench('typebox-jit: object simple (valid)', () => {
    result = CompiledUser.Check({ name: 'Alice', age: 30, email: 'alice@example.com' });
  });

  bench('typebox-jit: object simple (invalid)', () => {
    result = CompiledUser.Check({ name: 'Bob', age: 'not-a-number' });
  });

  bench('typebox-jit: object complex nested (valid)', () => {
    result = CompiledComplex.Check({
      id: 1,
      name: 'Test',
      metadata: {
        tags: ['tag1', 'tag2'],
        priority: 'high',
        createdAt: Date.now(),
      },
      settings: {
        theme: 'dark',
        notifications: true,
      },
    });
  });
});

// Arrays - OBJECTS (UserSchema) - APPLES-TO-APPLES comparison
const userArraySmall = Array(10).fill({ name: 'Alice', age: 30, email: 'alice@example.com' });
const userArrayMedium = Array(100).fill({ name: 'Bob', age: 25, email: 'bob@example.com' });
const userArrayLarge = Array(1000).fill({ name: 'Charlie', age: 35, email: 'charlie@example.com' });

group('Arrays Objects - Value.Check (dynamic)', () => {
  bench('typebox-value: array OBJECTS small (10 items)', () => {
    result = Value.Check(UserArraySchema, userArraySmall);
  });

  bench('typebox-value: array OBJECTS medium (100 items)', () => {
    result = Value.Check(UserArraySchema, userArrayMedium);
  });
});

group('Arrays Objects - TypeCompiler.Check (JIT)', () => {
  bench('typebox-jit: array OBJECTS small (10 items)', () => {
    result = CompiledUserArray.Check(userArraySmall);
  });

  bench('typebox-jit: array OBJECTS medium (100 items)', () => {
    result = CompiledUserArray.Check(userArrayMedium);
  });
});

// Arrays - PRIMITIVES (string[])
const stringArraySmall = Array(10).fill('test');
const stringArrayMedium = Array(100).fill('test');

group('Arrays Primitives - Value.Check (dynamic)', () => {
  bench('typebox-value: array PRIMITIVES string[] small (10 items)', () => {
    result = Value.Check(StringArraySchema, stringArraySmall);
  });

  bench('typebox-value: array PRIMITIVES string[] medium (100 items)', () => {
    result = Value.Check(StringArraySchema, stringArrayMedium);
  });
});

group('Arrays Primitives - TypeCompiler.Check (JIT)', () => {
  bench('typebox-jit: array PRIMITIVES string[] small (10 items)', () => {
    result = CompiledStringArray.Check(stringArraySmall);
  });

  bench('typebox-jit: array PRIMITIVES string[] medium (100 items)', () => {
    result = CompiledStringArray.Check(stringArrayMedium);
  });
});

group('Unions - Value.Check (dynamic)', () => {
  bench('typebox-value: union string match', () => {
    result = Value.Check(UnionSchema, 'test');
  });

  bench('typebox-value: union number match', () => {
    result = Value.Check(UnionSchema, 42);
  });

  bench('typebox-value: union boolean match', () => {
    result = Value.Check(UnionSchema, true);
  });

  bench('typebox-value: union no match', () => {
    result = Value.Check(UnionSchema, null);
  });
});

group('Unions - TypeCompiler.Check (JIT)', () => {
  bench('typebox-jit: union string match', () => {
    result = CompiledUnion.Check('test');
  });

  bench('typebox-jit: union number match', () => {
    result = CompiledUnion.Check(42);
  });

  bench('typebox-jit: union boolean match', () => {
    result = CompiledUnion.Check(true);
  });

  bench('typebox-jit: union no match', () => {
    result = CompiledUnion.Check(null);
  });
});

// ============================================================================
// Run Benchmarks
// ============================================================================

await run({
  units: false,
  silent: false,
  json: false,
  samples: 256,
  time: 2_000_000_000, // 2 seconds per benchmark
  warmup: true,
  latency: true,
  throughput: true,
});

console.log('\n✅ TypeBox benchmark complete!\n');
console.log('Note: TypeCompiler.Check (JIT) is the recommended API for hot paths.');
console.log('Value.Check is for ad-hoc validation where compilation overhead isn\'t worth it.\n');
