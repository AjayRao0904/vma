# Database Migrations

This folder contains all database schema migrations for the Aalap VMA application.

## Structure

- **`schema.sql`** (in parent directory) - Complete current database schema. Use this for **new databases**.
- **`migrations/`** - Incremental migration files. Use these for **existing databases** to upgrade schema.

## Migration Files (Sequential Order)

| File | Description | Tables Affected |
|------|-------------|-----------------|
| `001_add_password_auth.sql` | Add password authentication support | `users` |
| `002_add_project_mode_remove_thumbnails.sql` | Add workflow mode selection, remove thumbnails | `projects` |
| `003_add_bpm_to_audio_variations.sql` | Add BPM tracking to music tracks | `audio_variations` |
| `004_add_script_support.sql` | Add script upload and analysis | `projects` |
| `005_add_sound_effects_table.sql` | Create sound effects table | `sound_effects` (new) |
| `006_add_preview_selection.sql` | Add preview/import selection flags | `audio_variations`, `sound_effects`, `preview_tracks` (new) |
| `007_add_scene_id_to_chat_messages.sql` | Add scene_id to chat messages | `chat_messages` |

## For New Databases

Run the main schema file:

```bash
psql -U postgres -d aalap_vma -f schema.sql
```

## For Existing Databases

Run migrations sequentially:

```bash
# Run each migration in order
psql -U postgres -d aalap_vma -f migrations/001_add_password_auth.sql
psql -U postgres -d aalap_vma -f migrations/002_add_project_mode_remove_thumbnails.sql
psql -U postgres -d aalap_vma -f migrations/003_add_bpm_to_audio_variations.sql
psql -U postgres -d aalap_vma -f migrations/004_add_script_support.sql
psql -U postgres -d aalap_vma -f migrations/005_add_sound_effects_table.sql
psql -U postgres -d aalap_vma -f migrations/006_add_preview_selection.sql
psql -U postgres -d aalap_vma -f migrations/007_add_scene_id_to_chat_messages.sql
```

Or run all at once:

```bash
cd migrations
for file in *.sql; do
  echo "Running $file..."
  psql -U postgres -d aalap_vma -f "$file"
done
```

## Database Tables & Foreign Key Structure

```
users (root)
  ├─> projects
  │     ├─> videos
  │     │     └─> scenes
  │     │           ├─> audio_variations
  │     │           ├─> sound_effects
  │     │           ├─> preview_tracks
  │     │           ├─> scene_analysis
  │     │           ├─> music_prompts
  │     │           └─> chat_messages (also refs project)
  │     ├─> voice_messages
  │     └─> chat_messages (also refs scene)
  └─> voice_messages
  └─> chat_messages
```

### Foreign Key Constraints

All foreign keys use `ON DELETE CASCADE` to maintain referential integrity:

- Deleting a **user** cascades to all their projects, messages, etc.
- Deleting a **project** cascades to videos, scenes, audio, chat messages, etc.
- Deleting a **video** cascades to its scenes
- Deleting a **scene** cascades to audio variations, sound effects, analysis data, etc.

This ensures no orphaned records when data is deleted.

## Production Deployment (RDS)

When deploying to production RDS:

1. **For fresh database**: Run `schema.sql`
2. **For existing database**: Run missing migrations sequentially
3. **Verify**: Check all tables and indexes exist

```bash
# Connect to RDS
psql -h your-rds-endpoint.rds.amazonaws.com -U postgres -d aalap_vma

# List all tables
\dt

# Check specific table structure
\d users
\d projects
\d scenes
```

## Notes

- All migrations use `IF NOT EXISTS` / `IF EXISTS` clauses for idempotency
- Safe to re-run migrations if they fail partway
- Always backup production database before running migrations
- Test migrations on staging environment first
