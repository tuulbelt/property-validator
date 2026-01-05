
import { string, email, validate } from '../src/index.js';

const schema = string(email());
console.log(validate(schema, 'test@test.com'));
