import { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS } from '@/core/rbac';
import { getCurrentUserWithPermission } from '@/core/rbac';
import { deletePost } from '@/shared/models/post';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check permission
    const user = await getCurrentUserWithPermission({
      code: PERMISSIONS.POSTS_DELETE,
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    // Delete post (soft delete - set status to ARCHIVED)
    await deletePost(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete post failed:', error);
    return NextResponse.json(
      { error: error.message || 'Delete failed' },
      { status: 500 }
    );
  }
}
