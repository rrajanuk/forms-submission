import fs from 'fs';
import path from 'path';
import db from '../database';

const MIGRATIONS_TABLE = '_migrations';

/**
 * Initialize migrations tracking table
 */
function ensureMigrationsTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at INTEGER NOT NULL
    )
  `);
}

/**
 * Check if a migration has already been executed
 */
function isMigrationExecuted(migrationName: string): boolean {
  const row = db
    .prepare('SELECT 1 FROM _migrations WHERE name = ?')
    .get(migrationName) as { id: number } | undefined;
  return !!row;
}

/**
 * Record that a migration has been executed
 */
function recordMigration(migrationName: string): void {
  db.prepare('INSERT INTO _migrations (name, executed_at) VALUES (?, ?)')
    .bind(migrationName, Date.now())
    .run();
}

/**
 * Execute a single migration file
 */
function executeMigration(migrationPath: string, migrationName: string): void {
  console.log(`  Executing migration: ${migrationName}`);
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  db.exec(migrationSQL);
  recordMigration(migrationName);
  console.log(`  ✓ Migration ${migrationName} completed`);
}

/**
 * Run all pending migrations
 */
export function runMigrations(): void {
  console.log('Running database migrations...');

  // Ensure migrations table exists
  ensureMigrationsTable();

  // Run base schema.sql first for backward compatibility
  const baseSchemaPath = path.join(__dirname, '..', 'schema.sql');
  if (fs.existsSync(baseSchemaPath)) {
    const baseSchemaName = 'base_schema';
    if (!isMigrationExecuted(baseSchemaName)) {
      console.log('  Executing base schema.sql...');
      const schemaSQL = fs.readFileSync(baseSchemaPath, 'utf-8');
      db.exec(schemaSQL);
      recordMigration(baseSchemaName);
      console.log('  ✓ Base schema completed');
    }
  }

  // Get all migration files
  const migrationsDir = __dirname; // Already in the migrations directory
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found');
    return;
  }

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Execute in filename order

  if (migrationFiles.length === 0) {
    console.log('No migration files found');
    return;
  }

  // Run each pending migration
  let executedCount = 0;
  for (const file of migrationFiles) {
    const migrationName = path.basename(file, '.sql');
    const migrationPath = path.join(migrationsDir, file);

    if (!isMigrationExecuted(migrationName)) {
      executeMigration(migrationPath, migrationName);
      executedCount++;
    } else {
      console.log(`  Skipping already executed: ${migrationName}`);
    }
  }

  console.log(`Migrations completed successfully! (${executedCount} new)`);
}

/**
 * Get list of executed migrations
 */
export function getExecutedMigrations(): { name: string; executed_at: number }[] {
  return db.prepare('SELECT name, executed_at FROM _migrations ORDER BY id').all() as {
    name: string;
    executed_at: number;
  }[];
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations();
  process.exit(0);
}
