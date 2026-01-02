#!/usr/bin/env -S npx tsx
/**
 * API Server Validation Example
 *
 * Demonstrates how to use property-validator in an HTTP API server:
 * - Request body validation middleware
 * - Query parameter validation
 * - Path parameter validation
 * - Type-safe request handlers
 * - Clear error responses
 *
 * This example uses Node.js http module (zero dependencies).
 * The same patterns work with Express, Fastify, Koa, etc.
 *
 * Run: npx tsx examples/api-server.ts
 * Test: curl http://localhost:3000/api/users
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { validate, v, type Infer } from '../src/index.js';

// ============================================================================
// Validation Schemas
// ============================================================================

// User schema
const UserSchema = v.object({
  id: v.string().refine(s => s.length > 0, 'ID cannot be empty'),
  name: v.string().refine(s => s.length >= 2, 'Name must be at least 2 characters'),
  email: v.string().refine(
    s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
    'Invalid email format'
  ),
  age: v.number()
    .refine(n => Number.isInteger(n), 'Age must be an integer')
    .refine(n => n >= 0 && n <= 150, 'Age must be between 0 and 150')
    .optional(),
  role: v.enum(['admin', 'user', 'guest']).default('user'),
  active: v.boolean().default(true),
});

type User = Infer<typeof UserSchema>;

// Create user request body
const CreateUserBodySchema = v.object({
  name: v.string().refine(s => s.trim().length >= 2, 'Name must be at least 2 characters'),
  email: v.string().refine(
    s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
    'Invalid email format'
  ),
  age: v.number()
    .refine(n => Number.isInteger(n), 'Age must be an integer')
    .refine(n => n >= 0 && n <= 150, 'Age must be between 0 and 150')
    .optional(),
  role: v.enum(['admin', 'user', 'guest']).optional(),
});

type CreateUserBody = Infer<typeof CreateUserBodySchema>;

// Update user request body (all fields optional except at least one must be present)
const UpdateUserBodySchema = v.object({
  name: v.string().refine(s => s.trim().length >= 2, 'Name must be at least 2 characters').optional(),
  email: v.string().refine(
    s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
    'Invalid email format'
  ).optional(),
  age: v.number()
    .refine(n => Number.isInteger(n), 'Age must be an integer')
    .refine(n => n >= 0 && n <= 150, 'Age must be between 0 and 150')
    .optional(),
  role: v.enum(['admin', 'user', 'guest']).optional(),
  active: v.boolean().optional(),
}).refine(
  obj => Object.keys(obj).length > 0,
  'At least one field must be provided for update'
);

type UpdateUserBody = Infer<typeof UpdateUserBodySchema>;

// Query parameters for list users
const ListUsersQuerySchema = v.object({
  page: v.string()
    .transform(s => parseInt(s, 10))
    .refine(n => n > 0, 'Page must be positive')
    .default('1'),
  limit: v.string()
    .transform(s => parseInt(s, 10))
    .refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100')
    .default('10'),
  role: v.enum(['admin', 'user', 'guest']).optional(),
  active: v.string()
    .transform(s => s === 'true')
    .optional(),
});

type ListUsersQuery = Infer<typeof ListUsersQuerySchema>;

// ============================================================================
// In-Memory Database (for demonstration)
// ============================================================================

const users: Map<string, User> = new Map();
let nextId = 1;

// Seed some data
users.set('1', { id: '1', name: 'Alice', email: 'alice@example.com', age: 30, role: 'admin', active: true });
users.set('2', { id: '2', name: 'Bob', email: 'bob@example.com', age: 25, role: 'user', active: true });
users.set('3', { id: '3', name: 'Charlie', email: 'charlie@example.com', role: 'guest', active: false });

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate request body
 */
async function validateBody<T>(
  req: IncomingMessage,
  schema: any
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      if (!body || body.trim() === '') {
        resolve({ ok: false, error: 'Request body is required' });
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        resolve({ ok: false, error: 'Invalid JSON in request body' });
        return;
      }

      const result = validate(schema, parsed);
      if (result.ok) {
        resolve({ ok: true, value: result.value as T });
      } else {
        resolve({ ok: false, error: result.error.format('text') });
      }
    });
  });
}

/**
 * Validate query parameters
 */
function validateQuery<T>(
  url: string,
  schema: any
): { ok: true; value: T } | { ok: false; error: string } {
  const urlObj = new URL(url, 'http://localhost');
  const params: any = {};

  for (const [key, value] of urlObj.searchParams) {
    params[key] = value;
  }

  const result = validate(schema, params);
  if (result.ok) {
    return { ok: true, value: result.value as T };
  } else {
    return { ok: false, error: result.error.format('text') };
  }
}

/**
 * Send JSON response
 */
function sendJSON(res: ServerResponse, statusCode: number, data: any): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Send error response
 */
function sendError(res: ServerResponse, statusCode: number, message: string): void {
  sendJSON(res, statusCode, { error: message });
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/users - List users with pagination and filtering
 */
async function listUsers(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const queryResult = validateQuery<ListUsersQuery>(req.url!, ListUsersQuerySchema);

  if (!queryResult.ok) {
    sendError(res, 400, queryResult.error);
    return;
  }

  const { page, limit, role, active } = queryResult.value;

  // Filter users
  let filtered = Array.from(users.values());

  if (role !== undefined) {
    filtered = filtered.filter(u => u.role === role);
  }

  if (active !== undefined) {
    filtered = filtered.filter(u => u.active === active);
  }

  // Paginate
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginated = filtered.slice(start, end);

  sendJSON(res, 200, {
    data: paginated,
    meta: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit),
    },
  });
}

/**
 * GET /api/users/:id - Get user by ID
 */
async function getUser(req: IncomingMessage, res: ServerResponse, id: string): Promise<void> {
  const user = users.get(id);

  if (!user) {
    sendError(res, 404, `User not found: ${id}`);
    return;
  }

  sendJSON(res, 200, { data: user });
}

/**
 * POST /api/users - Create new user
 */
async function createUser(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const bodyResult = await validateBody<CreateUserBody>(req, CreateUserBodySchema);

  if (!bodyResult.ok) {
    sendError(res, 400, bodyResult.error);
    return;
  }

  const { name, email, age, role } = bodyResult.value;

  // Check for duplicate email
  for (const user of users.values()) {
    if (user.email === email) {
      sendError(res, 409, `User with email ${email} already exists`);
      return;
    }
  }

  // Create user
  const newUser: User = {
    id: String(nextId++),
    name,
    email,
    age,
    role: role ?? 'user',
    active: true,
  };

  users.set(newUser.id, newUser);

  sendJSON(res, 201, { data: newUser });
}

/**
 * PATCH /api/users/:id - Update user
 */
async function updateUser(req: IncomingMessage, res: ServerResponse, id: string): Promise<void> {
  const user = users.get(id);

  if (!user) {
    sendError(res, 404, `User not found: ${id}`);
    return;
  }

  const bodyResult = await validateBody<UpdateUserBody>(req, UpdateUserBodySchema);

  if (!bodyResult.ok) {
    sendError(res, 400, bodyResult.error);
    return;
  }

  // Update user
  const updated: User = {
    ...user,
    ...bodyResult.value,
  };

  users.set(id, updated);

  sendJSON(res, 200, { data: updated });
}

/**
 * DELETE /api/users/:id - Delete user
 */
async function deleteUser(req: IncomingMessage, res: ServerResponse, id: string): Promise<void> {
  const user = users.get(id);

  if (!user) {
    sendError(res, 404, `User not found: ${id}`);
    return;
  }

  users.delete(id);

  sendJSON(res, 204, null);
}

// ============================================================================
// Router
// ============================================================================

async function router(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method;
  const url = req.url!;

  // CORS headers (for testing from browser)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Routes
  if (method === 'GET' && url === '/') {
    sendJSON(res, 200, {
      message: 'API Server Example - Property Validator',
      endpoints: {
        'GET /api/users': 'List users (supports ?page=1&limit=10&role=admin&active=true)',
        'GET /api/users/:id': 'Get user by ID',
        'POST /api/users': 'Create user (body: { name, email, age?, role? })',
        'PATCH /api/users/:id': 'Update user (body: { name?, email?, age?, role?, active? })',
        'DELETE /api/users/:id': 'Delete user',
      },
    });
    return;
  }

  if (method === 'GET' && url.startsWith('/api/users/') && url.split('/').length === 4) {
    const id = url.split('/')[3];
    await getUser(req, res, id);
    return;
  }

  if (method === 'GET' && (url === '/api/users' || url.startsWith('/api/users?'))) {
    await listUsers(req, res);
    return;
  }

  if (method === 'POST' && url === '/api/users') {
    await createUser(req, res);
    return;
  }

  if (method === 'PATCH' && url.startsWith('/api/users/') && url.split('/').length === 4) {
    const id = url.split('/')[3];
    await updateUser(req, res, id);
    return;
  }

  if (method === 'DELETE' && url.startsWith('/api/users/') && url.split('/').length === 4) {
    const id = url.split('/')[3];
    await deleteUser(req, res, id);
    return;
  }

  // 404
  sendError(res, 404, 'Not Found');
}

// ============================================================================
// Server
// ============================================================================

const PORT = 3000;

const server = createServer(async (req, res) => {
  try {
    await router(req, res);
  } catch (error) {
    console.error('Server error:', error);
    sendError(res, 500, 'Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 API Server Example running on http://localhost:${PORT}`);
  console.log('\n📖 Try these requests:\n');
  console.log(`   curl http://localhost:${PORT}/api/users`);
  console.log(`   curl http://localhost:${PORT}/api/users/1`);
  console.log(`   curl http://localhost:${PORT}/api/users?role=admin&limit=5`);
  console.log(`   curl -X POST http://localhost:${PORT}/api/users -H "Content-Type: application/json" -d '{"name":"Dave","email":"dave@example.com","age":28}'`);
  console.log(`   curl -X PATCH http://localhost:${PORT}/api/users/1 -H "Content-Type: application/json" -d '{"age":31}'`);
  console.log(`   curl -X DELETE http://localhost:${PORT}/api/users/3`);
  console.log('\n💡 Test invalid requests to see validation errors:');
  console.log(`   curl -X POST http://localhost:${PORT}/api/users -H "Content-Type: application/json" -d '{"name":"X","email":"invalid"}'`);
  console.log(`   curl http://localhost:${PORT}/api/users?page=-1`);
  console.log('\nPress Ctrl+C to stop the server.');
});
