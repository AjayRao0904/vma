const { Pool } = require('pg');
const { readFileSync } = require('fs');

// Manually load .env.local
try {
  const envContent = readFileSync('.env.local', 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=#]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
} catch (e) {
  console.error('Could not load .env.local:', e.message);
}

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

async function runMigration() {
  try {
    console.log('🔄 Running migration: Add scene_id to chat_messages...\n');

    const sql = readFileSync('migrate-chat-messages.sql', 'utf-8');

    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('   - Added scene_id column to chat_messages');
    console.log('   - Created index on scene_id\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
