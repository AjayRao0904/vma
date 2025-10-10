# PostgreSQL Database Setup Guide

This guide will help you set up the PostgreSQL database for the Aalap VMA application.

## Prerequisites

- PostgreSQL 14 or higher installed on your system
- Node.js and npm installed
- Access to create databases

## Step 1: Install PostgreSQL

### Windows
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the installation wizard
3. Remember the password you set for the `postgres` user
4. Default port is `5432`

### macOS
```bash
brew install postgresql@14
brew services start postgresql@14
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## Step 2: Create the Database

1. Open your terminal/command prompt

2. Connect to PostgreSQL as the postgres user:
```bash
# Windows
psql -U postgres

# macOS/Linux
sudo -u postgres psql
```

3. Create the database:
```sql
CREATE DATABASE aalap_vma;
```

4. Create a user for the application (optional but recommended):
```sql
CREATE USER aalap_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE aalap_vma TO aalap_user;
```

5. Exit psql:
```sql
\q
```

## Step 3: Run the Schema

1. Connect to your new database:
```bash
# With postgres user

# With custom user
psql -U aalap_user -d aalap_vma
```

2. Run the schema file:
```sql
\i schema.sql
```

Or from the command line:
```bash
# With postgres user
psql -U postgres -d aalap_vma -f schema.sql

# With custom user
psql -U aalap_user -d aalap_vma -f schema.sql
```

## Step 4: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` and update the database connection string:

```env
# If using postgres user
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/aalap_vma

# If using custom user
DATABASE_URL=postgresql://aalap_user:your_secure_password@localhost:5432/aalap_vma
```

## Step 5: Test the Connection

1. Install dependencies (if not already done):
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Check the console for any database connection errors

4. Try creating a new project through the UI to verify the database is working

## Troubleshooting

### Connection Refused Error
- Make sure PostgreSQL is running:
  ```bash
  # Windows
  Get-Service postgresql-x64-14

  # macOS
  brew services list

  # Linux
  sudo systemctl status postgresql
  ```

### Authentication Failed
- Verify your username and password in the DATABASE_URL
- Check PostgreSQL's `pg_hba.conf` file for authentication settings

### Permission Denied
- Ensure the database user has the correct permissions:
  ```sql
  GRANT ALL PRIVILEGES ON DATABASE aalap_vma TO your_user;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
  ```

### Tables Not Found
- Make sure you ran the schema.sql file in the correct database
- Verify tables exist:
  ```sql
  \dt
  ```

## Database Structure

The database includes the following main tables:

- **users** - User accounts (from Google OAuth)
- **projects** - Motion picture projects
- **videos** - Uploaded videos
- **scenes** - Trimmed video scenes
- **audio_variations** - AI-generated audio for scenes
- **voice_messages** - Voice recordings from users
- **thumbnails** - Video thumbnails for timeline

## Useful PostgreSQL Commands

```sql
-- List all databases
\l

-- List all tables
\dt

-- Describe a table
\d table_name

-- View table data
SELECT * FROM table_name LIMIT 10;

-- Check database size
SELECT pg_size_pretty(pg_database_size('aalap_vma'));
```

## Backup and Restore

### Create a backup
```bash
pg_dump -U postgres aalap_vma > backup.sql
```

### Restore from backup
```bash
psql -U postgres aalap_vma < backup.sql
```

## Production Deployment

For production, consider using:
- **Managed PostgreSQL services**:
  - AWS RDS
  - Heroku Postgres
  - DigitalOcean Managed Databases
  - Supabase
  - Neon

Update your production `DATABASE_URL` accordingly and ensure SSL is enabled:
```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```
