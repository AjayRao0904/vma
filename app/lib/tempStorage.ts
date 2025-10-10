// User-specific temporary storage management
import { tmpdir } from 'os';
import path from 'path';
import { mkdir, rm, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { logger } from './logger';
import crypto from 'crypto';

/**
 * Creates a unique temporary directory for a specific user
 * Format: /tmp/vma-{userId}-{sessionId}/
 * This ensures complete isolation between users
 */
export async function createUserTempDir(userId: string): Promise<string> {
  const sessionId = crypto.randomBytes(8).toString('hex');
  const userTempDir = path.join(tmpdir(), `vma-${userId}-${sessionId}`);

  try {
    if (!existsSync(userTempDir)) {
      await mkdir(userTempDir, { recursive: true });
      logger.info('Created user temp directory', { userId, path: userTempDir });
    }
    return userTempDir;
  } catch (error) {
    logger.error('Failed to create user temp directory', error, { userId });
    throw new Error('Failed to create temporary storage');
  }
}

/**
 * Gets a unique file path within user's temp directory
 */
export function getUserTempFilePath(
  userTempDir: string,
  filename: string
): string {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return path.join(userTempDir, sanitizedFilename);
}

/**
 * Cleans up user's temporary directory
 * Should be called after operations complete
 */
export async function cleanupUserTempDir(userTempDir: string): Promise<void> {
  try {
    if (existsSync(userTempDir)) {
      await rm(userTempDir, { recursive: true, force: true });
      logger.info('Cleaned up user temp directory', { path: userTempDir });
    }
  } catch (error) {
    logger.error('Failed to cleanup user temp directory', error, {
      path: userTempDir,
    });
    // Don't throw - cleanup failures shouldn't break the request
  }
}

/**
 * Cleans up old temporary directories (older than 24 hours)
 * Should be run periodically as a cleanup job
 */
export async function cleanupOldTempDirs(): Promise<void> {
  const tempRoot = tmpdir();
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  try {
    const entries = await readdir(tempRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('vma-')) {
        const dirPath = path.join(tempRoot, entry.name);
        const stats = await import('fs/promises').then((fs) =>
          fs.stat(dirPath)
        );

        if (now - stats.mtimeMs > maxAge) {
          await rm(dirPath, { recursive: true, force: true });
          logger.info('Cleaned up old temp directory', { path: dirPath });
        }
      }
    }
  } catch (error) {
    logger.error('Failed to cleanup old temp directories', error);
  }
}

/**
 * Gets a user-specific subdirectory within their temp space
 * Useful for organizing different types of files
 */
export async function getUserTempSubDir(
  userTempDir: string,
  subDirName: string
): Promise<string> {
  const subDir = path.join(userTempDir, subDirName);

  try {
    if (!existsSync(subDir)) {
      await mkdir(subDir, { recursive: true });
    }
    return subDir;
  } catch (error) {
    logger.error('Failed to create user temp subdirectory', error, {
      subDirName,
    });
    throw new Error('Failed to create temporary subdirectory');
  }
}

/**
 * Validates that a path is within the user's temp directory
 * Security check to prevent directory traversal attacks
 */
export function validateUserTempPath(
  userTempDir: string,
  filePath: string
): boolean {
  const normalized = path.normalize(filePath);
  const relative = path.relative(userTempDir, normalized);

  // If relative path starts with '..' or is absolute, it's outside user's dir
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}
