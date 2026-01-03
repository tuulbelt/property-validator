#!/usr/bin/env -S npx tsx
/**
 * CLI Configuration Validation Example
 *
 * Demonstrates how to use property-validator for CLI application configuration:
 * - Load config from multiple sources (file, env vars, CLI args)
 * - Validate and merge configuration with defaults
 * - Type-safe configuration access
 * - Clear error messages for invalid config
 *
 * Run: npx tsx examples/cli-config.ts
 */

import { validate, v, type Infer } from '../src/index.js';
import { readFileSync, existsSync } from 'node:fs';

// Define configuration schema
const ConfigSchema = v.object({
  // Server configuration
  server: v.object({
    port: v.number()
      .refine(n => n > 0 && n < 65536, 'Port must be between 1 and 65535')
      .default(3000),
    host: v.string().default('localhost'),
    protocol: v.enum(['http', 'https']).default('http'),
  }).default({}),

  // Database configuration
  database: v.object({
    url: v.string()
      .refine(s => s.startsWith('postgresql://') || s.startsWith('mysql://'),
        'Database URL must start with postgresql:// or mysql://'),
    poolSize: v.number()
      .refine(n => n > 0 && n <= 100, 'Pool size must be between 1 and 100')
      .default(10),
    ssl: v.boolean().default(false),
  }).optional(),

  // Logging configuration
  logging: v.object({
    level: v.enum(['debug', 'info', 'warn', 'error']).default('info'),
    format: v.enum(['json', 'text']).default('text'),
    destination: v.union([
      v.literal('stdout'),
      v.literal('stderr'),
      v.string().refine(s => s.endsWith('.log'), 'Log file must end with .log')
    ]).default('stdout'),
  }).default({}),

  // Feature flags
  features: v.object({
    enableMetrics: v.boolean().default(false),
    enableTracing: v.boolean().default(false),
    enableCache: v.boolean().default(true),
    maxCacheSize: v.number()
      .refine(n => n > 0, 'Max cache size must be positive')
      .default(1000),
  }).default({}),

  // Environment
  environment: v.enum(['development', 'staging', 'production']).default('development'),
});

// Infer TypeScript type from schema
type Config = Infer<typeof ConfigSchema>;

/**
 * Load configuration from JSON file
 */
function loadConfigFile(filePath: string): unknown {
  if (!existsSync(filePath)) {
    return {};
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to parse config file ${filePath}:`, error);
    return {};
  }
}

/**
 * Load configuration from environment variables
 * Maps environment variables to config structure:
 * - APP_SERVER_PORT -> server.port
 * - APP_DATABASE_URL -> database.url
 * - APP_LOG_LEVEL -> logging.level
 */
function loadConfigFromEnv(): unknown {
  const config: any = {};

  // Server configuration
  if (process.env.APP_SERVER_PORT) {
    config.server = config.server || {};
    config.server.port = parseInt(process.env.APP_SERVER_PORT, 10);
  }
  if (process.env.APP_SERVER_HOST) {
    config.server = config.server || {};
    config.server.host = process.env.APP_SERVER_HOST;
  }
  if (process.env.APP_SERVER_PROTOCOL) {
    config.server = config.server || {};
    config.server.protocol = process.env.APP_SERVER_PROTOCOL;
  }

  // Database configuration
  if (process.env.APP_DATABASE_URL) {
    config.database = config.database || {};
    config.database.url = process.env.APP_DATABASE_URL;
  }
  if (process.env.APP_DATABASE_POOL_SIZE) {
    config.database = config.database || {};
    config.database.poolSize = parseInt(process.env.APP_DATABASE_POOL_SIZE, 10);
  }
  if (process.env.APP_DATABASE_SSL) {
    config.database = config.database || {};
    config.database.ssl = process.env.APP_DATABASE_SSL === 'true';
  }

  // Logging configuration
  if (process.env.APP_LOG_LEVEL) {
    config.logging = config.logging || {};
    config.logging.level = process.env.APP_LOG_LEVEL;
  }
  if (process.env.APP_LOG_FORMAT) {
    config.logging = config.logging || {};
    config.logging.format = process.env.APP_LOG_FORMAT;
  }

  // Environment
  if (process.env.APP_ENVIRONMENT || process.env.NODE_ENV) {
    config.environment = process.env.APP_ENVIRONMENT || process.env.NODE_ENV;
  }

  // Feature flags
  if (process.env.APP_FEATURE_METRICS) {
    config.features = config.features || {};
    config.features.enableMetrics = process.env.APP_FEATURE_METRICS === 'true';
  }
  if (process.env.APP_FEATURE_TRACING) {
    config.features = config.features || {};
    config.features.enableTracing = process.env.APP_FEATURE_TRACING === 'true';
  }

  return config;
}

/**
 * Merge multiple config sources (later sources override earlier ones)
 */
function mergeConfigs(...configs: any[]): unknown {
  const merged: any = {};

  for (const config of configs) {
    for (const key in config) {
      if (config[key] && typeof config[key] === 'object' && !Array.isArray(config[key])) {
        merged[key] = { ...merged[key], ...config[key] };
      } else {
        merged[key] = config[key];
      }
    }
  }

  return merged;
}

/**
 * Load and validate configuration
 */
function loadConfig(): Config {
  // Load from different sources (priority: CLI args > env vars > config file > defaults)
  const fileConfig = loadConfigFile('./config.json');
  const envConfig = loadConfigFromEnv();
  const cliConfig = parseCLIArgs();

  // Merge configurations
  const rawConfig = mergeConfigs(fileConfig, envConfig, cliConfig);

  // Validate merged configuration
  const result = validate(ConfigSchema, rawConfig);

  if (!result.ok) {
    console.error('❌ Configuration validation failed:\n');
    console.error(result.error.format('text'));
    process.exit(1);
  }

  console.log('✅ Configuration validated successfully!\n');
  return result.value;
}

/**
 * Parse CLI arguments (simple example)
 */
function parseCLIArgs(): unknown {
  const args = process.argv.slice(2);
  const config: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--port' && args[i + 1]) {
      config.server = config.server || {};
      config.server.port = parseInt(args[++i], 10);
    } else if (arg === '--host' && args[i + 1]) {
      config.server = config.server || {};
      config.server.host = args[++i];
    } else if (arg === '--env' && args[i + 1]) {
      config.environment = args[++i];
    } else if (arg === '--log-level' && args[i + 1]) {
      config.logging = config.logging || {};
      config.logging.level = args[++i];
    } else if (arg === '--db-url' && args[i + 1]) {
      config.database = config.database || {};
      config.database.url = args[++i];
    }
  }

  return config;
}

/**
 * Display configuration
 */
function displayConfig(config: Config): void {
  console.log('📋 Current Configuration:');
  console.log('━'.repeat(50));

  console.log('\n🖥️  Server:');
  console.log(`   Protocol: ${config.server.protocol}`);
  console.log(`   Host:     ${config.server.host}`);
  console.log(`   Port:     ${config.server.port}`);
  console.log(`   URL:      ${config.server.protocol}://${config.server.host}:${config.server.port}`);

  if (config.database) {
    console.log('\n💾 Database:');
    console.log(`   URL:       ${config.database.url}`);
    console.log(`   Pool Size: ${config.database.poolSize}`);
    console.log(`   SSL:       ${config.database.ssl ? 'enabled' : 'disabled'}`);
  } else {
    console.log('\n💾 Database: not configured');
  }

  console.log('\n📝 Logging:');
  console.log(`   Level:       ${config.logging.level}`);
  console.log(`   Format:      ${config.logging.format}`);
  console.log(`   Destination: ${config.logging.destination}`);

  console.log('\n🚀 Features:');
  console.log(`   Metrics:    ${config.features.enableMetrics ? '✅' : '❌'}`);
  console.log(`   Tracing:    ${config.features.enableTracing ? '✅' : '❌'}`);
  console.log(`   Cache:      ${config.features.enableCache ? '✅' : '❌'}`);
  console.log(`   Cache Size: ${config.features.maxCacheSize}`);

  console.log(`\n🌍 Environment: ${config.environment}`);
  console.log('━'.repeat(50));
}

/**
 * Main function
 */
function main(): void {
  console.log('🔧 CLI Configuration Validation Example\n');

  // Load and validate configuration
  const config = loadConfig();

  // Display final configuration
  displayConfig(config);

  console.log('\n💡 Try these examples:');
  console.log('   npx tsx examples/cli-config.ts --port 8080');
  console.log('   npx tsx examples/cli-config.ts --env production --log-level error');
  console.log('   APP_SERVER_PORT=9000 npx tsx examples/cli-config.ts');
  console.log('   APP_DATABASE_URL=postgresql://localhost/mydb npx tsx examples/cli-config.ts');
  console.log('\n📖 Create a config.json file in the project root to override defaults:');
  console.log('   {');
  console.log('     "server": { "port": 5000 },');
  console.log('     "logging": { "level": "debug" }');
  console.log('   }');
}

main();
