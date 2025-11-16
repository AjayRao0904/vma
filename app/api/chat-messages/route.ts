import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "../../lib/db";
import { logger } from "../../lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.findUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { scene_id, role, content } = body;

    if (!scene_id || !role || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: scene_id, role, content' },
        { status: 400 }
      );
    }

    // Get scene to get project_id
    const scene = await db.getSceneById(scene_id);
    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    // Create chat message
    const chatMessage = await db.createChatMessage({
      scene_id,
      project_id: scene.project_id,
      user_id: user.id,
      role,
      content
    });

    logger.info('Chat message created', {
      messageId: chatMessage.id,
      sceneId: scene_id,
      role
    });

    return NextResponse.json(chatMessage);
  } catch (error) {
    logger.error('Failed to create chat message', error);
    return NextResponse.json(
      { error: 'Failed to create chat message' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sceneId = searchParams.get('scene_id');

    if (!sceneId) {
      return NextResponse.json(
        { error: 'scene_id query parameter required' },
        { status: 400 }
      );
    }

    const messages = await db.getChatMessagesBySceneId(sceneId);

    return NextResponse.json(messages);
  } catch (error) {
    logger.error('Failed to get chat messages', error);
    return NextResponse.json(
      { error: 'Failed to get chat messages' },
      { status: 500 }
    );
  }
}
