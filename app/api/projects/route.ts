import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "../../lib/db";
import { logger } from "../../lib/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create user
    let user = await db.findUserByEmail(session.user.email);
    if (!user) {
      user = await db.createUser({
        email: session.user.email,
        name: session.user.name || undefined,
        image: session.user.image || undefined
      });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch projects from database
    const result = await db.getProjectsByUserId(user.id, {
      search,
      page,
      limit,
      orderBy: 'created_at',
      orderDir: 'DESC'
    });

    // Convert PostgreSQL timestamps to ISO strings for JSON serialization
    const serializedProjects = result.projects.map(project => ({
      ...project,
      createdAt: project.created_at instanceof Date
        ? project.created_at.toISOString()
        : new Date(project.created_at).toISOString(),
      updatedAt: project.updated_at instanceof Date
        ? project.updated_at.toISOString()
        : new Date(project.updated_at).toISOString()
    }));

    return NextResponse.json({
      ...result,
      projects: serializedProjects
    });
  } catch (error) {
    logger.error('Failed to fetch projects', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create user
    let user = await db.findUserByEmail(session.user.email);
    if (!user) {
      user = await db.createUser({
        email: session.user.email,
        name: session.user.name || undefined,
        image: session.user.image || undefined
      });
    }

    const body = await request.json();

    // Create project in database
    const newProject = await db.createProject({
      user_id: user.id,
      name: body.name || "Untitled Project",
      description: body.description || "",
      type: body.type || "motion-pictures",
      status: body.status || "draft"
    });

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    logger.error('Failed to create project', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Update project in database
    const updatedProject = await db.updateProject(id, updateData);

    if (!updatedProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(updatedProject);
  } catch (error) {
    logger.error('Failed to update project', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Delete project from database
    const deletedProject = await db.deleteProject(id);

    if (!deletedProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, project: deletedProject });
  } catch (error) {
    logger.error('Failed to delete project', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
