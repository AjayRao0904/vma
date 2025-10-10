import { Pool, QueryResult, QueryResultRow } from 'pg';
import { logger } from './logger';

// Create a PostgreSQL connection pool
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    logger.info('Initializing PostgreSQL connection pool');

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased from 2000 to 10000 (10 seconds)
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client', err);
    });

    pool.on('connect', () => {
      logger.info('PostgreSQL client connected');
    });
  }

  return pool;
}

// Execute a query
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  const start = Date.now();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      logger.info('Executed query', { text, duration, rows: result.rowCount });
    }

    return result;
  } catch (error) {
    logger.error('Database query error', error);
    throw error;
  }
}

// Execute a transaction
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Close the pool (useful for cleanup)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Database helper functions
export const db = {
  // Users
  async findUserByEmail(email: string) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  },

  async findUserById(id: string) {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async createUser(data: { email: string; name?: string; image?: string; google_id?: string; password_hash?: string }) {
    const result = await query(
      `INSERT INTO users (email, name, image, google_id, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.email, data.name, data.image, data.google_id, data.password_hash]
    );
    return result.rows[0];
  },

  async setPasswordResetToken(email: string, token: string, expiresAt: Date) {
    const result = await query(
      `UPDATE users
       SET reset_token = $2,
           reset_token_expires = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE email = $1
       RETURNING *`,
      [email, token, expiresAt]
    );
    return result.rows[0];
  },

  async findUserByResetToken(token: string) {
    const result = await query(
      `SELECT * FROM users
       WHERE reset_token = $1
       AND reset_token_expires > NOW()`,
      [token]
    );
    return result.rows[0];
  },

  async updatePassword(userId: string, passwordHash: string) {
    const result = await query(
      `UPDATE users
       SET password_hash = $2,
           reset_token = NULL,
           reset_token_expires = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [userId, passwordHash]
    );
    return result.rows[0];
  },

  async updateUser(id: string, data: { name?: string; image?: string }) {
    const result = await query(
      `UPDATE users
       SET name = COALESCE($2, name),
           image = COALESCE($3, image),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, data.name, data.image]
    );
    return result.rows[0];
  },

  // Projects
  async createProject(data: {
    user_id: string;
    name: string;
    description?: string;
    type?: string;
    status?: string;
  }) {
    const result = await query(
      `INSERT INTO projects (user_id, name, description, type, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.user_id,
        data.name,
        data.description || '',
        data.type || 'motion-pictures',
        data.status || 'draft'
      ]
    );
    return result.rows[0];
  },

  async getProjectById(id: string) {
    const result = await query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async getProjectsByUserId(
    userId: string,
    options: {
      search?: string;
      page?: number;
      limit?: number;
      orderBy?: 'created_at' | 'updated_at' | 'name';
      orderDir?: 'ASC' | 'DESC';
    } = {}
  ) {
    const {
      search = '',
      page = 1,
      limit = 10,
      orderBy = 'created_at',
      orderDir = 'DESC'
    } = options;

    const offset = (page - 1) * limit;

    let queryText = `
      SELECT * FROM projects
      WHERE user_id = $1
    `;

    const params: any[] = [userId];

    if (search) {
      queryText += ` AND (name ILIKE $2 OR description ILIKE $2)`;
      params.push(`%${search}%`);
    }

    queryText += ` ORDER BY ${orderBy} ${orderDir} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM projects WHERE user_id = $1';
    const countParams: any[] = [userId];

    if (search) {
      countQuery += ' AND (name ILIKE $2 OR description ILIKE $2)';
      countParams.push(`%${search}%`);
    }

    const countResult = await query(countQuery, countParams);
    const totalItems = parseInt(countResult.rows[0].count);

    return {
      projects: result.rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
        hasPrev: page > 1,
        hasNext: page < Math.ceil(totalItems / limit)
      }
    };
  },

  async updateProject(id: string, data: {
    name?: string;
    description?: string;
    type?: string;
    status?: string;
  }) {
    const result = await query(
      `UPDATE projects
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           type = COALESCE($4, type),
           status = COALESCE($5, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, data.name, data.description, data.type, data.status]
    );
    return result.rows[0];
  },

  async deleteProject(id: string) {
    const result = await query(
      'DELETE FROM projects WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  },

  // Videos
  async createVideo(data: {
    project_id: string;
    file_name: string;
    file_path: string;
    file_size?: number;
    mime_type?: string;
    duration?: number;
    width?: number;
    height?: number;
  }) {
    const result = await query(
      `INSERT INTO videos (project_id, file_name, file_path, file_size, mime_type, duration, width, height)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.project_id,
        data.file_name,
        data.file_path,
        data.file_size,
        data.mime_type,
        data.duration,
        data.width,
        data.height
      ]
    );
    return result.rows[0];
  },

  async getVideosByProjectId(projectId: string) {
    const result = await query(
      'SELECT * FROM videos WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    );
    return result.rows;
  },

  async getVideoById(videoId: string) {
    const result = await query(
      'SELECT * FROM videos WHERE id = $1',
      [videoId]
    );
    return result.rows[0];
  },

  async updateVideo(videoId: string, data: {
    duration?: number;
    width?: number;
    height?: number;
  }) {
    const result = await query(
      `UPDATE videos
       SET duration = COALESCE($2, duration),
           width = COALESCE($3, width),
           height = COALESCE($4, height),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [videoId, data.duration, data.width, data.height]
    );
    return result.rows[0];
  },

  // Scenes
  async createScene(data: {
    video_id: string;
    project_id: string;
    name: string;
    start_time: number;
    end_time: number;
    file_path?: string;
    session_id?: string;
  }) {
    const result = await query(
      `INSERT INTO scenes (video_id, project_id, name, start_time, end_time, file_path, session_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.video_id,
        data.project_id,
        data.name,
        data.start_time,
        data.end_time,
        data.file_path,
        data.session_id
      ]
    );
    return result.rows[0];
  },

  async getScenesByProjectId(projectId: string) {
    const result = await query(
      'SELECT * FROM scenes WHERE project_id = $1 ORDER BY start_time ASC',
      [projectId]
    );
    return result.rows;
  },

  // Audio Variations
  async createAudioVariation(data: {
    scene_id: string;
    title: string;
    file_path?: string;
    duration?: number;  // Duration in seconds (numeric)
    prompt?: string;
  }) {
    const result = await query(
      `INSERT INTO audio_variations (scene_id, title, file_path, duration, prompt)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.scene_id, data.title, data.file_path, data.duration, data.prompt || null]
    );
    return result.rows[0];
  },

  async getAudioVariationsBySceneId(sceneId: string) {
    const result = await query(
      'SELECT * FROM audio_variations WHERE scene_id = $1 ORDER BY created_at ASC',
      [sceneId]
    );
    return result.rows;
  },

  // Thumbnails
  async createThumbnail(data: {
    video_id: string;
    file_path: string;
    timestamp: number;
    session_id?: string;
  }) {
    const result = await query(
      `INSERT INTO thumbnails (video_id, file_path, timestamp, session_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.video_id, data.file_path, data.timestamp, data.session_id]
    );
    return result.rows[0];
  },

  async getThumbnailsByVideoId(videoId: string) {
    const result = await query(
      'SELECT * FROM thumbnails WHERE video_id = $1 ORDER BY timestamp ASC',
      [videoId]
    );
    return result.rows;
  },

  async deleteThumbnailsByVideoId(videoId: string) {
    const result = await query(
      'DELETE FROM thumbnails WHERE video_id = $1 RETURNING *',
      [videoId]
    );
    return result.rows;
  },

  // Voice Messages
  async createVoiceMessage(data: {
    project_id?: string;
    user_id: string;
    audio_blob?: Buffer;
    duration?: number;
    transcription?: string;
    waveform_data?: any;
  }) {
    const result = await query(
      `INSERT INTO voice_messages (project_id, user_id, audio_blob, duration, transcription, waveform_data)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.project_id,
        data.user_id,
        data.audio_blob,
        data.duration,
        data.transcription,
        data.waveform_data ? JSON.stringify(data.waveform_data) : null
      ]
    );
    return result.rows[0];
  },

  async getVoiceMessagesByProjectId(projectId: string) {
    const result = await query(
      'SELECT * FROM voice_messages WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    );
    return result.rows;
  },

  // Chat Messages
  async createChatMessage(data: {
    project_id?: string;
    user_id: string;
    role: 'user' | 'assistant';
    content: string;
  }) {
    const result = await query(
      `INSERT INTO chat_messages (project_id, user_id, role, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.project_id, data.user_id, data.role, data.content]
    );
    return result.rows[0];
  },

  async getChatMessagesByProjectId(projectId: string) {
    const result = await query(
      'SELECT * FROM chat_messages WHERE project_id = $1 ORDER BY created_at ASC',
      [projectId]
    );
    return result.rows;
  },

  async getChatMessagesByUserId(userId: string, limit: number = 50) {
    const result = await query(
      'SELECT * FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return result.rows;
  },

  async deleteChatMessagesByProjectId(projectId: string) {
    const result = await query(
      'DELETE FROM chat_messages WHERE project_id = $1 RETURNING *',
      [projectId]
    );
    return result.rows;
  },

  // Scene management
  async getSceneById(sceneId: string) {
    const result = await query(
      'SELECT * FROM scenes WHERE id = $1',
      [sceneId]
    );
    return result.rows[0];
  },

  async deleteScene(sceneId: string) {
    const result = await query(
      'DELETE FROM scenes WHERE id = $1 RETURNING *',
      [sceneId]
    );
    return result.rows[0];
  },

  async deleteAudioVariationsBySceneId(sceneId: string) {
    const result = await query(
      'DELETE FROM audio_variations WHERE scene_id = $1 RETURNING *',
      [sceneId]
    );
    return result.rows;
  },

  // Scene Analysis functions
  async createSceneAnalysis(data: {
    scene_id: string;
    frame_timestamp: number;
    lighting?: string;
    camera_angle?: string;
    colors?: object;
    shot_type?: string;
    mood?: string;
    emotions?: string;
    raw_analysis?: string;
  }) {
    const result = await query(
      `INSERT INTO scene_analysis
       (scene_id, frame_timestamp, lighting, camera_angle, colors, shot_type, mood, emotions, raw_analysis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.scene_id,
        data.frame_timestamp,
        data.lighting,
        data.camera_angle,
        data.colors ? JSON.stringify(data.colors) : null,
        data.shot_type,
        data.mood,
        data.emotions,
        data.raw_analysis
      ]
    );
    return result.rows[0];
  },

  async getSceneAnalysisBySceneId(sceneId: string) {
    const result = await query(
      'SELECT * FROM scene_analysis WHERE scene_id = $1 ORDER BY frame_timestamp ASC',
      [sceneId]
    );
    return result.rows;
  },

  // Music Prompt functions
  async createMusicPrompt(data: {
    scene_id: string;
    prompt: string;
    analysis_summary?: string;
  }) {
    const result = await query(
      `INSERT INTO music_prompts (scene_id, prompt, analysis_summary)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.scene_id, data.prompt, data.analysis_summary]
    );
    return result.rows[0];
  },

  async getMusicPromptBySceneId(sceneId: string) {
    const result = await query(
      'SELECT * FROM music_prompts WHERE scene_id = $1 ORDER BY created_at DESC LIMIT 1',
      [sceneId]
    );
    return result.rows[0];
  }
};

export default db;
