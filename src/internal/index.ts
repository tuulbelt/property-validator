/**
 * Internal utilities - re-exports for internal use only
 * @internal
 */

export {
  // Utility functions
  getTypeName,
  extractExpectedType,
  EMPTY_PATH,
  ensureMutablePath,

  // Shared primitive validators
  validateString,
  stringError,
  validateNumber,
  numberError,
  validateBoolean,
  booleanError,

  // Core validation engine
  validateWithPath,
  validateFast,

  // Validator factory
  createValidator,
} from './core.js';
