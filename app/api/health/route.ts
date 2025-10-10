import { NextResponse } from 'next/server';

// Health check endpoint for load balancer
export async function GET() {
  try {
    // Basic health check - can be extended to check database connectivity
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'vma-api',
      version: process.env.npm_package_version || '1.0.0'
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}
