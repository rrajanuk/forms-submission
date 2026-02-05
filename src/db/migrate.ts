import { runMigrations, getExecutedMigrations } from './migrations/migration_runner';

// Re-export for backward compatibility
export { runMigrations as migrate, getExecutedMigrations };

// Also export the function directly
export { runMigrations };

// Run migrations if called directly
if (require.main === module) {
  runMigrations();
  process.exit(0);
}
