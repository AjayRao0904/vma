import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db, { query } from '../../../lib/db';
import { logger } from '../../../lib/logger';

/**
 * PATCH /api/audio-variations/[id]
 * Update audio variation (e.g., preview/import selection)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    logger.info('Updating audio variation', { id, updates: body });

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.selected_for_preview !== undefined) {
      updates.push(`selected_for_preview = $${paramIndex++}`);
      values.push(body.selected_for_preview);
    }

    if (body.selected_for_import !== undefined) {
      updates.push(`selected_for_import = $${paramIndex++}`);
      values.push(body.selected_for_import);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    values.push(id);

    const result = await query(
      `UPDATE audio_variations
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Audio variation not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    logger.error('Error updating audio variation', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      { error: 'Failed to update audio variation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/audio-variations/[id]
 * Delete audio variation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    logger.info('Deleting audio variation', { id });

    const result = await query(
      'DELETE FROM audio_variations WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Audio variation not found' }, { status: 404 });
    }

    logger.info('Audio variation deleted successfully', { id });
    return NextResponse.json({ success: true, deleted: result.rows[0] });

  } catch (error) {
    logger.error('Error deleting audio variation', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      { error: 'Failed to delete audio variation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
