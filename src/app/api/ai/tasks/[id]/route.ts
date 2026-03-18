import { respOk, respErr } from '@/shared/lib/resp';
import { findAITaskById, deleteLogicAITaskById } from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/models/user';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;

    // Get current user
    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // Get task
    const task = await findAITaskById(taskId);
    if (!task) {
      throw new Error('task not found');
    }

    // Check if task belongs to current user
    if (task.userId !== user.id) {
      throw new Error('unauthorized');
    }

    // Logic delete by setting deletedAt
    await deleteLogicAITaskById(taskId);

    return respOk();
  } catch (e: any) {
    console.error('delete task failed', e);
    return respErr(e.message);
  }
}
