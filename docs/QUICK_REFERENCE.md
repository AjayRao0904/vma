# Quick Reference Guide

## 🚀 Common Commands

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Database
```bash
# Test database connection
npm run db:test

# Create database
npm run db:create

# Run schema migration
npm run db:migrate

# Connect to database
psql -U postgres -d aalap_vma
```

### PostgreSQL Commands (Inside psql)
```sql
-- List all databases
\l

-- Connect to aalap_vma database
\c aalap_vma

-- List all tables
\dt

-- Describe a table structure
\d table_name
\d users
\d projects

-- View table contents
SELECT * FROM users;
SELECT * FROM projects ORDER BY created_at DESC LIMIT 10;

-- Count records
SELECT COUNT(*) FROM projects;

-- Find projects by user
SELECT p.* FROM projects p
JOIN users u ON p.user_id = u.id
WHERE u.email = 'your@email.com';

-- Search projects
SELECT * FROM projects WHERE name ILIKE '%video%';

-- Delete a project
DELETE FROM projects WHERE id = 'project-id-here';

-- Clear all data (WARNING: This deletes everything!)
TRUNCATE users, projects, videos, scenes, audio_variations, voice_messages, thumbnails CASCADE;

-- Quit psql
\q
```

## 🗄️ Database Schema Quick View

```sql
-- Users table
id, email, name, image, google_id, created_at, updated_at

-- Projects table
id, user_id, name, description, type, status, created_at, updated_at

-- Videos table
id, project_id, file_name, file_path, file_size, mime_type, duration, width, height

-- Scenes table
id, video_id, project_id, name, start_time, end_time, file_path, session_id

-- Audio_variations table
id, scene_id, title, file_path, duration, is_playing

-- Voice_messages table
id, project_id, user_id, audio_blob, duration, transcription, waveform_data

-- Thumbnails table
id, video_id, file_path, timestamp, session_id
```

## 🔑 Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/aalap_vma
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=random-secret-key
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Optional (Future use)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
```

## 📁 Directory Structure

```
project/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # NextAuth
│   │   ├── projects/          # Project CRUD
│   │   ├── upload/            # Video upload
│   │   └── ...
│   ├── components/            # React components
│   ├── contexts/              # React Context
│   ├── hooks/                 # Custom hooks
│   ├── lib/
│   │   └── db.ts             # Database utilities
│   └── (pages)/              # Routes
├── public/                    # Static files
├── tempvideos/               # Local video storage
├── tempscenes/               # Exported scenes
├── schema.sql                # Database schema
└── .env.local                # Environment config
```

## 🔧 API Endpoints

### Projects
```bash
# Get all projects (with pagination & search)
GET /api/projects?page=1&limit=10&search=keyword

# Create project
POST /api/projects
Body: { name, description, type, status }

# Update project
PUT /api/projects
Body: { id, name, description, status }

# Delete project
DELETE /api/projects?id=project-id
```

### Videos
```bash
# Upload video
POST /api/upload
Body: FormData with 'video' file

# Get video
GET /api/video/[filename]
```

### Processing
```bash
# Generate thumbnails
POST /api/thumbnails
Body: FormData with 'video' file

# Trim scenes
POST /api/trim-scenes
Body: FormData with 'video' and 'scenes' data
```

## 🐛 Troubleshooting

### Database Connection Failed
```bash
# Check if PostgreSQL is running
# Windows
Get-Service postgresql-x64-14
Start-Service postgresql-x64-14

# macOS
brew services list
brew services start postgresql@14

# Linux
sudo systemctl status postgresql
sudo systemctl start postgresql
```

### Reset Database
```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE aalap_vma;"
psql -U postgres -c "CREATE DATABASE aalap_vma;"
psql -U postgres -d aalap_vma -f schema.sql
```

### Clear Application Data
```bash
# Delete uploaded videos
rm -rf tempvideos/*
rm -rf tempscenes/*
rm -rf public/testthumbnails/*
rm -rf public/scenes/*

# Windows
rmdir /s tempvideos
rmdir /s tempscenes
rmdir /s public\testthumbnails
rmdir /s public\scenes
```

### Regenerate Environment Secret
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Or in Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 📊 Useful Database Queries

### User Statistics
```sql
-- Count total users
SELECT COUNT(*) FROM users;

-- Recent users
SELECT email, name, created_at FROM users ORDER BY created_at DESC LIMIT 10;
```

### Project Statistics
```sql
-- Projects by status
SELECT status, COUNT(*) FROM projects GROUP BY status;

-- Recent projects
SELECT name, status, created_at FROM projects ORDER BY created_at DESC LIMIT 10;

-- Projects with video count
SELECT p.name, COUNT(v.id) as video_count
FROM projects p
LEFT JOIN videos v ON p.id = v.project_id
GROUP BY p.id, p.name;
```

### Data Size
```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('aalap_vma'));

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🔐 Security Checklist

- [ ] `.env.local` not in git
- [ ] Strong PostgreSQL password
- [ ] NEXTAUTH_SECRET is random
- [ ] Google OAuth credentials secured
- [ ] Database user has minimal privileges
- [ ] SSL enabled for production database
- [ ] API routes require authentication

## 📚 Important Files

| File | Purpose |
|------|---------|
| `schema.sql` | Database schema definition |
| `app/lib/db.ts` | Database connection & queries |
| `app/api/projects/route.ts` | Projects API endpoint |
| `app/hooks/useProjects.ts` | Projects React hook |
| `.env.local` | Environment configuration |
| `DATABASE_SETUP.md` | Setup instructions |
| `SETUP_CHECKLIST.md` | Step-by-step checklist |

## 🎯 Common Tasks

### Add a New User Manually
```sql
INSERT INTO users (email, name) VALUES ('user@example.com', 'User Name');
```

### Find User ID by Email
```sql
SELECT id FROM users WHERE email = 'your@email.com';
```

### List All Projects for a User
```sql
SELECT * FROM projects WHERE user_id = 'user-id-here' ORDER BY created_at DESC;
```

### Backup Database
```bash
pg_dump -U postgres aalap_vma > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
psql -U postgres aalap_vma < backup_20250101.sql
```

---

**Keep this file handy for quick reference!** 📌
