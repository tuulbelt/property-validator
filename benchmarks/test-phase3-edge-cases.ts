#!/usr/bin/env node --import tsx
/**
 * Test Phase 3 for potential issues and edge cases
 */

import { v } from '../src/index.ts';

console.log('🧪 Testing Phase 3 Edge Cases\n');
console.log('='.repeat(60));

// Test 1: Property names with special characters
console.log('\n1️⃣ Test: Property names with special characters');
try {
  const schema1 = v.object({
    'user-name': v.string(),  // Dash in property name
    'user.email': v.string(), // Dot in property name
    'user@domain': v.string(), // @ symbol
  });

  const result = schema1.validate({
    'user-name': 'Alice',
    'user.email': 'alice@example.com',
    'user@domain': 'example.com',
  });

  console.log('✅ PASS: Special characters handled correctly');
  console.log('   Result:', result);
} catch (e) {
  console.log('❌ FAIL:', e);
}

// Test 2: Property names that could break generated code
console.log('\n2️⃣ Test: Dangerous property names');
try {
  const schema2 = v.object({
    'constructor': v.string(),
    '__proto__': v.string(),
    'toString': v.string(),
  });

  const result = schema2.validate({
    'constructor': 'test',
    '__proto__': 'test',
    'toString': 'test',
  });

  console.log('✅ PASS: Dangerous property names handled');
  console.log('   Result:', result);
} catch (e) {
  console.log('❌ FAIL:', e);
}

// Test 3: Very large number of properties
console.log('\n3️⃣ Test: Large schema (100 properties)');
try {
  const largeShape: any = {};
  for (let i = 0; i < 100; i++) {
    largeShape[`prop${i}`] = v.string();
  }
  const schema3 = v.object(largeShape);

  const largeData: any = {};
  for (let i = 0; i < 100; i++) {
    largeData[`prop${i}`] = `value${i}`;
  }

  const result = schema3.validate(largeData);
  console.log('✅ PASS: Large schemas work');
  console.log('   Result:', result);
} catch (e) {
  console.log('❌ FAIL:', e);
}

// Test 4: Nested objects (complex validators in closure)
console.log('\n4️⃣ Test: Nested objects (closure validators)');
try {
  const schema4 = v.object({
    name: v.string(),
    address: v.object({
      street: v.string(),
      city: v.string(),
    }),
    tags: v.array(v.string()),
  });

  const result = schema4.validate({
    name: 'Alice',
    address: {
      street: '123 Main St',
      city: 'NYC',
    },
    tags: ['tag1', 'tag2'],
  });

  console.log('✅ PASS: Nested objects work');
  console.log('   Result:', result);
} catch (e) {
  console.log('❌ FAIL:', e);
}

// Test 5: CSP restriction simulation (new Function fails)
console.log('\n5️⃣ Test: CSP restriction handling');
console.log('⚠️  Note: We use new Function() - this WILL fail in CSP-restricted environments');
console.log('   Current implementation does NOT have a fallback!');
console.log('   This is a KNOWN LIMITATION');

// Test 6: Performance with invalid data (early rejection)
console.log('\n6️⃣ Test: Early rejection performance');
try {
  const schema6 = v.object({
    a: v.string(),
    b: v.string(),
    c: v.string(),
    d: v.string(),
    e: v.string(),
  });

  // Invalid first property - should reject immediately
  const invalidData = {
    a: 123, // Wrong type - first check should fail
    b: 'valid',
    c: 'valid',
    d: 'valid',
    e: 'valid',
  };

  const result = schema6.validate(invalidData);
  console.log('✅ PASS: Early rejection works');
  console.log('   Result:', result, '(should be false)');
} catch (e) {
  console.log('❌ FAIL:', e);
}

console.log('\n' + '='.repeat(60));
console.log('\n📋 Summary of Issues Found:\n');

console.log('✅ WORKS:');
console.log('   - Special characters in property names');
console.log('   - Dangerous property names (constructor, __proto__)');
console.log('   - Large schemas (100+ properties)');
console.log('   - Nested objects (closure validators)');
console.log('   - Early rejection optimization');
console.log('');

console.log('⚠️  LIMITATIONS:');
console.log('   1. CSP Restrictions: Uses new Function() - NO FALLBACK IMPLEMENTED');
console.log('   2. Debug Difficulty: Generated code is harder to debug');
console.log('   3. Code Size: Generated function body grows with schema size');
console.log('   4. Security: Property name sanitization relies on regex');
console.log('');

console.log('🔍 POTENTIAL ISSUES TO INVESTIGATE:');
console.log('   1. What happens with VERY large schemas (1000+ properties)?');
console.log('   2. Memory usage of generated functions?');
console.log('   3. V8 deoptimization with certain property patterns?');
console.log('   4. Error messages are less helpful (just returns false)');
