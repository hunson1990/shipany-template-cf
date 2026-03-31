'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { RiDeleteBin6Line, RiDownloadLine } from 'react-icons/ri';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { VideoPlayer } from '@/shared/components/video-player';

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
  tasks?: AITask[];
  loading?: boolean;
  onDeleteTask?: (taskId: string) => void;
}

export function GenerationHistory({
  tasks = [],
  loading = false,
  onDeleteTask,
}: GenerationHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
      const response = await fetch(`/api/ai/tasks/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        onDeleteTask?.(id);
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
      <div className="bg-muted/50 border-border overflow-hidden rounded-lg border">
        {/* Header 骨架 */}
        <div className="border-border border-b p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="bg-muted-foreground/20 h-6 w-6 rounded-full" />
            <div className="flex flex-1 items-center gap-2">
              <Skeleton className="bg-muted-foreground/20 h-4 w-24" />
              <Skeleton className="bg-muted-foreground/20 h-4 w-2" />
              <Skeleton className="bg-muted-foreground/20 h-4 w-32" />
            </div>
            <Skeleton className="bg-muted-foreground/20 h-5 w-20 rounded" />
          </div>
        </div>
        {/* Content 骨架 */}
        <div className="space-y-4 p-4">
          <div className="flex gap-3">
            <Skeleton className="bg-muted-foreground/20 h-12 w-12 flex-shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="bg-muted-foreground/20 h-3 w-full" />
              <Skeleton className="bg-muted-foreground/20 h-3 w-3/4" />
            </div>
          </div>
          <Skeleton className="bg-muted-foreground/20 h-2 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="bg-muted-foreground/20 h-3 w-48" />
            <Skeleton className="bg-muted-foreground/20 h-3 w-8" />
          </div>
        </div>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No videos generated yet</p>
          <p className="text-muted-foreground text-sm">
            Start creating videos to see them here
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {tasks.map((task) => {
          const taskInfo = task.taskInfo ? JSON.parse(task.taskInfo) : null;
          const videoUrl = taskInfo?.videos?.[0]?.videoUrl;
          const imageUrl = task.options
            ? JSON.parse(task.options).imageUrl
            : '';
          const isPending =
            task.status === 'pending' || task.status === 'processing';
          const isSuccess = task.status === 'success';
          const isFailed = task.status === 'failed';

          return (
            <div
              key={task.id}
              className="bg-muted/50 border-border hover:border-primary/50 overflow-hidden rounded-lg border transition-all duration-300"
            >
              {/* Header */}
              <div className="border-border border-b p-4">
                <div className="flex items-center gap-3">
                  <div className="from-primary to-accent flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br">
                    <span className="text-xs font-medium text-white">AI</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span>{task.model}</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(task.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {isSuccess && (
                    <span className="rounded bg-green-500/20 px-2 py-1 text-xs text-green-400">
                      Completed
                    </span>
                  )}
                  {isPending && (
                    <span className="flex items-center gap-1 rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing
                    </span>
                  )}
                  {isFailed && (
                    <span className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-400">
                      Failed
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="space-y-4 p-4">
                {/* Prompt with Image */}
                {task.prompt && (
                  <div className="flex gap-3">
                    {imageUrl && (
                      <div className="bg-muted relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={imageUrl}
                          alt="Input"
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="text-muted-foreground flex-1 text-sm leading-relaxed">
                      {task.prompt}
                    </div>
                  </div>
                )}

                {/* Processing Status */}
                {isPending && (
                  <div className="space-y-2">
                    <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${task.taskInfo ? JSON.parse(task.taskInfo).progress || 0 : 30}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground text-xs">
                        AI is generating your video, this may take a few
                        minutes...
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {task.taskInfo
                          ? `${JSON.parse(task.taskInfo).progress || 0}%`
                          : '0%'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Video Preview */}
                {isSuccess && videoUrl && (
                  <div className="w-full space-y-2 md:w-1/2">
                    <VideoPlayer
                      src={videoUrl}
                      className="h-auto w-full overflow-hidden"
                    />
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-muted text-muted-foreground hover:bg-primary hover:border-primary h-7 px-2 text-xs hover:text-white"
                        onClick={() => handleDownload(task)}
                      >
                        <RiDownloadLine className="mr-1 h-3 w-3" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-muted text-muted-foreground hover:bg-primary hover:border-primary h-7 px-2 text-xs hover:text-white"
                        onClick={() => setDeleteConfirmId(task.id)}
                        disabled={deletingId === task.id}
                      >
                        <RiDeleteBin6Line className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Failed Status */}
                {isFailed && (
                  <div className="w-full space-y-2 md:w-1/2">
                    <div className="bg-muted relative h-48 w-full overflow-hidden rounded-lg">
                      {imageUrl ? (
                        <>
                          <Image
                            src={imageUrl}
                            alt="Failed generation"
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <p className="text-sm font-medium text-red-400">
                              Video generation failed
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center border border-red-500/20 bg-red-500/10">
                          <p className="text-sm text-red-400">
                            Video generation failed
                          </p>
                        </div>
                      )}
                    </div>
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-muted text-muted-foreground hover:bg-primary hover:border-primary h-7 px-2 text-xs hover:text-white"
                        onClick={() => setDeleteConfirmId(task.id)}
                        disabled={deletingId === task.id}
                      >
                        <RiDeleteBin6Line className="h-3 w-3" />
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
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Video</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this video? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
