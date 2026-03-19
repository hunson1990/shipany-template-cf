import { respOk, respErr } from '@/shared/lib/resp';
import { findAITaskByTaskId, updateAITaskById } from '@/shared/models/ai_task';
import { AITaskStatus } from '@/extensions/ai';

export async function POST(
  request: Request,
  { params }: { params: { provider: string } }
) {
  try {
    const { provider } = params;
    const body = await request.json();

    console.log(`Received callback from ${provider}:`, body);

    // Extract taskId from callback payload
    // Different providers may have different payload structures
    const taskId = body.taskId || body.id;
    if (!taskId) {
      throw new Error('taskId not found in callback payload');
    }

    // Find task in database
    const task = await findAITaskByTaskId(taskId);
    if (!task) {
      console.warn(`Task not found for taskId: ${taskId}`);
      return respOk(); // Return OK to acknowledge receipt
    }

    // Update task status based on callback
    // The actual status mapping depends on provider response
    let status = task.status;
    let taskInfo = task.taskInfo;
    let taskResult = task.taskResult;

    // Parse existing data
    if (typeof taskInfo === 'string') {
      taskInfo = JSON.parse(taskInfo);
    }
    if (typeof taskResult === 'string') {
      taskResult = JSON.parse(taskResult);
    }

    // Update based on callback payload
    if (body.status) {
      status = body.status;
    }

    if (body.progress !== undefined) {
      taskInfo = { ...taskInfo, progress: body.progress };
    }

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
    console.error(`Callback processing failed for ${params.provider}:`, e);
    return respErr(e.message);
  }
}
