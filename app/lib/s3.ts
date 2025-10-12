import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from './logger';

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET!;

/**
 * Upload a file to S3
 * @param file - File buffer or Uint8Array
 * @param key - S3 object key (path in bucket)
 * @param contentType - MIME type of the file
 * @returns S3 key of uploaded file
 */
export async function uploadToS3(
  file: Buffer | Uint8Array,
  key: string,
  contentType: string
): Promise<string> {
  console.log('📦 uploadToS3 called');
  console.log('   Bucket:', BUCKET_NAME);
  console.log('   Key:', key);
  console.log('   ContentType:', contentType);
  console.log('   File size:', file.length);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  console.log('🚀 Sending S3 PutObject command...');
  try {
    const result = await s3Client.send(command);
    console.log('✅ S3 upload SUCCESS!', result);
    logger.info('Uploaded to S3', { key });
    return key;
  } catch (error) {
    console.error('❌ S3 upload FAILED:', error);
    throw error;
  }
}

/**
 * Generate a pre-signed URL for downloading a file from S3
 * @param key - S3 object key
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Pre-signed URL
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

/**
 * Delete a file from S3
 * @param key - S3 object key
 */
export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
  logger.info('Deleted from S3', { key });
}

/**
 * Generate S3 key for a video file
 * @param userId - User ID
 * @param projectId - Project ID
 * @param filename - Original filename
 * @param userName - User name (optional)
 * @param projectName - Project name (optional)
 * @returns S3 key
 */
export function generateVideoKey(
  userId: string,
  projectId: string,
  filename: string,
  userName?: string,
  projectName?: string
): string {
  const timestamp = Date.now();
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const userFolder = userName ? `${userId}_${userName.replace(/[^a-zA-Z0-9]/g, '_')}` : userId;
  const projectFolder = projectName ? `${projectId}_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}` : projectId;
  return `${userFolder}/${projectFolder}/videos/${timestamp}_${sanitized}`;
}

/**
 * Generate S3 key for a scene file
 * @param userId - User ID
 * @param projectId - Project ID
 * @param sessionId - Session ID
 * @param filename - Original filename
 * @param userName - User name (optional)
 * @param projectName - Project name (optional)
 * @returns S3 key
 */
export function generateSceneKey(
  userId: string,
  projectId: string,
  sessionId: string,
  filename: string,
  userName?: string,
  projectName?: string
): string {
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const userFolder = userName ? `${userId}_${userName.replace(/[^a-zA-Z0-9]/g, '_')}` : userId;
  const projectFolder = projectName ? `${projectId}_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}` : projectId;
  return `${userFolder}/${projectFolder}/scenes/${sessionId}/${sanitized}`;
}

/**
 * Generate S3 key for a thumbnail file
 * @param userId - User ID
 * @param videoId - Video ID
 * @param filename - Original filename
 * @param userName - User name (optional)
 * @param projectId - Project ID (optional)
 * @param projectName - Project name (optional)
 * @returns S3 key
 */
export function generateThumbnailKey(
  userId: string,
  videoId: string,
  filename: string,
  userName?: string,
  projectId?: string,
  projectName?: string
): string {
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const userFolder = userName ? `${userId}_${userName.replace(/[^a-zA-Z0-9]/g, '_')}` : userId;
  const projectFolder = projectId && projectName
    ? `${projectId}_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}`
    : projectId || 'unknown';
  return `${userFolder}/${projectFolder}/thumbnails/${videoId}/${sanitized}`;
}

/**
 * Generate S3 key for an audio file
 * @param userId - User ID
 * @param projectId - Project ID
 * @param sceneId - Scene ID
 * @param filename - Original filename
 * @param userName - User name (optional)
 * @param projectName - Project name (optional)
 * @returns S3 key
 */
export function generateAudioKey(
  userId: string,
  projectId: string,
  sceneId: string,
  filename: string,
  userName?: string,
  projectName?: string
): string {
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const userFolder = userName ? `${userId}_${userName.replace(/[^a-zA-Z0-9]/g, '_')}` : userId;
  const projectFolder = projectName ? `${projectId}_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}` : projectId;
  return `${userFolder}/${projectFolder}/audio/${sceneId}/${sanitized}`;
}

export { s3Client, BUCKET_NAME };
