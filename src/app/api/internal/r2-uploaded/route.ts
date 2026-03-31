import { AIImage, AITaskInfo, AIVideo } from '@/extensions/ai';
import { respErr, respOk } from '@/shared/lib/resp';
import { findAITaskByTaskId, updateAITaskById } from '@/shared/models/ai_task';

/**
 * Internal API for Inngest to call back after R2 upload completes
 * This is called by the Inngest function after uploading video/image to R2
 */
export async function POST(req: Request) {
  try {
    // Verify internal API secret
    const authHeader = req.headers.get('Authorization');
    if (
      !authHeader ||
      authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`
    ) {
      return respErr('Unauthorized');
    }

    const body = await req.json();
    const { taskId, r2Url, mediaType, status, errorMessage } = body;

    console.log(`[Internal API] R2 upload callback received:`, {
      taskId,
      status,
      mediaType,
      r2Url,
    });

    // Find the task
    const task = await findAITaskByTaskId(taskId);
    if (!task) {
      console.warn(`[Internal API] Task not found: ${taskId}`);
      return respOk(); // Return 200 to avoid Inngest retry
    }

    // Parse existing taskInfo
    let taskInfo: AITaskInfo = task.taskInfo || {};
    if (typeof taskInfo === 'string') {
      taskInfo = JSON.parse(taskInfo);
    }

    if (status === 'completed' && r2Url) {
      // Update the URL in taskInfo to use R2 URL
      if (mediaType === 'video' && taskInfo.videos) {
        taskInfo.videos = taskInfo.videos.map((v: AIVideo) => ({
          ...v,
          videoUrl: r2Url, // Replace with R2 URL
        }));
      } else if (mediaType === 'image' && taskInfo.images) {
        taskInfo.images = taskInfo.images.map((i: AIImage) => ({
          ...i,
          imageUrl: r2Url, // Replace with R2 URL
        }));
      }

      // Add R2 metadata
      taskInfo.r2Status = 'completed';
      taskInfo.r2Url = r2Url;
    } else if (status === 'failed') {
      taskInfo.r2Status = 'failed';
      taskInfo.r2Error = errorMessage;
    }

    // Update database
    await updateAITaskById(task.id, {
      taskInfo: JSON.stringify(taskInfo),
    });

    console.log(`[Internal API] Task ${task.id} updated with R2 URL: ${r2Url}`);

    return respOk();
  } catch (e: any) {
    console.error('[Internal API] Failed to process R2 upload callback:', e);
    return respErr(e.message);
  }
}
