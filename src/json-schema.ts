/**
 * Property Validator - JSON Schema Export Module
 *
 * Converts property-validator schemas to JSON Schema Draft 7.
 * Enables OpenAPI ecosystem compatibility.
 *
 * Note: Refinement constraints (min, max, email, etc.) are not exported to
 * JSON Schema because they're stored internally and not accessible for
 * introspection. Only structural types are converted.
 *
 * @example
 * ```typescript
 * import { toJsonSchema } from 'property-validator/json-schema';
 *
 * const UserSchema = v.object({
 *   name: v.string(),
 *   age: v.number(),
 *   email: v.optional(v.string())
 * });
 *
 * const jsonSchema = toJsonSchema(UserSchema);
 * // {
 * //   type: 'object',
 * //   properties: {
 * //     name: { type: 'string' },
 * //     age: { type: 'number' },
 * //     email: { type: 'string' }
 * //   },
 * //   required: ['name', 'age']
 * // }
 * ```
 *
 * @module json-schema
 * @since v0.13.0
 */

import type { Validator } from './types.js';

// ============================================================================
// JSON Schema Types (Draft 7)
// ============================================================================

/**
 * JSON Schema Draft 7 type definition
 */
export interface JsonSchema {
  // Core keywords
  $schema?: string;
  $id?: string;
  $ref?: string;
  $defs?: Record<string, JsonSchema>;

  // Type keywords
  type?: JsonSchemaType | JsonSchemaType[];
  const?: unknown;
  enum?: unknown[];

  // String keywords
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;

  // Number keywords
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;

  // Array keywords
  items?: JsonSchema | JsonSchema[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  additionalItems?: JsonSchema | boolean;

  // Object keywords
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: JsonSchema | boolean;
  propertyNames?: JsonSchema;
  minProperties?: number;
  maxProperties?: number;
  patternProperties?: Record<string, JsonSchema>;

  // Composition keywords
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  not?: JsonSchema;

  // Conditional keywords
  if?: JsonSchema;
  then?: JsonSchema;
  else?: JsonSchema;

  // Metadata keywords
  title?: string;
  description?: string;
  default?: unknown;
  examples?: unknown[];

  // Allow additional properties for extensibility
  [key: string]: unknown;
}

export type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

// ============================================================================
// Conversion Options
// ============================================================================

/**
 * Options for JSON Schema conversion
 */
export interface ToJsonSchemaOptions {
  /**
   * Include $schema declaration
   * @default true
   */
  includeSchema?: boolean;

  /**
   * JSON Schema draft to use
   * @default 'http://json-schema.org/draft-07/schema#'
   */
  draft?: string;

  /**
   * How to handle unknown validator types
   * @default 'any'
   */
  unknownTypeHandling?: 'any' | 'throw' | 'empty';

  /**
   * Include title/description from validator metadata if available
   * @default false
   */
  includeMetadata?: boolean;
}

const DEFAULT_OPTIONS: Required<ToJsonSchemaOptions> = {
  includeSchema: true,
  draft: 'http://json-schema.org/draft-07/schema#',
  unknownTypeHandling: 'any',
  includeMetadata: false,
};

// ============================================================================
// Main Conversion Function
// ============================================================================

/**
 * Convert a property-validator schema to JSON Schema Draft 7
 *
 * @param validator - The validator to convert
 * @param options - Conversion options
 * @returns JSON Schema representation
 *
 * @example
 * ```typescript
 * const schema = v.object({
 *   name: v.string(),
 *   age: v.number(),
 *   email: v.optional(v.string()),
 *   role: v.union([v.literal('admin'), v.literal('user')])
 * });
 *
 * const jsonSchema = toJsonSchema(schema);
 * ```
 */
export function toJsonSchema(
  validator: Validator<unknown>,
  options: ToJsonSchemaOptions = {}
): JsonSchema {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const schema = convertValidator(validator, opts);

  // Add $schema declaration at root level
  if (opts.includeSchema && !schema.$schema) {
    return {
      $schema: opts.draft,
      ...schema,
    };
  }

  return schema;
}

// ============================================================================
// Internal Conversion Logic
// ============================================================================

/**
 * Convert a validator to JSON Schema (recursive)
 */
function convertValidator(
  validator: Validator<unknown>,
  options: Required<ToJsonSchemaOptions>
): JsonSchema {
  // Check for known validator types via internal properties
  const validatorType = (validator as any)._type as string | undefined;
  const shape = (validator as any)._shape as Record<string, Validator<unknown>> | undefined;
  const literalValue = (validator as any)._literalValue as unknown;
  const enumValues = (validator as any)._enumValues as unknown[] | undefined;
  const itemValidator = (validator as any)._itemValidator as Validator<unknown> | undefined;
  const validators = (validator as any)._validators as Validator<unknown>[] | undefined;
  const tupleValidators = (validator as any)._tupleValidators as Validator<unknown>[] | undefined;
  const keyValidator = (validator as any)._keyValidator as Validator<unknown> | undefined;
  const valueValidator = (validator as any)._valueValidator as Validator<unknown> | undefined;
  const discriminator = (validator as any)._discriminator as string | undefined;
  const variantMap = (validator as any)._variantMap as Map<unknown, Validator<unknown>> | undefined;

  // Note: optional/nullable/nullish wrappers don't expose internal metadata,
  // so they cannot be detected and handled specially.

  // Discriminated union
  if (discriminator && variantMap) {
    return convertDiscriminatedUnion(discriminator, variantMap, options);
  }

  // Literal values
  if (literalValue !== undefined) {
    return { const: literalValue };
  }

  // Enum values
  if (enumValues !== undefined) {
    return { enum: enumValues };
  }

  // Tuple
  if (tupleValidators) {
    return convertTuple(tupleValidators, options);
  }

  // Array
  if (itemValidator) {
    return convertArray(itemValidator, options);
  }

  // Record (dynamic keys)
  if (keyValidator && valueValidator) {
    return convertRecord(keyValidator, valueValidator, options);
  }

  // Object with shape
  if (shape) {
    return convertObject(shape, options);
  }

  // Union
  if (validators) {
    return convertUnion(validators, options);
  }

  // Primitives - note: refinements not exported since they're internal
  if (validatorType === 'string') {
    return { type: 'string' };
  }

  if (validatorType === 'number') {
    return { type: 'number' };
  }

  if (validatorType === 'boolean') {
    return { type: 'boolean' };
  }

  // Unknown type handling
  switch (options.unknownTypeHandling) {
    case 'throw':
      throw new Error(`Cannot convert unknown validator type to JSON Schema`);
    case 'empty':
      return {};
    case 'any':
    default:
      return {}; // Empty schema accepts anything
  }
}

// ============================================================================
// Type-Specific Converters
// ============================================================================

/**
 * Convert object validator
 */
function convertObject(
  shape: Record<string, Validator<unknown>>,
  options: Required<ToJsonSchemaOptions>
): JsonSchema {
  const schema: JsonSchema = {
    type: 'object',
    properties: {},
    required: [],
  };

  for (const [key, propValidator] of Object.entries(shape)) {
    // Convert the property validator
    schema.properties![key] = convertValidator(propValidator, options);

    // All properties are required (optional/nullable wrappers can't be detected)
    schema.required!.push(key);
  }

  return schema;
}

/**
 * Convert array validator
 */
function convertArray(
  itemValidator: Validator<unknown>,
  options: Required<ToJsonSchemaOptions>
): JsonSchema {
  return {
    type: 'array',
    items: convertValidator(itemValidator, options),
  };
}

/**
 * Convert tuple validator
 */
function convertTuple(
  validators: Validator<unknown>[],
  options: Required<ToJsonSchemaOptions>
): JsonSchema {
  return {
    type: 'array',
    items: validators.map(v => convertValidator(v, options)),
    minItems: validators.length,
    maxItems: validators.length,
  };
}

/**
 * Convert union validator
 */
function convertUnion(
  validators: Validator<unknown>[],
  options: Required<ToJsonSchemaOptions>
): JsonSchema {
  // Check if all validators are literals - convert to enum
  const allLiterals = validators.every(v => (v as any)._literalValue !== undefined);

  if (allLiterals) {
    return {
      enum: validators.map(v => (v as any)._literalValue),
    };
  }

  // Use anyOf for general unions
  return {
    anyOf: validators.map(v => convertValidator(v, options)),
  };
}

/**
 * Convert discriminated union validator
 */
function convertDiscriminatedUnion(
  discriminator: string,
  variantMap: Map<unknown, Validator<unknown>>,
  options: Required<ToJsonSchemaOptions>
): JsonSchema {
  const schemas: JsonSchema[] = [];

  for (const [discriminatorValue, validator] of variantMap) {
    const variantSchema = convertValidator(validator, options);

    // Ensure the discriminator property has the correct const value
    if (variantSchema.properties) {
      variantSchema.properties[discriminator] = { const: discriminatorValue };
    }

    schemas.push(variantSchema);
  }

  // Use oneOf for discriminated unions (exactly one must match)
  return {
    oneOf: schemas,
  };
}

/**
 * Convert record validator (dynamic keys)
 */
function convertRecord(
  keyValidator: Validator<unknown>,
  valueValidator: Validator<unknown>,
  options: Required<ToJsonSchemaOptions>
): JsonSchema {
  const schema: JsonSchema = {
    type: 'object',
    additionalProperties: convertValidator(valueValidator, options),
  };

  // Add propertyNames if key validator is string-based
  const keyType = (keyValidator as any)._type as string | undefined;
  if (keyType === 'string') {
    schema.propertyNames = { type: 'string' };
  }

  return schema;
}

// ============================================================================
// Exports
// ============================================================================

export { toJsonSchema as default };
