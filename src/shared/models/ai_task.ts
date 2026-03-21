import { and, count, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask, credit } from '@/config/db/schema';
import { AITaskStatus } from '@/extensions/ai';
import { appendUserToResult, User } from '@/shared/models/user';

import { consumeCredits, CreditStatus } from './credit';

export type AITask = typeof aiTask.$inferSelect & {
  user?: User;
};
export type NewAITask = typeof aiTask.$inferInsert;
export type UpdateAITask = Partial<Omit<NewAITask, 'id' | 'createdAt'>>;

export async function createAITask(newAITask: NewAITask) {
  const result = await db().transaction(async (tx: any) => {
    // 1. create task record
    const [taskResult] = await tx.insert(aiTask).values(newAITask).returning();

    if (newAITask.costCredits && newAITask.costCredits > 0) {
      // 2. consume credits
      const consumedCredit = await consumeCredits({
        userId: newAITask.userId,
        credits: newAITask.costCredits,
        scene: newAITask.scene,
        description: `generate ${newAITask.mediaType}`,
        metadata: JSON.stringify({
          type: 'ai-task',
          mediaType: taskResult.mediaType,
          taskId: taskResult.id,
        }),
        tx,
      });

      // 3. update task record with consumed credit id
      if (consumedCredit && consumedCredit.id) {
        taskResult.creditId = consumedCredit.id;
        await tx
          .update(aiTask)
          .set({ creditId: consumedCredit.id })
          .where(eq(aiTask.id, taskResult.id));
      }
    }

    return taskResult;
  });

  return result;
}

export async function findAITaskById(id: string) {
  const [result] = await db().select().from(aiTask).where(eq(aiTask.id, id));
  return result;
}

export async function findAITaskByTaskId(taskId: string) {
  const [result] = await db().select().from(aiTask).where(eq(aiTask.taskId, taskId));
  return result;
}

export async function updateAITaskById(id: string, updateAITask: UpdateAITask) {
  console.log('[updateAITaskById] Start - taskId:', id, 'status:', updateAITask.status);

  const result = await db().transaction(async (tx: any) => {
    // 如果任务失败，需要退回已消费的积分
    if (updateAITask.status === AITaskStatus.FAILED && updateAITask.creditId) {
      console.log('[updateAITaskById] Task FAILED - creditId:', updateAITask.creditId);

      // 1. 获取该任务消费的积分记录
      const [consumedCredit] = await tx
        .select()
        .from(credit)
        .where(eq(credit.id, updateAITask.creditId));

      console.log('[updateAITaskById] Found consumedCredit:', consumedCredit?.id, 'status:', consumedCredit?.status);

      if (consumedCredit && consumedCredit.status === CreditStatus.ACTIVE) {
        console.log('[updateAITaskById] Credit status is ACTIVE, processing refund...');

        // 2. 解析消费详情，获取所有被消费的积分项
        const consumedItems = JSON.parse(consumedCredit.consumedDetail || '[]');
        console.log('[updateAITaskById] Consumed items count:', consumedItems.length);

        // 3. 将消费的积分加回到用户账户
        await Promise.all(
          consumedItems.map((item: any) => {
            if (item && item.creditId && item.creditsConsumed > 0) {
              console.log('[updateAITaskById] Refunding credits:', item.creditsConsumed, 'to creditId:', item.creditId);
              return tx
                .update(credit)
                .set({
                  remainingCredits: sql`${credit.remainingCredits} + ${item.creditsConsumed}`,
                })
                .where(eq(credit.id, item.creditId));
            }
          })
        );

        // 4. 标记该消费记录为已删除（逻辑删除）
        console.log('[updateAITaskById] Marking credit as DELETED');
        await tx
          .update(credit)
          .set({
            status: CreditStatus.DELETED,
          })
          .where(eq(credit.id, updateAITask.creditId));
      } else {
        console.log('[updateAITaskById] Credit not found or status is not ACTIVE, skipping refund');
      }
    } else {
      console.log('[updateAITaskById] Task not FAILED or no creditId, skipping refund logic');
    }

    // 5. 更新任务记录（状态、任务信息、任务结果等）
    console.log('[updateAITaskById] Updating task record with status:', updateAITask.status);
    const [result] = await tx
      .update(aiTask)
      .set(updateAITask)
      .where(eq(aiTask.id, id))
      .returning();

    console.log('[updateAITaskById] Task updated successfully');
    return result;
  });

  return result;
}

export async function getAITasksCount({
  userId,
  status,
  mediaType,
  provider,
}: {
  userId?: string;
  status?: string;
  mediaType?: string;
  provider?: string;
}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(aiTask)
    .where(
      and(
        userId ? eq(aiTask.userId, userId) : undefined,
        mediaType ? eq(aiTask.mediaType, mediaType) : undefined,
        provider ? eq(aiTask.provider, provider) : undefined,
        status ? eq(aiTask.status, status) : undefined
      )
    );

  return result?.count || 0;
}

export async function deleteLogicAITaskById(id: string) {
  // 逻辑删除：同时设置 deletedAt 和 status 为 deleted
  const [result] = await db()
    .update(aiTask)
    .set({
      deletedAt: new Date(),
      status: AITaskStatus.DELETED
    })
    .where(eq(aiTask.id, id))
    .returning();

  return result;
}

export async function getAITasks({
  userId,
  status,
  mediaType,
  provider,
  page = 1,
  limit = 30,
  getUser = false,
}: {
  userId?: string;
  status?: string;
  mediaType?: string;
  provider?: string;
  page?: number;
  limit?: number;
  getUser?: boolean;
}): Promise<AITask[]> {
  const result = await db()
    .select()
    .from(aiTask)
    .where(
      and(
        userId ? eq(aiTask.userId, userId) : undefined,
        mediaType ? eq(aiTask.mediaType, mediaType) : undefined,
        provider ? eq(aiTask.provider, provider) : undefined,
        status ? eq(aiTask.status, status) : undefined
      )
    )
    .orderBy(desc(aiTask.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}
