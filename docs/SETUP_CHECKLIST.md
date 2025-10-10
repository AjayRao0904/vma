# Setup Checklist

Complete this checklist to get your Aalap VMA application up and running.

## ✅ Prerequisites

- [ ] Node.js 18+ installed
- [ ] npm installed
- [ ] PostgreSQL 14+ installed
- [ ] Google Cloud account (for OAuth)

## 📦 Installation Steps

### 1. Clone & Install Dependencies

```bash
# Install npm packages
npm install
```

- [ ] Dependencies installed successfully

### 2. Database Setup

```bash
# Create the database (Windows PowerShell/CMD)
psql -U postgres -c "CREATE DATABASE aalap_vma;"

# Or connect to psql first
psql -U postgres
CREATE DATABASE aalap_vma;
\q

# Run the schema migration
npm run db:migrate

# Or manually:
psql -U postgres -d aalap_vma -f schema.sql
```

- [ ] PostgreSQL installed and running
- [ ] Database `aalap_vma` created
- [ ] Schema tables created successfully

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```env
# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/aalap_vma

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-random-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

- [ ] `.env.local` file created
- [ ] `DATABASE_URL` configured
- [ ] `NEXTAUTH_SECRET` generated (use: `openssl rand -base64 32`)
- [ ] Google OAuth credentials added

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Client Secret to `.env.local`

- [ ] Google Cloud project created
- [ ] OAuth credentials generated
- [ ] Redirect URI configured
- [ ] Credentials added to `.env.local`

### 5. Test Database Connection

```bash
npm run db:test
```

Expected output:
```
✅ Successfully connected to PostgreSQL!
✅ Found tables: users, projects, videos, scenes, etc.
```

- [ ] Database connection test passed
- [ ] All tables listed successfully

### 6. Start Development Server

```bash
npm run dev
```

- [ ] Server starts without errors
- [ ] Navigate to http://localhost:3000
- [ ] Landing page loads successfully

### 7. Test Authentication

1. Click "Let's Start" or "Sign in with Google"
2. Complete Google OAuth flow
3. Verify redirect to dashboard

- [ ] Google sign-in works
- [ ] User redirected to dashboard
- [ ] User data stored in database

### 8. Test Core Features

#### Create a Project
1. Click "New blank project" on dashboard
2. Enter project name and description
3. Click "Create Project"

- [ ] Project creation works
- [ ] Project appears in dashboard
- [ ] Project data saved to database

#### Upload a Video
1. Open the created project
2. Click/drag to upload a video file
3. Wait for upload to complete

- [ ] Video upload works
- [ ] Video displays in player
- [ ] Video file saved locally

#### Generate Thumbnails
1. After video upload, click "Generate Timeline"
2. Wait for FFmpeg processing

- [ ] Thumbnails generate successfully
- [ ] Timeline displays thumbnails
- [ ] Scrubber works on timeline

#### Trim Scenes
1. Click "Trim Scene" on timeline
2. Click "Start Scene" to mark start
3. Move timeline, click "Choose Scene" to mark end
4. Click "Export Scenes"

- [ ] Scene trimming UI works
- [ ] Scene export processes successfully
- [ ] Scenes appear in Content Viewer

## 🔍 Verification Commands

### Check Database
```bash
# Connect to database
psql -U postgres -d aalap_vma

# List tables
\dt

# Check users
SELECT * FROM users;

# Check projects
SELECT * FROM projects;

# Exit
\q
```

### Check Video Files
```bash
# Windows
dir C:\tempvideos

# Linux/macOS
ls -la /tempvideos
```

## 🐛 Troubleshooting

### Database Connection Issues

**Error: "connection refused"**
```bash
# Check if PostgreSQL is running
# Windows
Get-Service postgresql-x64-14

# Start if not running
Start-Service postgresql-x64-14
```

**Error: "authentication failed"**
- Verify username and password in DATABASE_URL
- Check PostgreSQL pg_hba.conf for authentication settings

### FFmpeg Issues

**Error: "FFmpeg not found"**
- Reinstall ffmpeg-static: `npm install ffmpeg-static`
- Verify in node_modules/ffmpeg-static/

### Google OAuth Issues

**Error: "redirect_uri_mismatch"**
- Verify redirect URI in Google Console matches exactly:
  `http://localhost:3000/api/auth/callback/google`

**Error: "invalid client"**
- Double-check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- Ensure no extra spaces in .env.local

## 📊 Database Quick Reference

```sql
-- Count all users
SELECT COUNT(*) FROM users;

-- List all projects
SELECT id, name, status, created_at FROM projects;

-- Find projects by user email
SELECT p.* FROM projects p
JOIN users u ON p.user_id = u.id
WHERE u.email = 'your@email.com';

-- Delete a project
DELETE FROM projects WHERE id = 'project-id';

-- Reset all data
TRUNCATE users, projects, videos, scenes, audio_variations, voice_messages, thumbnails CASCADE;
```

## ✨ Success Indicators

If everything is working, you should see:

1. ✅ Dashboard loads with "No projects found" or existing projects
2. ✅ Can create new projects successfully
3. ✅ Can upload videos and see them play
4. ✅ Thumbnails generate on timeline
5. ✅ Can trim and export scenes
6. ✅ Database contains user and project records

## 📞 Getting Help

If you encounter issues:

1. Check the console for error messages
2. Review DATABASE_SETUP.md for detailed database instructions
3. Verify all environment variables in .env.local
4. Run `npm run db:test` to verify database connection
5. Check PostgreSQL logs for database errors

## 🚀 Next Steps

Once setup is complete:

1. [ ] Explore the Motion Pictures workspace
2. [ ] Test scene trimming with a sample video
3. [ ] Review the codebase structure
4. [ ] Read TODO items in README.md
5. [ ] Start implementing missing features (voice recording, AI music)

---

**Setup Complete!** 🎉

Your Aalap VMA application is now ready for development.
