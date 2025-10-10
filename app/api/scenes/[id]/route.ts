import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "../../../lib/db";
import { logger } from "../../../lib/logger";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sceneId } = await params;

    // Get scene from database to verify ownership
    const scene = await db.getSceneById(sceneId);

    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    // Verify user owns this scene (through project ownership)
    const user = await db.findUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get project to verify ownership
    const project = await db.getProjectById(scene.project_id);
    if (!project || project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete audio variations first (foreign key constraint)
    await db.deleteAudioVariationsBySceneId(sceneId);

    // Delete the scene from database
    const deletedScene = await db.deleteScene(sceneId);

    // Try to delete the scene video file from file system
    if (deletedScene && deletedScene.file_path) {
      try {
        const { unlink } = await import('fs/promises');
        const path = await import('path');
        
        // Construct full path to the scene file
        const publicPath = path.join(process.cwd(), 'public', deletedScene.file_path);
        await unlink(publicPath);
        logger.info('Scene video file deleted', { publicPath });
      } catch (fileError) {
        logger.warn('Failed to delete scene video file', {
          error: fileError instanceof Error ? fileError.message : 'Unknown error'
        });
        // Don't fail the whole operation if file deletion fails
      }
    }

    logger.info('Scene deleted successfully', { sceneId });

    return NextResponse.json({
      success: true,
      message: 'Scene deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete scene', error);
    return NextResponse.json(
      { error: 'Failed to delete scene' },
      { status: 500 }
    );
  }
}