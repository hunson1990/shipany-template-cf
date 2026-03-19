'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useImageUpload } from '@/shared/context/ImageUploadContext';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { GenerationHistory } from '@/shared/blocks/landing/generation-history';
import { GenerationControlPC } from '@/shared/blocks/landing/generation-control/pc';
import { GenerationControlMobile } from '@/shared/blocks/landing/generation-control/mobile';

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
  mockVideos: any[];
}

export function AppContent({ mockVideos }: AppContentProps) {
  const searchParams = useSearchParams();
  const { imageFile, imagePreviewUrl } = useImageUpload();
  const isDesktopQuery = useMediaQuery('(min-width: 1024px)');
  const isDesktop = isDesktopQuery === true;
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [loading, setLoading] = useState(false);
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const pollingIdsRef = useRef<Set<string>>(new Set());

  // Get initial data from Context and sessionStorage
  const initialPrompt = typeof window !== 'undefined' ? sessionStorage.getItem('initialPrompt') || '' : '';
  const shouldEditImageFromStorage = typeof window !== 'undefined' ? sessionStorage.getItem('shouldEditImage') === 'true' : false;
  const shouldEditImage = shouldEditImageFromStorage && !!imageFile && !!imagePreviewUrl;

  // Clear sessionStorage after reading
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('initialPrompt');
      sessionStorage.removeItem('shouldEditImage');
    }
  }, []);

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const result = await response.json();
      if (result.code === 0 && result.data) {
        setTasks(result.data);
        setHistoryLoaded(true);

        // Find pending tasks that need polling
        const pendingTasks = result.data.filter((task: AITask) => task.status === 'pending');
        setPollingIds(new Set(pendingTasks.map((task: AITask) => task.id)));
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Query batch tasks to get latest status
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
        // Update tasks with latest status
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

        // Update polling IDs - remove completed tasks
        const stillPending = result.data.filter(
          (task: any) => task.status === 'pending'
        );
        setPollingIds(new Set(stillPending.map((task: any) => task.id)));
      }
    } catch (error) {
      console.error('Failed to query batch tasks:', error);
    }
  }, []);

  // Update ref when pollingIds changes
  useEffect(() => {
    pollingIdsRef.current = pollingIds;
  }, [pollingIds]);

  // PC: Initial fetch on mount
  useEffect(() => {
    // Only fetch on mount for PC (desktop)
    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop) {
      fetchTasks();
    }
  }, [fetchTasks]);

  // Poll for pending tasks (only when history is loaded)
  useEffect(() => {
    const hasPollingTasks = pollingIds.size > 0;
    if (!hasPollingTasks) return;

    // Execute immediately
    queryBatchTasks(Array.from(pollingIds));

    const interval = setInterval(() => {
      queryBatchTasks(Array.from(pollingIdsRef.current));
    }, 3000); // Poll every 3 seconds

    return () => {
      clearInterval(interval);
    };
  }, [pollingIds.size > 0, queryBatchTasks]);

  const handleTabChange = useCallback((tab: 'create' | 'history') => {
    setActiveTab(tab);
    // Fetch tasks when switching to history tab on mobile
    if (tab === 'history' && !historyLoaded) {
      fetchTasks();
    }
  }, [historyLoaded, fetchTasks]);

  const handleGenerationComplete = useCallback(() => {
    // Switch to history tab on mobile
    setActiveTab('history');
    // Refresh tasks
    fetchTasks();
  }, [fetchTasks]);

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
  }, []);

  return (
    <>
      {/* Desktop Layout (>= 1024px) */}
      {isDesktop && (
        <div className="min-h-screen bg-background pb-48">
          {/* Desktop Layout */}
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
            initialPrompt={initialPrompt}
            initialImageFile={imageFile}
            initialImageUrl={imagePreviewUrl || ''}
            shouldEditImage={shouldEditImage}
          />
        </div>
      )}

      {/* Mobile Layout (< 1024px) */}
      {!isDesktop && (
        <div className="min-h-screen bg-background flex flex-col">
          {/* Mobile Layout */}
          {/* Tab Navigation - Fixed below header */}
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

          {/* Tab Content - Add margin top to account for fixed tab */}
          <div className="flex-1 overflow-y-auto mt-12">
            {activeTab === 'create' && (
              <GenerationControlMobile
                onGenerationComplete={handleGenerationComplete}
                initialPrompt={initialPrompt}
                initialImageFile={imageFile}
                initialImageUrl={imagePreviewUrl || ''}
                shouldEditImage={shouldEditImage}
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
      )}
    </>
  );
}
