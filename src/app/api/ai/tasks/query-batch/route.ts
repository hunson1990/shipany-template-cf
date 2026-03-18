import { respData, respErr } from '@/shared/lib/resp';
import { findAITaskById, updateAITaskById } from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';

export async function POST(req: Request) {
  try {
    const { taskIds } = await req.json();
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return respErr('invalid params');
    }

    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const aiService = await getAIService();
    const results = [];

    // Query each task
    for (const taskId of taskIds) {
      try {
        const task = await findAITaskById(taskId);
        if (!task || !task.taskId) {
          results.push({ id: taskId, error: 'task not found' });
          continue;
        }

        // Check permission
        if (task.userId !== user.id) {
          results.push({ id: taskId, error: 'no permission' });
          continue;
        }

        const aiProvider = aiService.getProvider(task.provider);
        if (!aiProvider) {
          results.push({ id: taskId, error: 'invalid ai provider' });
          continue;
        }

        const result = await aiProvider?.query?.({
          taskId: task.taskId,
          mediaType: task.mediaType,
          model: task.model,
        });

        if (!result?.taskStatus) {
          results.push({ id: taskId, error: 'query ai task failed' });
          continue;
        }

        // Update task in database
        const updateData = {
          status: result.taskStatus,
          taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
          taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
          creditId: task.creditId,
        };

        if (updateData.taskInfo !== task.taskInfo) {
          await updateAITaskById(task.id, updateData);
        }

        // Return updated task
        results.push({
          id: taskId,
          ...task,
          status: updateData.status,
          taskInfo: updateData.taskInfo,
          taskResult: updateData.taskResult,
        });
      } catch (e: any) {
        console.error(`query task ${taskId} failed:`, e);
        results.push({ id: taskId, error: e.message });
      }
    }

    return respData(results);
  } catch (e: any) {
    console.error('batch query failed', e);
    return respErr(e.message);
  }
}
