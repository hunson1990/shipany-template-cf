import { inngest } from '@/lib/inngest';

import { AIImage, AITaskInfo, AITaskStatus, AIVideo } from '@/extensions/ai';
import { respErr, respOk } from '@/shared/lib/resp';
import {
  findAITaskByTaskId,
  UpdateAITask,
  updateAITaskById,
} from '@/shared/models/ai_task';

interface ProviderHandler {
  mapStatus(body: any): AITaskStatus;
  getErrorMessage(body: any): string | undefined;
  getTaskInfo(body: any, existingInfo?: AITaskInfo): AITaskInfo;
  getTaskResult(body: any): any;
}

const providerHandlers: Record<string, ProviderHandler> = {
  kie: {
    mapStatus: (body) => {
      if (body.code === 200) return AITaskStatus.SUCCESS;
      if (body.code === 400) return AITaskStatus.FAILED;
      return AITaskStatus.PENDING;
    },
    getErrorMessage: (body) => body.msg,
    getTaskInfo: (body, existingInfo) => {
      const info: AITaskInfo = existingInfo ? { ...existingInfo } : {};
      const data = body.data;

      if (data) {
        const images: AIImage[] = [];
        const videos: AIVideo[] = [];

        if (data.image_url) {
          images.push({
            imageUrl: data.image_url,
            imageType: 'image',
          });
        }

        if (data.video_url) {
          videos.push({
            videoUrl: data.video_url,
          });
        }

        if (images.length > 0) {
          info.images = images;
        }
        if (videos.length > 0) {
          info.videos = videos;
        }
      }

      return info;
    },
    getTaskResult: (body) => body,
  },
  replicate: {
    mapStatus: (body) => {
      const status = body.status?.toLowerCase();
      const statusMap: Record<string, AITaskStatus> = {
        succeeded: AITaskStatus.SUCCESS,
        failed: AITaskStatus.FAILED,
        canceled: AITaskStatus.CANCELED,
        processing: AITaskStatus.PROCESSING,
        starting: AITaskStatus.PROCESSING,
      };
      return statusMap[status] || AITaskStatus.PENDING;
    },
    getErrorMessage: (body) => body.error,
    getTaskInfo: (body, existingInfo) => existingInfo || {},
    getTaskResult: (body) => body,
  },
  fal: {
    mapStatus: (body) => {
      const status = body.status?.toUpperCase();
      const statusMap: Record<string, AITaskStatus> = {
        COMPLETED: AITaskStatus.SUCCESS,
        FAILED: AITaskStatus.FAILED,
        IN_PROGRESS: AITaskStatus.PROCESSING,
        IN_QUEUE: AITaskStatus.PROCESSING,
      };
      return statusMap[status] || AITaskStatus.PENDING;
    },
    getErrorMessage: (body) => body.error,
    getTaskInfo: (body, existingInfo) => existingInfo || {},
    getTaskResult: (body) => body,
  },
  pollo: {
    mapStatus: (body) => {
      const status = body.status?.toLowerCase();
      const statusMap: Record<string, AITaskStatus> = {
        succeed: AITaskStatus.SUCCESS,
        failed: AITaskStatus.FAILED,
        processing: AITaskStatus.PROCESSING,
        pending: AITaskStatus.PENDING,
      };
      return statusMap[status] || AITaskStatus.PENDING;
    },
    getErrorMessage: (body) => body.failMsg,
    getTaskInfo: (body, existingInfo) => {
      const info: AITaskInfo = existingInfo ? { ...existingInfo } : {};

      if (body.generations && Array.isArray(body.generations)) {
        const images: AIImage[] = [];
        const videos: AIVideo[] = [];

        for (const gen of body.generations) {
          if (gen.status === 'succeed' && gen.url) {
            if (gen.mediaType === 'video') {
              videos.push({
                id: gen.id,
                videoUrl: gen.url,
                createTime: gen.createdDate
                  ? new Date(gen.createdDate)
                  : new Date(),
              });
            } else if (gen.mediaType === 'image') {
              images.push({
                id: gen.id,
                imageUrl: gen.url,
                imageType: gen.mediaType,
                createTime: gen.createdDate
                  ? new Date(gen.createdDate)
                  : new Date(),
              });
            }
          }
        }

        if (images.length > 0) {
          info.images = images;
        }
        if (videos.length > 0) {
          info.videos = videos;
        }
      }

      return info;
    },
    getTaskResult: (body) => body,
  },
};

function getProviderHandler(provider: string): ProviderHandler {
  return (
    providerHandlers[provider] || {
      mapStatus: (body) => {
        const status = body.status?.toLowerCase();
        const statusMap: Record<string, AITaskStatus> = {
          succeed: AITaskStatus.SUCCESS,
          success: AITaskStatus.SUCCESS,
          failed: AITaskStatus.FAILED,
          fail: AITaskStatus.FAILED,
          processing: AITaskStatus.PROCESSING,
          pending: AITaskStatus.PENDING,
        };
        return statusMap[status] || AITaskStatus.PENDING;
      },
      getErrorMessage: (body) => body.error || body.failMsg || body.msg,
      getTaskInfo: (body, existingInfo) => existingInfo || {},
      getTaskResult: (body) => body,
    }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  try {
    const body = await request.json();

    console.log(`Received callback from ${provider}:`, body);

    // Extract taskId from callback payload
    const taskId = body.taskId || body.id || body.data?.task_id;
    console.log(`[${provider}] Extracted taskId:`, taskId);
    if (!taskId) {
      console.error(
        `[${provider}] taskId not found in callback payload:`,
        body
      );
      throw new Error('taskId not found in callback payload');
    }

    // Find task in database
    const task = await findAITaskByTaskId(taskId);
    console.log(
      `[${provider}] Found task:`,
      task
        ? { id: task.id, provider: task.provider, status: task.status }
        : null
    );
    if (!task) {
      console.warn(`[${provider}] Task not found for taskId: ${taskId}`);
      return respOk();
    }

    // Parse existing data
    let taskInfo = task.taskInfo;
    let taskResult = task.taskResult;

    if (typeof taskInfo === 'string') {
      taskInfo = JSON.parse(taskInfo);
    }
    if (typeof taskResult === 'string') {
      taskResult = JSON.parse(taskResult);
    }

    // Map status using provider-specific handler
    const handler = getProviderHandler(provider);
    const status = handler.mapStatus(body);
    console.log(
      `[${provider}] Mapped status:`,
      status,
      '| Raw status:',
      body.status || body.code
    );

    // Store error message if task failed
    if (status === AITaskStatus.FAILED) {
      const errorMessage = handler.getErrorMessage(body);
      console.log(`[${provider}] Task failed, errorMessage:`, errorMessage);
      if (errorMessage) {
        taskInfo = { ...taskInfo, errorMessage };
      }
    }

    // Update progress if provided
    if (body.progress !== undefined) {
      console.log(`[${provider}] Progress update:`, body.progress);
      taskInfo = { ...taskInfo, progress: body.progress };
    }

    // Get provider-specific task info (images/videos)
    const providerTaskInfo = handler.getTaskInfo(body, taskInfo);
    console.log(`[${provider}] Provider taskInfo:`, providerTaskInfo);
    if (providerTaskInfo) {
      taskInfo = { ...taskInfo, ...providerTaskInfo };
    }

    // Update result
    taskResult = handler.getTaskResult(body);
    console.log(`[${provider}] Provider taskResult:`, taskResult);

    // Prepare update data
    const updateAITask: UpdateAITask = {
      status,
      taskInfo: taskInfo ? JSON.stringify(taskInfo) : null,
      taskResult: taskResult ? JSON.stringify(taskResult) : null,
      creditId: task.creditId,
    };

    // Only update if data changed
    if (
      updateAITask.status !== task.status ||
      updateAITask.taskInfo !== task.taskInfo ||
      updateAITask.taskResult !== task.taskResult
    ) {
      console.log('更新task:', task.id, updateAITask);
      await updateAITaskById(task.id, updateAITask);
      console.log(`Task ${task.id} updated with status: ${status}`);
    } else {
      console.log(`Task ${task.id} no changes, skip update`);
    }

    // Trigger R2 upload for successful video/image tasks
    if (status === AITaskStatus.SUCCESS && taskInfo) {
      const videoUrl = taskInfo.videos?.[0]?.videoUrl;
      const imageUrl = taskInfo.images?.[0]?.imageUrl;
      const mediaUrl = videoUrl || imageUrl;
      const mediaType = videoUrl ? 'video' : imageUrl ? 'image' : null;

      if (mediaUrl && mediaType) {
        console.log(
          `[${provider}] Triggering R2 upload for ${mediaType}:`,
          mediaUrl
        );

        // Fire-and-forget: don't await, let Inngest handle it asynchronously
        inngest
          .send({
            name: 'ai/video.upload-to-r2',
            data: {
              videoUrl: mediaUrl,
              taskId: task.taskId,
              mediaType,
            },
          })
          .catch((err) => {
            console.error(
              `[${provider}] Failed to trigger Inngest upload:`,
              err
            );
          });
      }
    }

    return respOk();
  } catch (e: any) {
    console.error(`Callback processing failed for ${provider}:`, e);
    return respErr(e.message);
  }
}
