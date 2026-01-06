/**
 * Property Validator - JSON Schema Export Module
 *
 * Converts property-validator schemas to JSON Schema Draft 7.
 * Enables OpenAPI ecosystem compatibility.
 *
 * Both APIs support full introspection:
 *
 * Functional API:
 *   - `string(email(), minLength(5))` → format: 'email', minLength: 5
 *   - `optional(string())` → property not in required array
 *   - `nullable(string())` → type: ['string', 'null']
 *
 * Chainable API:
 *   - `v.string().email().min(5)` → format: 'email', minLength: 5
 *   - `.optional()` / `.nullable()` methods also supported
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

import type { Validator, StringRefinement, NumberRefinement, RefinementJsonSchema } from './types.js';

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
  const isNullable = (validator as any)._isNullable as boolean | undefined;
  const innerValidator = (validator as any)._innerValidator as Validator<unknown> | undefined;

  // Handle nullable() wrapper - add null to type
  // Note: _isOptional is handled at the object level (not adding to required)
  if (isNullable && innerValidator) {
    const innerSchema = convertValidator(innerValidator, options);
    // Add null to the type
    if (innerSchema.type) {
      if (Array.isArray(innerSchema.type)) {
        innerSchema.type = [...innerSchema.type, 'null'];
      } else {
        innerSchema.type = [innerSchema.type, 'null'];
      }
    } else {
      // For schemas without type (anyOf, oneOf, etc.), use anyOf with null
      return {
        anyOf: [innerSchema, { type: 'null' }],
      };
    }
    return innerSchema;
  }

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

  // Primitives - extract refinements if available
  const refinements = (validator as any)._refinements as readonly (StringRefinement | NumberRefinement)[] | undefined;

  if (validatorType === 'string') {
    const schema: JsonSchema = { type: 'string' };
    if (refinements) {
      applyRefinementsToSchema(schema, refinements);
    }
    return schema;
  }

  if (validatorType === 'number') {
    const schema: JsonSchema = { type: 'number' };
    if (refinements) {
      applyRefinementsToSchema(schema, refinements);
    }
    return schema;
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
    // Check for optional wrapper - property should not be required
    const isOptional = (propValidator as any)._isOptional as boolean | undefined;
    const innerValidator = (propValidator as any)._innerValidator as Validator<unknown> | undefined;

    if (isOptional && innerValidator) {
      // Convert the inner validator, not the optional wrapper
      schema.properties![key] = convertValidator(innerValidator, options);
      // Don't add to required - property is optional
    } else {
      // Convert the property validator normally
      schema.properties![key] = convertValidator(propValidator, options);
      // Add to required
      schema.required!.push(key);
    }
  }

  // Remove empty required array for cleaner output
  if (schema.required!.length === 0) {
    delete schema.required;
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

/**
 * Apply refinements to a JSON Schema
 * Extracts jsonSchema metadata from refinements and adds to schema
 */
function applyRefinementsToSchema(
  schema: JsonSchema,
  refinements: readonly (StringRefinement | NumberRefinement)[]
): void {
  for (const refinement of refinements) {
    if (!refinement.jsonSchema) continue;

    const { type, value, format } = refinement.jsonSchema;

    switch (type) {
      // String constraints
      case 'minLength':
        schema.minLength = value as number;
        break;
      case 'maxLength':
        schema.maxLength = value as number;
        break;
      case 'pattern':
        schema.pattern = value as string;
        break;
      case 'format':
        schema.format = format;
        break;

      // Number constraints
      case 'minimum':
        schema.minimum = value as number;
        break;
      case 'maximum':
        schema.maximum = value as number;
        break;
      case 'exclusiveMinimum':
        schema.exclusiveMinimum = value as number;
        break;
      case 'exclusiveMaximum':
        schema.exclusiveMaximum = value as number;
        break;
      case 'multipleOf':
        schema.multipleOf = value as number;
        break;
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export { toJsonSchema as default };
