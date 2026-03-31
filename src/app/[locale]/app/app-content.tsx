'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { GenerationControlMobile } from '@/shared/blocks/landing/generation-control/mobile';
import { GenerationControlPC } from '@/shared/blocks/landing/generation-control/pc';
import { GenerationHistory } from '@/shared/blocks/landing/generation-history';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useAppContext } from '@/shared/contexts/app';
import type { Pricing as PricingSection } from '@/shared/types/blocks/pricing';
import { Pricing as PricingBlock } from '@/themes/default/blocks/pricing';

export interface AITask {
  id: string;
  userId: string;
  mediaType: string;
  provider: string;
  model: string;
  prompt: string;
  options?: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  taskId: string;
  taskInfo?: string;
  taskResult?: string;
  costCredits: number;
  scene: string;
}

interface AppContentProps {
  pricingSection: PricingSection;
}

export function AppContent({ pricingSection }: AppContentProps) {
  const { isShowPaymentModal, setIsShowPaymentModal } = useAppContext();
  const t = useTranslations('common');

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [loading, setLoading] = useState(false);
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const pollingIdsRef = useRef<Set<string>>(new Set());
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isNSFWModalOpen, setIsNSFWModalOpen] = useState(false);
  const [forceModelId, setForceModelId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const result = await response.json();
      if (result.code === 0 && result.data) {
        setTasks(result.data);
        setHistoryLoaded(true);

        const pendingTasks = result.data.filter(
          (task: AITask) =>
            task.status === 'pending' || task.status === 'processing'
        );
        setPollingIds(new Set(pendingTasks.map((task: AITask) => task.id)));
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const queryBatchTasks = useCallback(
    async (taskIds: string[]) => {
      if (taskIds.length === 0) return;

      try {
        const response = await fetch('/api/ai/tasks/query-batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskIds }),
        });

        if (!response.ok) throw new Error('Failed to query tasks');
        const result = await response.json();

        if (result.code === 0 && result.data) {
          // 检查是否有 errorCode === 400 的任务
          const hasNSFWError = result.data.some((updatedTask: any) => {
            if (updatedTask.taskInfo) {
              try {
                const taskInfo = JSON.parse(updatedTask.taskInfo);
                return String(taskInfo.errorCode) === '400';
              } catch {
                return false;
              }
            }
            return false;
          });

          // 如果检测到 NSFW 错误且弹窗未打开，显示弹窗
          if (hasNSFWError && !isNSFWModalOpen) {
            setIsNSFWModalOpen(true);
          }

          setTasks((prevTasks) => {
            const updatedTasks = [...prevTasks];
            result.data.forEach((updatedTask: any) => {
              const index = updatedTasks.findIndex(
                (t) => t.id === updatedTask.id
              );
              if (index !== -1) {
                updatedTasks[index] = {
                  ...updatedTasks[index],
                  ...updatedTask,
                };
              }
            });
            return updatedTasks;
          });

          const stillPending = result.data.filter(
            (task: any) =>
              task.status === 'pending' || task.status === 'processing'
          );
          setPollingIds(new Set(stillPending.map((task: any) => task.id)));
        }
      } catch (error) {
        console.error('Failed to query batch tasks:', error);
      }
    },
    [isNSFWModalOpen]
  );

  useEffect(() => {
    pollingIdsRef.current = pollingIds;
  }, [pollingIds]);

  useEffect(() => {
    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop) {
      fetchTasks();
    }
  }, [fetchTasks]);

  // 轮询逻辑：使用 setTimeout 替代 setInterval，避免请求堆积
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isActive = true;

    const poll = async () => {
      const currentPollingIds = Array.from(pollingIdsRef.current);
      if (currentPollingIds.length === 0 || !isActive) return;

      await queryBatchTasks(currentPollingIds);

      if (!isActive) return;

      // 请求完成后，再设置下一次轮询（至少间隔 3 秒）
      timeoutId = setTimeout(poll, 3000);
    };

    if (pollingIds.size > 0) {
      poll();
    }

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [pollingIds.size, queryBatchTasks]);

  useEffect(() => {
    if (isShowPaymentModal && !isPricingModalOpen) {
      setIsPricingModalOpen(true);
      setIsShowPaymentModal(false);
    }
  }, [isPricingModalOpen, isShowPaymentModal, setIsShowPaymentModal]);

  const handleTabChange = useCallback(
    (tab: 'create' | 'history') => {
      setActiveTab(tab);
      if (tab === 'history' && !historyLoaded) {
        fetchTasks();
      }
    },
    [historyLoaded, fetchTasks]
  );

  const handleGenerationComplete = useCallback(
    (newTask?: AITask) => {
      setActiveTab('history');
      if (newTask) {
        // 有新任务，添加到列表开头，不刷新整个列表
        setTasks((prevTasks) => [newTask, ...prevTasks]);
      } else {
        // 兼容旧逻辑，没有新任务数据时刷新列表
        fetchTasks();
      }
    },
    [fetchTasks]
  );

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
  }, []);

  return (
    <>
      <div className="bg-background hidden min-h-screen pb-48 lg:block">
        <div className="mx-auto max-w-6xl p-8">
          <div className="p-6">
            <GenerationHistory
              tasks={tasks}
              loading={loading}
              onDeleteTask={handleDeleteTask}
            />
          </div>
        </div>
        <GenerationControlPC
          onGenerationComplete={handleGenerationComplete}
          forceModelId={forceModelId}
          onModelForced={() => setForceModelId(null)}
        />
      </div>

      <div className="bg-background flex min-h-screen flex-col lg:hidden">
        <div className="bg-muted fixed top-14 right-0 left-0 z-40 flex">
          <button
            onClick={() => handleTabChange('create')}
            className={`flex-1 border-b-2 py-2 text-center text-sm transition-colors ${
              activeTab === 'create'
                ? 'text-foreground border-primary bg-white/10'
                : 'text-muted-foreground border-transparent'
            }`}
          >
            Create
          </button>
          <button
            onClick={() => handleTabChange('history')}
            className={`flex-1 border-b-2 py-2 text-center text-sm transition-colors ${
              activeTab === 'history'
                ? 'text-foreground border-primary bg-white/10'
                : 'text-muted-foreground border-transparent'
            }`}
          >
            History
          </button>
        </div>

        <div className="mt-12 flex-1 overflow-y-auto">
          {/* 使用 CSS 隐藏代替条件渲染，保持组件状态 */}
          <div className={activeTab === 'create' ? 'block' : 'hidden'}>
            <GenerationControlMobile
              onGenerationComplete={handleGenerationComplete}
              forceModelId={forceModelId}
              onModelForced={() => setForceModelId(null)}
            />
          </div>
          <div className={activeTab === 'history' ? 'block p-4' : 'hidden'}>
            <GenerationHistory
              tasks={tasks}
              loading={loading}
              onDeleteTask={handleDeleteTask}
            />
          </div>
        </div>
      </div>

      <Dialog open={isPricingModalOpen} onOpenChange={setIsPricingModalOpen}>
        <DialogContent className="h-[92vh] w-[98vw] max-w-[98vw] overflow-y-auto p-0 sm:max-w-[98vw]">
          <DialogTitle className="sr-only">Pricing</DialogTitle>
          <PricingBlock
            section={pricingSection}
            className="py-8 md:py-10"
            showHeader={false}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isNSFWModalOpen} onOpenChange={setIsNSFWModalOpen}>
        <DialogContent className="w-[90vw] max-w-md p-6">
          <DialogTitle className="text-lg font-semibold">
            {t('nsfw_modal.title')}
          </DialogTitle>
          <div className="mt-4 space-y-4">
            <p className="text-muted-foreground text-sm">
              {t('nsfw_modal.content')}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  const isMobile = window.innerWidth < 1024;
                  if (isMobile && activeTab !== 'create') {
                    setActiveTab('create');
                  }
                  setTimeout(() => {
                    setForceModelId('soul-fuse-v1-6');
                  }, 100);
                  setIsNSFWModalOpen(false);
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium"
              >
                {t('nsfw_modal.switch_model')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
