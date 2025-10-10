// Database migration script
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // Required for AWS RDS
  } : false
});

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('Starting database migration...');

    // Run main schema
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('✓ Main schema applied');
    }

    // Run migrations in order
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(migrationSql);
        console.log(`✓ Applied migration: ${file}`);
      }
    }

    console.log('✓ All migrations completed successfully');
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
