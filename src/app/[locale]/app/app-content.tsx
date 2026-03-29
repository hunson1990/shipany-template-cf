'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppContext } from '@/shared/contexts/app';
import { GenerationHistory } from '@/shared/blocks/landing/generation-history';
import { GenerationControlPC } from '@/shared/blocks/landing/generation-control/pc';
import { GenerationControlMobile } from '@/shared/blocks/landing/generation-control/mobile';
import { Pricing as PricingBlock } from '@/themes/default/blocks/pricing';
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog';
import type { Pricing as PricingSection } from '@/shared/types/blocks/pricing';

interface AITask {
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

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [loading, setLoading] = useState(false);
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const pollingIdsRef = useRef<Set<string>>(new Set());
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

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
          (task: AITask) => task.status === 'pending' || task.status === 'processing'
        );
        setPollingIds(new Set(pendingTasks.map((task: AITask) => task.id)));
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const queryBatchTasks = useCallback(async (taskIds: string[]) => {
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
        setTasks((prevTasks) => {
          const updatedTasks = [...prevTasks];
          result.data.forEach((updatedTask: any) => {
            const index = updatedTasks.findIndex((t) => t.id === updatedTask.id);
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
          (task: any) => task.status === 'pending' || task.status === 'processing'
        );
        setPollingIds(new Set(stillPending.map((task: any) => task.id)));
      }
    } catch (error) {
      console.error('Failed to query batch tasks:', error);
    }
  }, []);

  useEffect(() => {
    pollingIdsRef.current = pollingIds;
  }, [pollingIds]);

  useEffect(() => {
    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop) {
      fetchTasks();
    }
  }, [fetchTasks]);

  useEffect(() => {
    const hasPollingTasks = pollingIds.size > 0;
    if (!hasPollingTasks) return;

    queryBatchTasks(Array.from(pollingIds));

    const interval = setInterval(() => {
      queryBatchTasks(Array.from(pollingIdsRef.current));
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [pollingIds.size > 0, queryBatchTasks]);

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

  const handleGenerationComplete = useCallback(() => {
    setActiveTab('history');
    fetchTasks();
  }, [fetchTasks]);

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
  }, []);

  return (
    <>
      <div className="hidden lg:block min-h-screen bg-background pb-48">
        <div className="mx-auto max-w-6xl p-8">
          <div className="p-6">
            <GenerationHistory
              tasks={tasks}
              loading={loading}
              onDeleteTask={handleDeleteTask}
            />
          </div>
        </div>
        <GenerationControlPC onGenerationComplete={handleGenerationComplete} />
      </div>

      <div className="lg:hidden min-h-screen bg-background flex flex-col">
        <div className="fixed top-14 left-0 right-0 flex bg-muted z-40">
          <button
            onClick={() => handleTabChange('create')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 text-sm ${
              activeTab === 'create'
                ? 'text-foreground border-primary bg-white/10'
                : 'text-muted-foreground border-transparent'
            }`}
          >
            Create
          </button>
          <button
            onClick={() => handleTabChange('history')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 text-sm ${
              activeTab === 'history'
                ? 'text-foreground border-primary bg-white/10'
                : 'text-muted-foreground border-transparent'
            }`}
          >
            History
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mt-12">
          {activeTab === 'create' && (
            <GenerationControlMobile
              onGenerationComplete={handleGenerationComplete}
            />
          )}
          {activeTab === 'history' && (
            <div className="p-4">
              <GenerationHistory
                tasks={tasks}
                loading={loading}
                onDeleteTask={handleDeleteTask}
              />
            </div>
          )}
        </div>
      </div>

      <Dialog open={isPricingModalOpen} onOpenChange={setIsPricingModalOpen}>
        <DialogContent className="h-[92vh] w-[98vw] max-w-[98vw] sm:max-w-[98vw] overflow-y-auto p-0">
 <DialogTitle className="sr-only">Pricing</DialogTitle>
          <PricingBlock
 section={pricingSection}
 className="py-8 md:py-10"
 showHeader={false}
 />
        </DialogContent>
      </Dialog>
    </>
  );
}
