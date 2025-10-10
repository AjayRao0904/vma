import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "../../lib/db";
import { logger } from "../../lib/logger";

// POST - Create a video record in database
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { project_id, file_name, file_path, file_size, mime_type, duration, width, height } = body;

    if (!project_id || !file_name || !file_path) {
      return NextResponse.json(
        { error: 'Missing required fields: project_id, file_name, file_path' },
        { status: 400 }
      );
    }

    // Verify user owns the project
    const project = await db.getProjectById(project_id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const user = await db.findUserByEmail(session.user.email);
    if (project.user_id !== user?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create video record
    const video = await db.createVideo({
      project_id,
      file_name,
      file_path,
      file_size,
      mime_type,
      duration,
      width,
      height
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    logger.error('Failed to create video record', error);
    return NextResponse.json(
      { error: 'Failed to create video record' },
      { status: 500 }
    );
  }
}

// GET - Get all videos for a project
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing project_id parameter' },
        { status: 400 }
      );
    }

    // Verify user owns the project
    const project = await db.getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const user = await db.findUserByEmail(session.user.email);
    if (project.user_id !== user?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get videos for project
    const videos = await db.getVideosByProjectId(projectId);

    return NextResponse.json({ videos });
  } catch (error) {
    logger.error('Failed to fetch videos', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
