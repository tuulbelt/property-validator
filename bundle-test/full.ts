
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
