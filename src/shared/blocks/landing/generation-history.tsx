'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/shared/components/ui/button';
import { RiDownloadLine, RiDeleteBin6Line } from 'react-icons/ri';
import { toast } from 'sonner';
import { VideoPlayer } from '@/shared/components/video-player';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog';

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

interface GeneratedVideo {
  id: string;
  prompt: string;
  imageUrl: string;
  videoUrl?: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  progress?: number;
  createdAt: string;
  model: string;
}

interface GenerationHistoryProps {
  videos?: GeneratedVideo[];
  isLoading?: boolean;
}

export function GenerationHistory({ videos = [], isLoading = false }: GenerationHistoryProps) {
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  console.log('GenerationHistory mounted/rendered');

  // Fetch tasks from API
  const fetchTasks = async () => {
    console.log('fetchTasks called');
    try {
      const response = await fetch('/api/ai/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const result = await response.json();
      if (result.code === 0 && result.data) {
        setTasks(result.data);

        // Find pending tasks that need polling
        const pendingTasks = result.data.filter((task: AITask) => task.status === 'pending');
        setPollingIds(new Set(pendingTasks.map((task: AITask) => task.id)));
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Query batch tasks to get latest status
  const queryBatchTasks = useCallback(async (taskIds: string[]) => {
    if (taskIds.length === 0) return;

    console.log('queryBatchTasks called with taskIds:', taskIds, 'at', new Date().toLocaleTimeString());

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

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, []);

  const pollingIdsRef = useRef<Set<string>>(new Set());

  // 更新 ref 当 pollingIds 变化时
  useEffect(() => {
    pollingIdsRef.current = pollingIds;
  }, [pollingIds]);

  // Poll for pending tasks
  useEffect(() => {
    const hasPollingTasks = pollingIds.size > 0;
    if (!hasPollingTasks) return;

    console.log('Setting up polling interval for taskIds:', Array.from(pollingIds), 'at', new Date().toLocaleTimeString());

    // 立即执行一次查询
    queryBatchTasks(Array.from(pollingIds));

    const interval = setInterval(() => {
      console.log('Polling interval triggered at', new Date().toLocaleTimeString());
      queryBatchTasks(Array.from(pollingIdsRef.current));
    }, 3000); // Poll every 3 seconds

    return () => {
      console.log('Clearing polling interval at', new Date().toLocaleTimeString());
      clearInterval(interval);
    };
  }, [pollingIds.size > 0, queryBatchTasks]);

  const handleDownload = async (task: AITask) => {
    try {
      const taskResult = task.taskResult ? JSON.parse(task.taskResult) : null;
      const videoUrl = taskResult?.videoInfo?.videoUrl;

      if (!videoUrl) {
        toast.error('Video URL not available');
        return;
      }

      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-${task.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Video downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download video');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      const response = await fetch(`/api/ai/tasks/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setTasks(tasks.filter(task => task.id !== id));
        toast.success('Video deleted successfully');
      } else {
        toast.error('Failed to delete video');
      }
    } catch (error) {
      toast.error('Failed to delete video');
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your videos...</p>
        </div>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No videos generated yet</p>
          <p className="text-sm text-muted-foreground">Start creating videos to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {tasks.map((task) => {
          const taskResult = task.taskResult ? JSON.parse(task.taskResult) : null;
          const videoUrl = taskResult?.videoInfo?.videoUrl;
          const imageUrl = task.options ? JSON.parse(task.options).imageUrl : '';
          const isPending = task.status === 'pending';
          const isSuccess = task.status === 'success';
          const isFailed = task.status === 'failed';

          return (
            <div
              key={task.id}
              className="bg-muted/50 border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-all duration-300"
            >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">AI</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>{task.model}</span>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(task.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                {isSuccess && (
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                    Completed
                  </span>
                )}
                {isPending && (
                  <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing
                  </span>
                )}
                {isFailed && (
                  <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">
                    Failed
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Prompt with Image */}
              {task.prompt && (
                <div className="flex gap-3">
                  {imageUrl && (
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-muted relative">
                      <Image
                        src={imageUrl}
                        alt="Input"
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 text-sm text-muted-foreground leading-relaxed">
                    {task.prompt}
                  </div>
                </div>
              )}

              {/* Processing Status */}
              {isPending && (
                <div className="space-y-2">
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${task.taskInfo ? (JSON.parse(task.taskInfo).progress || 0) : 30}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      AI is generating your video, this may take a few minutes...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {task.taskInfo ? `${JSON.parse(task.taskInfo).progress || 0}%` : '0%'}
                    </p>
                  </div>
                </div>
              )}

              {/* Video Preview */}
              {isSuccess && videoUrl && (
                <div className="w-full md:w-1/2 space-y-2">
                  <VideoPlayer src={videoUrl} className="overflow-hidden w-full h-auto" />
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-muted-foreground border-muted hover:bg-primary hover:text-white hover:border-primary h-7 text-xs px-2"
                      onClick={() => handleDownload(task)}
                    >
                      <RiDownloadLine className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-muted-foreground border-muted hover:bg-primary hover:text-white hover:border-primary h-7 text-xs px-2"
                      onClick={() => setDeleteConfirmId(task.id)}
                      disabled={deletingId === task.id}
                    >
                      <RiDeleteBin6Line className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Failed Status */}
              {isFailed && (
                <div className="w-full md:w-1/2 space-y-2">
                  <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden">
                    {imageUrl ? (
                      <>
                        <Image
                          src={imageUrl}
                          alt="Failed generation"
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <p className="text-red-400 text-sm font-medium">Video generation failed</p>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <p className="text-red-400 text-sm">Video generation failed</p>
                      </div>
                    )}
                  </div>
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-muted-foreground border-muted hover:bg-primary hover:text-white hover:border-primary h-7 text-xs px-2"
                      onClick={() => setDeleteConfirmId(task.id)}
                      disabled={deletingId === task.id}
                    >
                      <RiDeleteBin6Line className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Video</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this video? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={deletingId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deletingId !== null}
            >
              {deletingId !== null ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
