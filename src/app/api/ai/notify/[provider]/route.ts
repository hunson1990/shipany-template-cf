import { respOk, respErr } from '@/shared/lib/resp';
import { findAITaskByTaskId, updateAITaskById } from '@/shared/models/ai_task';
import { AITaskStatus } from '@/extensions/ai';

interface ProviderHandler {
  mapStatus(body: any): AITaskStatus;
  getErrorMessage(body: any): string | undefined;
}

const providerHandlers: Record<string, ProviderHandler> = {
  kie: {
    mapStatus: (body) => {
      if (body.code === 200) return AITaskStatus.SUCCESS;
      if (body.code === 400) return AITaskStatus.FAILED;
      return AITaskStatus.PENDING;
    },
    getErrorMessage: (body) => body.msg,
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
  },
};

function getProviderHandler(provider: string): ProviderHandler {
  return (
    providerHandlers[provider] || {
      mapStatus: (body) => body.status || AITaskStatus.PENDING,
      getErrorMessage: () => undefined,
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
    if (!taskId) {
      throw new Error('taskId not found in callback payload');
    }

    // Find task in database
    const task = await findAITaskByTaskId(taskId);
    if (!task) {
      console.warn(`Task not found for taskId: ${taskId}`);
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

    // Store error message if task failed
    if (status === AITaskStatus.FAILED) {
      const errorMessage = handler.getErrorMessage(body);
      if (errorMessage) {
        taskInfo = { ...taskInfo, errorMessage };
      }
    }

    // Update progress if provided
    if (body.progress !== undefined) {
      taskInfo = { ...taskInfo, progress: body.progress };
    }

    // Update result if provided
    if (body.result) {
      taskResult = { ...taskResult, ...body.result };
    }

    // Update task in database
    await updateAITaskById(task.id, {
      status,
      taskInfo: taskInfo ? JSON.stringify(taskInfo) : null,
      taskResult: taskResult ? JSON.stringify(taskResult) : null,
      creditId: task.creditId,
    });

    console.log(`Task ${task.id} updated with status: ${status}`);
    return respOk();
  } catch (e: any) {
    console.error(`Callback processing failed for ${provider}:`, e);
    return respErr(e.message);
  }
}
