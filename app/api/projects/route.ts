import { NextRequest, NextResponse } from "next/server";

const mockProjects = [
  {
    id: "1",
    name: "Sample Project",
    description: "A test project",
    status: "completed"
  }
];

export async function GET() {
  return NextResponse.json({ 
    projects: mockProjects,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: mockProjects.length,
      hasNext: false,
      hasPrev: false
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newProject = {
      id: Date.now().toString(),
      name: body.name || "Untitled Project",
      description: body.description || "",
      status: body.status || "draft",
      createdAt: new Date().toISOString()
    };

    // Add to the beginning of the array
    mockProjects.unshift(newProject);

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
