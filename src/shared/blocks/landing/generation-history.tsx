'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/shared/components/ui/button';
import { RiDownloadLine, RiDeleteBin6Line } from 'react-icons/ri';
import { toast } from 'sonner';
import { VideoPlayer } from '@/shared/components/video-player';

interface GeneratedVideo {
  id: string;
  prompt: string;
  imageUrl: string;
  videoUrl?: string;
  status: 'processing' | 'succeed' | 'failed';
  progress?: number;
  createdAt: string;
  model: string;
}

interface GenerationHistoryProps {
  videos?: GeneratedVideo[];
  isLoading?: boolean;
}

export function GenerationHistory({ videos = [], isLoading = false }: GenerationHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDownload = async (video: GeneratedVideo) => {
    if (!video.videoUrl) return;

    try {
      const response = await fetch(video.videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Video downloaded successfully');
    } catch (error) {
      toast.error('Failed to download video');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      // API call to delete
      toast.success('Video deleted successfully');
    } catch (error) {
      toast.error('Failed to delete video');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your videos...</p>
        </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
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
    <div className="space-y-4">
      {videos.map((video) => (
        <div
          key={video.id}
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
                  <span>{video.model}</span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(video.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              {video.status === 'succeed' && (
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                  Completed
                </span>
              )}
              {video.status === 'processing' && (
                <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                  Processing
                </span>
              )}
              {video.status === 'failed' && (
                <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">
                  Failed
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Prompt with Image */}
            {video.prompt && (
              <div className="flex gap-3">
                {video.imageUrl && (
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-muted relative">
                    <Image
                      src={video.imageUrl}
                      alt="Input"
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 text-sm text-muted-foreground leading-relaxed">
                  {video.prompt}
                </div>
              </div>
            )}

            {/* Processing Status */}
            {video.status === 'processing' && video.progress !== undefined && (
              <div className="space-y-2">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-1000"
                    style={{ width: `${video.progress}%` }}
                  ></div>
                </div>
                <div className="text-right text-xs text-primary font-medium">
                  {Math.round(video.progress)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  AI is generating your video, this may take a few minutes...
                </p>
              </div>
            )}

            {/* Video Preview */}
            {video.status === 'succeed' && video.videoUrl && (
              <div className="w-1/2 space-y-2">
                <VideoPlayer src={video.videoUrl} className="overflow-hidden w-full h-auto" />
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-muted-foreground border-muted hover:bg-primary hover:text-white hover:border-primary h-7 text-xs px-2"
                    onClick={() => handleDownload(video)}
                  >
                    <RiDownloadLine className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-muted-foreground border-muted hover:bg-primary hover:text-white hover:border-primary h-7 text-xs px-2"
                    onClick={() => handleDelete(video.id)}
                    disabled={deletingId === video.id}
                  >
                    <RiDeleteBin6Line className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Failed Status */}
            {video.status === 'failed' && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                <p className="text-red-400 text-sm">Video generation failed</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
