import { and, inArray, lt } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { AITaskStatus } from '@/extensions/ai';
import { respData, respErr } from '@/shared/lib/resp';
import { updateAITaskById } from '@/shared/models/ai_task';
import { getAIService } from '@/shared/services/ai';

/**
 * Cron job to sync AI task status
 * Called by cron-job.org every 5 minutes
 * Scans tasks that are pending/processing for more than 10 minutes
 * and queries provider to get real status
 */
export async function POST(req: Request) {
  try {
    // 1. Verify cron secret (prevent external calls)
    const authHeader = req.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET_KEY;

    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET_KEY not configured');
      return respErr('Cron secret not configured');
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Invalid authorization');
      return respErr('Unauthorized');
    }

    console.log('[Cron] Starting AI task sync...');

    // 2. Find timeout tasks (pending/processing for > 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const timeoutTasks = await db()
      .select()
      .from(aiTask)
      .where(
        and(
          inArray(aiTask.status, ['pending', 'processing']),
          lt(aiTask.createdAt, tenMinutesAgo)
        )
      );

    console.log(`[Cron] Found ${timeoutTasks.length} timeout tasks`);

    if (timeoutTasks.length === 0) {
      return respData({ message: 'No timeout tasks', updated: 0 });
    }

    // 3. Group tasks by provider for batch processing
    const tasksByProvider: Record<string, typeof timeoutTasks> = {};
    for (const task of timeoutTasks) {
      if (!tasksByProvider[task.provider]) {
        tasksByProvider[task.provider] = [];
      }
      tasksByProvider[task.provider].push(task);
    }

    // 4. Query each provider and update tasks
    const aiService = await getAIService();
    let updatedCount = 0;
    const errors: string[] = [];

    for (const [providerName, tasks] of Object.entries(tasksByProvider)) {
      console.log(
        `[Cron] Processing ${tasks.length} tasks for provider: ${providerName}`
      );

      const provider = aiService.getProvider(providerName);
      if (!provider) {
        console.error(`[Cron] Provider not found: ${providerName}`);
        errors.push(`Provider not found: ${providerName}`);
        continue;
      }

      if (!provider.query) {
        console.error(`[Cron] Provider ${providerName} does not support query`);
        errors.push(`Provider ${providerName} does not support query`);
        continue;
      }

      for (const task of tasks) {
        try {
          console.log(`[Cron] Querying task: ${task.id} (${task.taskId})`);

          const result = await provider.query({
            taskId: task.taskId,
            mediaType: task.mediaType,
            model: task.model,
          });

          if (!result?.taskStatus) {
            console.error(`[Cron] Query failed for task ${task.id}`);
            errors.push(`Query failed for task ${task.id}`);
            continue;
          }

          // Check if status changed
          const currentStatus = task.status as AITaskStatus;
          const newStatus = result.taskStatus;

          console.log(
            `[Cron] Task ${task.id} status: ${currentStatus} -> ${newStatus}`
          );

          // If provider says success/failed but we're still pending, update it
          if (currentStatus !== newStatus) {
            console.log(`[Cron] Updating task ${task.id} to ${newStatus}`);

            await updateAITaskById(task.id, {
              status: newStatus,
              taskInfo: result.taskInfo
                ? JSON.stringify(result.taskInfo)
                : task.taskInfo,
              taskResult: result.taskResult
                ? JSON.stringify(result.taskResult)
                : task.taskResult,
              creditId: task.creditId,
            });

            updatedCount++;
            console.log(`[Cron] Task ${task.id} updated successfully`);
          } else {
            console.log(`[Cron] Task ${task.id} status unchanged`);
          }
        } catch (error: any) {
          console.error(`[Cron] Error processing task ${task.id}:`, error);
          errors.push(`Task ${task.id}: ${error.message}`);
        }
      }
    }

    console.log(
      `[Cron] Sync completed. Updated: ${updatedCount}, Errors: ${errors.length}`
    );

    return respData({
      message: 'Sync completed',
      scanned: timeoutTasks.length,
      updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[Cron] Sync failed:', error);
    return respErr(error.message);
  }
}

// Also support GET for simple health checks
export async function GET() {
  return respData({ message: 'AI Task Sync Cron Endpoint' });
}
