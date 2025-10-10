import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "../../../lib/db";
import { logger } from "../../../lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Get project from database
    const project = await db.getProjectById(projectId);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify project belongs to user
    const user = await db.findUserByEmail(session.user.email);
    if (project.user_id !== user?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get videos for this project
    const videos = await db.getVideosByProjectId(projectId);

    // Get thumbnails for each video
    const videosWithThumbnails = await Promise.all(
      videos.map(async (video) => {
        const thumbnails = await db.getThumbnailsByVideoId(video.id);
        return {
          ...video,
          thumbnails: thumbnails.map(t => ({
            id: t.id,
            file_path: t.file_path,
            timestamp: t.timestamp
          }))
        };
      })
    );

    // Get scenes for this project
    const scenes = await db.getScenesByProjectId(projectId);

    // Get audio variations for each scene
    const scenesWithAudio = await Promise.all(
      scenes.map(async (scene) => {
        const audioVariations = await db.getAudioVariationsBySceneId(scene.id);
        logger.info('Scene audio variations from DB', {
          sceneName: scene.name,
          sceneId: scene.id,
          audioVariations
        });

        const mappedVariations = audioVariations.map(audio => {
          const mapped = {
            id: audio.id,
            title: audio.title,
            duration: audio.duration ? `00:${String(Math.floor(audio.duration)).padStart(2, '0')}` : '00:05',  // Format as MM:SS
            isPlaying: false,
            audioPath: audio.file_path,  // Use audioPath to match frontend expectation
            createdAt: audio.created_at instanceof Date
              ? audio.created_at.toISOString()
              : new Date(audio.created_at).toISOString()
          };
          logger.info('Mapped audio variation', { mapped });
          return mapped;
        });

        return {
          ...scene,
          audioVariations: mappedVariations
        };
      })
    );

    logger.info('Project with scenes and audio loaded', {
      projectId,
      scenesCount: scenesWithAudio.length
    });

    // Return complete project data
    return NextResponse.json({
      ...project,
      videos: videosWithThumbnails,
      scenes: scenesWithAudio
    });
  } catch (error) {
    logger.error('Failed to fetch project', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}
