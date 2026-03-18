import { respData, respErr } from '@/shared/lib/resp';
import { getAITasks } from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/models/user';
import { AITaskStatus } from '@/extensions/ai';

export async function GET(request: Request) {
  try {
    // Get current user
    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // Get user's AI tasks, sorted by creation time (newest first)
    // Exclude deleted tasks
    const tasks = await getAITasks({
      userId: user.id,
      limit: 50,
      page: 1,
    });

    // Filter out deleted tasks
    const filteredTasks = tasks.filter(task => task.status !== AITaskStatus.DELETED);

    return respData(filteredTasks);
  } catch (e: any) {
    console.error('get tasks failed', e);
    return respErr(e.message);
  }
}
