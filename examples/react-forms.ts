#!/usr/bin/env -S npx tsx
/**
 * React Form Validation Example
 *
 * Demonstrates how to use property-validator with React forms:
 * - Field-level validation (onChange, onBlur)
 * - Form-level validation (onSubmit)
 * - Type-safe form state
 * - Error message display
 * - Async validation
 *
 * This is a conceptual example showing the patterns.
 * In a real React app, you'd use this code with JSX components.
 *
 * Run: npx tsx examples/react-forms.ts
 */

import { validate, v, type Infer } from '../src/index.js';

// ============================================================================
// Form Schemas
// ============================================================================

/**
 * User Registration Form Schema
 */
const UserRegistrationSchema = v.object({
  // Personal Information
  firstName: v.string()
    .refine(s => s.trim().length >= 2, 'First name must be at least 2 characters')
    .refine(s => /^[a-zA-Z\s-']+$/.test(s), 'First name can only contain letters, spaces, hyphens, and apostrophes'),

  lastName: v.string()
    .refine(s => s.trim().length >= 2, 'Last name must be at least 2 characters')
    .refine(s => /^[a-zA-Z\s-']+$/.test(s), 'Last name can only contain letters, spaces, hyphens, and apostrophes'),

  // Contact Information
  email: v.string()
    .refine(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), 'Invalid email format')
    .transform(s => s.toLowerCase()),

  phone: v.string()
    .refine(
      s => /^\+?[1-9]\d{1,14}$/.test(s.replace(/[\s()-]/g, '')),
      'Invalid phone number format (use international format)'
    )
    .optional(),

  // Account Information
  username: v.string()
    .refine(s => s.length >= 3 && s.length <= 20, 'Username must be between 3 and 20 characters')
    .refine(s => /^[a-zA-Z0-9_-]+$/.test(s), 'Username can only contain letters, numbers, underscores, and hyphens')
    .refine(s => /^[a-zA-Z]/.test(s), 'Username must start with a letter'),

  password: v.string()
    .refine(s => s.length >= 8, 'Password must be at least 8 characters')
    .refine(s => /[A-Z]/.test(s), 'Password must contain at least one uppercase letter')
    .refine(s => /[a-z]/.test(s), 'Password must contain at least one lowercase letter')
    .refine(s => /[0-9]/.test(s), 'Password must contain at least one number')
    .refine(s => /[^A-Za-z0-9]/.test(s), 'Password must contain at least one special character'),

  confirmPassword: v.string(),

  // Preferences
  newsletter: v.boolean().default(false),
  terms: v.boolean()
    .refine(b => b === true, 'You must accept the terms and conditions'),

  // Optional fields
  bio: v.string()
    .refine(s => s.length <= 500, 'Bio must be 500 characters or less')
    .optional(),

  website: v.string()
    .refine(
      s => /^https?:\/\/.+\..+/.test(s),
      'Website must be a valid URL starting with http:// or https://'
    )
    .optional(),
}).refine(
  data => data.password === data.confirmPassword,
  'Passwords must match'
);

type UserRegistrationForm = Infer<typeof UserRegistrationSchema>;

/**
 * Login Form Schema
 */
const LoginFormSchema = v.object({
  email: v.string()
    .refine(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), 'Invalid email format'),

  password: v.string()
    .refine(s => s.length > 0, 'Password is required'),

  rememberMe: v.boolean().default(false),
});

type LoginForm = Infer<typeof LoginFormSchema>;

/**
 * Contact Form Schema
 */
const ContactFormSchema = v.object({
  name: v.string()
    .refine(s => s.trim().length >= 2, 'Name must be at least 2 characters'),

  email: v.string()
    .refine(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), 'Invalid email format'),

  subject: v.enum(['general', 'support', 'sales', 'feedback']),

  message: v.string()
    .refine(s => s.trim().length >= 10, 'Message must be at least 10 characters')
    .refine(s => s.trim().length <= 1000, 'Message must be 1000 characters or less'),

  urgent: v.boolean().default(false),
});

type ContactForm = Infer<typeof ContactFormSchema>;

// ============================================================================
// Form Validation Hooks (Conceptual React Hook Pattern)
// ============================================================================

/**
 * Example React hook for form validation
 * (Conceptual - would be used in actual React components)
 */
interface FormState<T> {
  values: Partial<T>;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

class FormValidator<T> {
  private schema: any;
  private state: FormState<T>;

  constructor(schema: any, initialValues: Partial<T> = {}) {
    this.schema = schema;
    this.state = {
      values: initialValues,
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: false,
    };
  }

  /**
   * Validate a single field
   */
  validateField(fieldName: keyof T, value: any): string | null {
    // Create a partial object with just this field
    const fieldData = { [fieldName]: value };

    // For now, validate the entire form and extract this field's error
    const result = validate(this.schema, { ...this.state.values, ...fieldData });

    if (!result.ok) {
      const errorMessage = result.error.message;
      // Extract error for this specific field (simplified)
      if (errorMessage.includes(String(fieldName))) {
        return errorMessage;
      }
    }

    return null;
  }

  /**
   * Validate entire form
   */
  validateForm(values: Partial<T>): { isValid: boolean; errors: Partial<Record<keyof T, string>> } {
    const result = validate(this.schema, values);

    if (result.ok) {
      return { isValid: true, errors: {} };
    }

    // Parse error message to extract field-specific errors
    // In real implementation, you'd enhance ValidationError to provide structured field errors
    const errors: Partial<Record<keyof T, string>> = {};
    const errorMessage = result.error.format('text');

    // Simple parsing (in production, you'd want structured errors from ValidationError)
    Object.keys(values).forEach(key => {
      if (errorMessage.includes(key)) {
        errors[key as keyof T] = errorMessage;
      }
    });

    return { isValid: false, errors };
  }

  /**
   * Handle field change
   */
  handleChange(fieldName: keyof T, value: any): FormState<T> {
    this.state.values[fieldName] = value;

    // Validate on change if field has been touched
    if (this.state.touched[fieldName]) {
      const error = this.validateField(fieldName, value);
      if (error) {
        this.state.errors[fieldName] = error;
      } else {
        delete this.state.errors[fieldName];
      }
    }

    this.state.isValid = Object.keys(this.state.errors).length === 0;
    return { ...this.state };
  }

  /**
   * Handle field blur
   */
  handleBlur(fieldName: keyof T): FormState<T> {
    this.state.touched[fieldName] = true;

    const value = this.state.values[fieldName];
    const error = this.validateField(fieldName, value);

    if (error) {
      this.state.errors[fieldName] = error;
    } else {
      delete this.state.errors[fieldName];
    }

    this.state.isValid = Object.keys(this.state.errors).length === 0;
    return { ...this.state };
  }

  /**
   * Handle form submit
   */
  async handleSubmit(
    values: Partial<T>,
    onSubmit: (values: T) => Promise<void>
  ): Promise<FormState<T>> {
    this.state.isSubmitting = true;

    const { isValid, errors } = this.validateForm(values);

    if (!isValid) {
      this.state.isSubmitting = false;
      this.state.errors = errors;
      this.state.isValid = false;
      return { ...this.state };
    }

    try {
      await onSubmit(values as T);
      this.state.isSubmitting = false;
      this.state.isValid = true;
      return { ...this.state };
    } catch (error) {
      this.state.isSubmitting = false;
      this.state.errors = { _form: 'Submission failed' } as any;
      this.state.isValid = false;
      return { ...this.state };
    }
  }

  getState(): FormState<T> {
    return { ...this.state };
  }
}

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Example 1: Registration Form
 */
async function registrationFormExample(): Promise<void> {
  console.log('🔷 Registration Form Validation Example\n');

  const validator = new FormValidator(UserRegistrationSchema);

  // Simulate user input
  const formData: Partial<UserRegistrationForm> = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    username: 'johndoe',
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
    terms: true,
    newsletter: false,
  };

  // Validate form on submit
  const result = validate(UserRegistrationSchema, formData);

  if (result.ok) {
    console.log('✅ Registration form valid!\n');
    console.log('Validated data:', JSON.stringify(result.value, null, 2));
  } else {
    console.log('❌ Registration form invalid!\n');
    console.log(result.error.format('text'));
  }

  console.log('\n' + '─'.repeat(60) + '\n');
}

/**
 * Example 2: Login Form with Field Validation
 */
async function loginFormExample(): Promise<void> {
  console.log('🔷 Login Form Validation Example\n');

  const validator = new FormValidator<LoginForm>(LoginFormSchema);

  // Test valid input
  console.log('Test 1: Valid login credentials');
  const state1 = validator.handleChange('email', 'user@example.com');
  const state2 = validator.handleChange('password', 'mypassword');
  console.log('Form state:', state1.isValid ? '✅ Valid' : '❌ Invalid');

  // Test invalid email
  console.log('\nTest 2: Invalid email format');
  const state3 = validator.handleChange('email', 'invalid-email');
  const state4 = validator.handleBlur('email');
  if (state4.errors.email) {
    console.log('Email error:', state4.errors.email);
  }

  console.log('\n' + '─'.repeat(60) + '\n');
}

/**
 * Example 3: Contact Form with Validation
 */
async function contactFormExample(): Promise<void> {
  console.log('🔷 Contact Form Validation Example\n');

  // Test 1: Valid contact form
  console.log('Test 1: Valid contact form');
  const validForm: ContactForm = {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    subject: 'support',
    message: 'I need help with my account setup.',
    urgent: false,
  };

  const result1 = validate(ContactFormSchema, validForm);
  console.log(result1.ok ? '✅ Valid' : '❌ Invalid');

  // Test 2: Invalid contact form (message too short)
  console.log('\nTest 2: Invalid message (too short)');
  const invalidForm = {
    ...validForm,
    message: 'Help',
  };

  const result2 = validate(ContactFormSchema, invalidForm);
  if (!result2.ok) {
    console.log('Error:', result2.error.format('text'));
  }

  // Test 3: Invalid subject
  console.log('\nTest 3: Invalid subject');
  const invalidSubject = {
    ...validForm,
    subject: 'invalid-subject',
  };

  const result3 = validate(ContactFormSchema, invalidSubject);
  if (!result3.ok) {
    console.log('Error:', result3.error.format('text'));
  }

  console.log('\n' + '─'.repeat(60) + '\n');
}

/**
 * Example 4: Async Validation (e.g., checking username availability)
 */
async function asyncValidationExample(): Promise<void> {
  console.log('🔷 Async Validation Example (Username Availability)\n');

  // Simulated async validator
  async function checkUsernameAvailability(username: string): Promise<boolean> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));

    const takenUsernames = ['admin', 'johndoe', 'janedoe'];
    return !takenUsernames.includes(username.toLowerCase());
  }

  const username = 'johndoe';
  console.log(`Checking if username "${username}" is available...`);

  const isAvailable = await checkUsernameAvailability(username);
  console.log(isAvailable ? '✅ Username is available' : '❌ Username is already taken');

  console.log('\n' + '─'.repeat(60) + '\n');
}

/**
 * Example 5: Form Error Display Pattern
 */
function errorDisplayExample(): void {
  console.log('🔷 Error Display Pattern Example\n');

  const invalidData = {
    firstName: 'J', // Too short
    lastName: 'Doe',
    email: 'invalid-email', // Invalid format
    username: '123', // Doesn't start with letter
    password: 'weak', // Doesn't meet requirements
    confirmPassword: 'different', // Doesn't match
    terms: false, // Not accepted
  };

  const result = validate(UserRegistrationSchema, invalidData);

  if (!result.ok) {
    console.log('❌ Form validation failed:\n');

    // Display formatted error
    console.log(result.error.format('text'));

    console.log('\n💡 In a React component, you would:');
    console.log('   1. Parse the error message to extract field-specific errors');
    console.log('   2. Display errors below each form field');
    console.log('   3. Highlight invalid fields with red borders');
    console.log('   4. Disable submit button until all errors are resolved');
  }

  console.log('\n' + '─'.repeat(60) + '\n');
}

// ============================================================================
// Main Function
// ============================================================================

async function main(): Promise<void> {
  console.log('📝 React Form Validation Examples with Property Validator\n');
  console.log('═'.repeat(60) + '\n');

  await registrationFormExample();
  await loginFormExample();
  await contactFormExample();
  await asyncValidationExample();
  errorDisplayExample();

  console.log('💡 Integration Tips:\n');
  console.log('   • Use FormValidator class with React state hooks');
  console.log('   • Validate onChange for real-time feedback');
  console.log('   • Validate onBlur to show errors after user leaves field');
  console.log('   • Validate onSubmit for final form validation');
  console.log('   • Enhance ValidationError to return field-specific errors');
  console.log('   • Combine with React Query for async validation');
  console.log('\n📖 See the source code for complete implementation patterns.');
}

main();
