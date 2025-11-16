const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || "prisma+postgres://localhost:51213/?api_key=eyJkYXRhYmFzZVVybCI6InBvc3RncmVzOi8vcG9zdGdyZXM6cG9zdGdyZXNAbG9jYWxob3N0OjUxMjE0L3RlbXBsYXRlMT9zc2xtb2RlPWRpc2FibGUmY29ubmVjdGlvbl9saW1pdD0xJmNvbm5lY3RfdGltZW91dD0wJm1heF9pZGxlX2Nvbm5lY3Rpb25fbGlmZXRpbWU9MCZwb29sX3RpbWVvdXQ9MCZzaW5nbGVfdXNlX2Nvbm5lY3Rpb25zPXRydWUmc29ja2V0X3RpbWVvdXQ9MCIsIm5hbWUiOiJkZWZhdWx0Iiwic2hhZG93RGF0YWJhc2VVcmwiOiJwb3N0Z3JlczovL3Bvc3RncmVzOnBvc3RncmVzQGxvY2FsaG9zdDo1MTIxNS90ZW1wbGF0ZTE_c3NsbW9kZT1kaXNhYmxlJmNvbm5lY3Rpb25fbGltaXQ9MSZjb25uZWN0X3RpbWVvdXQ9MCZtYXhfaWRsZV9jb25uZWN0aW9uX2xpZmV0aW1lPTAmcG9vbF90aW1lb3V0PTAmc2luZ2xlX3VzZV9jb25uZWN0aW9ucz10cnVlJnNvY2tldF90aW1lb3V0PTAifQ";

const pool = new Pool({ connectionString });

async function checkScenes() {
  try {
    console.log('=== Checking Database for Scenes ===\n');

    // Get all projects
    const projects = await pool.query(`
      SELECT id, name, created_at
      FROM projects
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('Recent Projects:');
    console.table(projects.rows);

    // Get all scenes with their project info
    const result = await pool.query(`
      SELECT s.id, s.name, s.project_id, p.name as project_name, s.created_at
      FROM scenes s
      LEFT JOIN projects p ON s.project_id = p.id
      ORDER BY s.created_at DESC
      LIMIT 20
    `);

    console.log('\nRecent Scenes:');
    console.table(result.rows);

    // Get count of scenes per project
    const scenesPerProject = await pool.query(`
      SELECT p.id, p.name, COUNT(s.id) as scene_count
      FROM projects p
      LEFT JOIN scenes s ON s.project_id = p.id
      GROUP BY p.id, p.name
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    console.log('\nScenes per Project:');
    console.table(scenesPerProject.rows);

    // Get count of orphaned scenes (scenes where project doesn't exist)
    const orphaned = await pool.query(`
      SELECT COUNT(*) as count
      FROM scenes s
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE p.id IS NULL
    `);

    console.log('\nOrphaned scenes count:', orphaned.rows[0].count);

    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    await pool.end();
    process.exit(1);
  }
}

checkScenes();
