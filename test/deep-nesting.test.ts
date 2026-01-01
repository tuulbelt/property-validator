import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, v } from '../src/index.js';

test('deep nesting - deeply nested objects', async (t) => {
  await t.test('validates 5-level deep nesting', () => {
    const validator = v.object({
      level1: v.object({
        level2: v.object({
          level3: v.object({
            level4: v.object({
              level5: v.string(),
            }),
          }),
        }),
      }),
    });

    const result = validate(validator, {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: 'deep value',
            },
          },
        },
      },
    });

    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value.level1.level2.level3.level4.level5, 'deep value');
    }
  });

  await t.test('reports error at deepest level', () => {
    const validator = v.object({
      level1: v.object({
        level2: v.object({
          level3: v.object({
            level4: v.object({
              level5: v.number(),
            }),
          }),
        }),
      }),
    });

    const result = validate(validator, {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: 'not a number',
            },
          },
        },
      },
    });

    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      // Verify error mentions all nested properties in chain
      assert.match(result.error, /level1/);
      assert.match(result.error, /level2/);
      assert.match(result.error, /level3/);
      assert.match(result.error, /level4/);
      assert.match(result.error, /level5/);
      assert.match(result.error, /Expected number, got string/);
    }
  });
});

test('deep nesting - nested arrays', async (t) => {
  await t.test('validates 3-level deep array nesting', () => {
    const validator = v.array(
      v.array(
        v.array(v.number())
      )
    );

    const result = validate(validator, [
      [[1, 2], [3, 4]],
      [[5, 6], [7, 8]],
    ]);

    assert.strictEqual(result.ok, true);
  });

  await t.test('reports error in deeply nested array', () => {
    const validator = v.array(
      v.array(
        v.array(v.number())
      )
    );

    const result = validate(validator, [
      [[1, 2], [3, 'four']],
      [[5, 6], [7, 8]],
    ]);

    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /index 0.*index 1.*index 1/);
    }
  });
});

test('deep nesting - mixed object and array nesting', async (t) => {
  await t.test('validates complex nested structure', () => {
    const validator = v.object({
      users: v.array(
        v.object({
          name: v.string(),
          addresses: v.array(
            v.object({
              street: v.string(),
              city: v.string(),
            })
          ),
        })
      ),
    });

    const result = validate(validator, {
      users: [
        {
          name: 'Alice',
          addresses: [
            { street: '123 Main St', city: 'Springfield' },
            { street: '456 Oak Ave', city: 'Portland' },
          ],
        },
        {
          name: 'Bob',
          addresses: [
            { street: '789 Pine Rd', city: 'Seattle' },
          ],
        },
      ],
    });

    assert.strictEqual(result.ok, true);
  });

  await t.test('reports error in mixed nesting', () => {
    const validator = v.object({
      users: v.array(
        v.object({
          name: v.string(),
          addresses: v.array(
            v.object({
              street: v.string(),
              city: v.string(),
            })
          ),
        })
      ),
    });

    const result = validate(validator, {
      users: [
        {
          name: 'Alice',
          addresses: [
            { street: '123 Main St', city: 'Springfield' },
            { street: 456, city: 'Portland' },  // Error: street is number
          ],
        },
      ],
    });

    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /users.*index 0.*addresses.*index 1.*street/);
    }
  });
});

test('deep nesting - optional and nullable in deep structures', async (t) => {
  await t.test('validates optional fields in nested structure', () => {
    const validator = v.object({
      user: v.object({
        profile: v.object({
          name: v.string(),
          bio: v.optional(v.string()),
        }),
      }),
    });

    const result = validate(validator, {
      user: {
        profile: {
          name: 'Alice',
        },
      },
    });

    assert.strictEqual(result.ok, true);
  });

  await t.test('validates nullable fields in deeply nested array', () => {
    const validator = v.array(
      v.object({
        items: v.array(
          v.nullable(v.string())
        ),
      })
    );

    const result = validate(validator, [
      { items: ['a', null, 'b'] },
      { items: [null, null] },
    ]);

    assert.strictEqual(result.ok, true);
  });
});

test('deep nesting - very large nested structures', async (t) => {
  await t.test('handles large nested object', () => {
    const validator = v.object({
      data: v.object({
        items: v.array(
          v.object({
            id: v.number(),
            name: v.string(),
            metadata: v.object({
              tags: v.array(v.string()),
              properties: v.object({
                visible: v.boolean(),
                priority: v.number(),
              }),
            }),
          })
        ),
      }),
    });

    const largeData = {
      data: {
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          metadata: {
            tags: ['tag1', 'tag2', 'tag3'],
            properties: {
              visible: true,
              priority: i % 10,
            },
          },
        })),
      },
    };

    const result = validate(validator, largeData);
    assert.strictEqual(result.ok, true);
  });
});
