'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { RiImageAddLine, RiArrowUpLine } from 'react-icons/ri';
import { ZoomIn, Trash2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { ModelSelector } from '../model-selector';
import { VideoOptionsSelector, VideoOptions } from '../video-options-selector';
import ImageEditModal from '../image-edit-modal';
import { ImageToVideoModels } from '@/lib/image-to-video/constants';
import type { ModelOption } from '@/types/image-to-video';
import { toast } from 'sonner';

// Convert models object to array
const MODELS: ModelOption[] = Object.values(ImageToVideoModels);

export function GenerationControlPC({ onGenerationComplete }: { onGenerationComplete?: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODELS[0]);
  const [videoOptions, setVideoOptions] = useState<VideoOptions>({
    duration: 4,
    resolution: '720p',
    aspectRatio: '16:9',
  });
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingImageFile(file);
      setIsEditModalOpen(true);
    }
  };

  const handleEditConfirm = async (processedFile: File) => {
    // Close modal immediately
    setIsEditModalOpen(false);
    setPendingImageFile(null);

    // Show preview and start uploading
    setImagePreviewUrl(URL.createObjectURL(processedFile));
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('files', processedFile);

      const response = await fetch('/api/storage/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      if (result.code !== 0 || !result.data?.urls?.length) {
        throw new Error(result.message || 'Upload failed');
      }

      const uploadedUrl = result.data.urls[0];
      setUploadedImage(processedFile);
      setImagePreviewUrl(uploadedUrl);
      toast.success('Image uploaded successfully');
      console.log('Processed image uploaded:', uploadedUrl);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
      // Reset on error
      setImagePreviewUrl('');
      setUploadedImage(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditClose = () => {
    setIsEditModalOpen(false);
    setPendingImageFile(null);
  };

  const handleImageDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadedImage(null);
    setImagePreviewUrl('');
  };

  const handleImagePreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (imagePreviewUrl) {
      setShowImagePreview(true);
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || !uploadedImage) return;

    const generationParams = {
      model: selectedModel,
      prompt,
      image: uploadedImage,
      imageUrl: imagePreviewUrl,
      videoOptions,
    };

    console.log('Generate with:', generationParams);

    // Call API to generate video
    if (selectedModel.platform === 'kie') {
      try {
        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider: 'kie',
            mediaType: 'video',
            model: selectedModel.id,
            prompt,
            scene: 'image-to-video',
            options: {
              resolution: videoOptions.resolution,
              duration: videoOptions.duration,
              aspectRatio: videoOptions.aspectRatio,
              imageUrl: imagePreviewUrl,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();
        if (result.code === 0) {
          toast.success('Video generation started');
          console.log('Generation task created:', result.data);
          // Call the callback to switch to history tab
          onGenerationComplete?.();
        } else {
          throw new Error(result.message || 'Generation failed');
        }
      } catch (error) {
        console.error('Generation failed:', error);
        toast.error(error instanceof Error ? error.message : 'Generation failed');
      }
    }
  };

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-8">
      <div className="w-full max-w-6xl">
        <div className="bg-background/30 border border-border/80 border-t-border rounded-[32px] p-4 backdrop-blur-xl">
          <div className="space-y-3">
            {/* First Row: Image Upload + Textarea */}
            <div className="flex items-start gap-3">
              {/* Image Upload Button */}
              <div
                className="flex-shrink-0 w-20 h-20 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center hover:border-primary/50 transition-colors cursor-pointer relative overflow-hidden bg-muted/10 group"
                onClick={() => !isUploading && !imagePreviewUrl && document.getElementById('image-input-pc')?.click()}
              >
                {isUploading && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}

                {imagePreviewUrl ? (
                  <div className="relative w-full h-full">
                    <img
                      src={imagePreviewUrl}
                      alt="Uploaded"
                      className="w-full h-full object-contain"
                    />
                    {!isUploading && (
                      <div
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 z-40"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={handleImagePreview}
                          className="bg-black/70 hover:bg-black/90 text-white border-0 w-6 h-6 z-50"
                          title="Zoom to view"
                        >
                          <ZoomIn className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={handleImageDelete}
                          className="bg-black/70 hover:bg-black/90 text-white border-0 w-6 h-6 z-50"
                          title="Delete image"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <RiImageAddLine className="w-7 h-7 text-muted-foreground" />
                )}

                <input
                  id="image-input-pc"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                  disabled={isUploading}
                />
              </div>

              {/* Textarea */}
              <div className="flex-1">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your idea to generate"
                  className="w-full !bg-transparent border-0 outline-none px-4 py-3 text-sm resize-none placeholder:text-muted-foreground focus:ring-0"
                  style={{ background: 'transparent' }}
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.metaKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
              </div>
            </div>

            {/* Second Row: Control Buttons */}
            <div className="flex items-center gap-2">
              {/* Model Selector */}
              <ModelSelector
                models={MODELS}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />

              {/* Video Options */}
              <VideoOptionsSelector
                value={videoOptions}
                onChange={setVideoOptions}
                selectedModel={selectedModel}
              />

              {/* More Options */}
              <Button
                variant="outline"
                size="sm"
                className="bg-background border-border text-sm h-9 px-3"
              >
                ⋯
              </Button>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Credits */}
              <div className="text-sm text-muted-foreground px-3">
                10 Credits
              </div>

              {/* Submit Button */}
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white h-9 w-9 p-0"
                onClick={handleSubmit}
                disabled={!prompt.trim() || !uploadedImage || isUploading}
              >
                <RiArrowUpLine className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Edit Modal */}
      <ImageEditModal
        isOpen={isEditModalOpen}
        imageFile={pendingImageFile}
        onClose={handleEditClose}
        onConfirm={handleEditConfirm}
      />

      {/* Image zoom preview modal */}
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-4">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center max-h-[80vh]">
            <img
              src={imagePreviewUrl}
              alt="Image preview"
              className="max-w-full max-h-full object-contain rounded-md"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
