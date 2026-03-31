'use client';

import { useEffect, useState } from 'react';
import { ImageToVideoModels } from '@/lib/image-to-video/constants';
import { calculateRequiredCredits } from '@/lib/image-to-video/credits';
import type { ModelOption } from '@/types/image-to-video';
import { Loader2, Trash2, ZoomIn } from 'lucide-react';
import { RiArrowUpLine, RiImageAddLine } from 'react-icons/ri';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useImageUpload } from '@/shared/context/ImageUploadContext';
import { useAppContext } from '@/shared/contexts/app';

import ImageEditModal from '../image-edit-modal';
import { ModelSelector } from '../model-selector';
import { VideoOptions, VideoOptionsSelector } from '../video-options-selector';

// Convert models object to array
const MODELS: ModelOption[] = Object.values(ImageToVideoModels);

export function GenerationControlPC({
  onGenerationComplete,
  forceModelId,
  onModelForced,
}: {
  onGenerationComplete?: () => void;
  forceModelId?: string | null;
  onModelForced?: () => void;
}) {
  const {
    imageFile,
    imagePreviewUrl,
    shouldOpenEditModal,
    initialPrompt,
    deviceType,
    closeEditModal,
  } = useImageUpload();
  const { user, setIsShowSignModal, setIsShowPaymentModal } = useAppContext();
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODELS[0]);
  const [videoOptions, setVideoOptions] = useState<VideoOptions>({
    duration: 4,
    resolution: '720p',
    aspectRatio: '16:9',
  });
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreviewUrlState, setImagePreviewUrlState] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [costCredits, setCostCredits] = useState<number>(0);

  // Update cost credits when model or video options change
  useEffect(() => {
    const newCost = calculateRequiredCredits(
      selectedModel,
      videoOptions.resolution,
      videoOptions.duration
    );
    setCostCredits(newCost);
  }, [selectedModel, videoOptions]);

  // Force model change when forceModelId is set
  useEffect(() => {
    if (forceModelId) {
      const targetModel = MODELS.find((m) => m.id === forceModelId);
      if (targetModel) {
        setSelectedModel(targetModel);

      }
      onModelForced?.();
    }
  }, [forceModelId, onModelForced]);

  // Open edit modal when coming from homepage (only on PC)
  useEffect(() => {
    if (
      shouldOpenEditModal &&
      deviceType === 'pc' &&
      imageFile &&
      imagePreviewUrl
    ) {
      setIsEditModalOpen(true);
      setPendingImageFile(imageFile);
      setPrompt(initialPrompt);
    }
  }, [
    shouldOpenEditModal,
    deviceType,
    imageFile,
    imagePreviewUrl,
    initialPrompt,
  ]);

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
    closeEditModal();
    setPendingImageFile(null);

    // Show preview and start uploading
    const previewUrl = URL.createObjectURL(processedFile);
    setImagePreviewUrlState(previewUrl);
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
      // 只有上传成功后才设置 uploadedImage，这样生成时才会用远程 URL
      setUploadedImage(processedFile);
      setImagePreviewUrlState(uploadedUrl);
      toast.success('Image uploaded successfully');
      console.log('Processed image uploaded:', uploadedUrl);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
      // Reset on error
      setImagePreviewUrlState('');
      setUploadedImage(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditClose = () => {
    setIsEditModalOpen(false);
    closeEditModal();
    setPendingImageFile(null);
  };

  const handleImageDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadedImage(null);
    setImagePreviewUrlState('');
  };

  const handleImagePreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (imagePreviewUrlState) {
      setShowImagePreview(true);
    }
  };

  const handleSubmit = async () => {
    // Check if user is logged in
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    if (!prompt.trim() || !uploadedImage) return;

    setIsCreating(true);

    const generationParams = {
      model: selectedModel,
      prompt,
      image: uploadedImage,
      imageUrl: imagePreviewUrlState,
      videoOptions,
    };

    console.log('Generate with:', generationParams);

    // Call API to generate video
    const provider =
      selectedModel.platform === 'kie' || selectedModel.platform === 'pollo'
        ? selectedModel.platform
        : undefined;

    if (!provider) {
      setIsCreating(false);
      toast.error(`Unsupported model platform: ${selectedModel.platform}`);
      return;
    }

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          mediaType: 'video',
          model: selectedModel.id,
          prompt,
          scene: 'image-to-video',
          options: {
            resolution: videoOptions.resolution,
            duration: videoOptions.duration,
            aspectRatio: videoOptions.aspectRatio,
            imageUrl: imagePreviewUrlState,
            modelBrand: selectedModel.model_brand,
            modelVersion: selectedModel.model_version,
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
      } else if (
        result.code === -2 ||
        result.message === 'INSUFFICIENT_CREDITS'
      ) {
        toast.error('Insufficient credits. Please top up to keep creating.');
        setIsShowPaymentModal(true);
      } else {
        throw new Error(result.message || 'Generation failed');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Generation failed');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed right-0 bottom-4 left-0 z-50 flex justify-center px-8">
      <div className="w-full max-w-6xl">
        <div className="bg-background/30 border-border/80 border-t-border rounded-[32px] border p-4 backdrop-blur-xl">
          <div className="space-y-3">
            {/* First Row: Image Upload + Textarea */}
            <div className="flex items-start gap-3">
              {/* Image Upload Button */}
              <div
                className="border-muted-foreground/30 hover:border-primary/50 bg-muted/10 group relative flex h-20 w-20 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors"
                onClick={() =>
                  !isUploading &&
                  !imagePreviewUrlState &&
                  document.getElementById('image-input-pc')?.click()
                }
              >
                {isUploading && (
                  <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center">
                    <Loader2 className="text-primary h-4 w-4 animate-spin" />
                  </div>
                )}

                {imagePreviewUrlState ? (
                  <div className="relative h-full w-full">
                    <img
                      src={imagePreviewUrlState}
                      alt="Uploaded"
                      className="h-full w-full object-contain"
                    />
                    {!isUploading && (
                      <div
                        className="absolute inset-0 z-40 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={handleImagePreview}
                          className="z-50 h-6 w-6 border-0 bg-black/70 text-white hover:bg-black/90"
                          title="Zoom to view"
                        >
                          <ZoomIn className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={handleImageDelete}
                          className="z-50 h-6 w-6 border-0 bg-black/70 text-white hover:bg-black/90"
                          title="Delete image"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <RiImageAddLine className="text-muted-foreground h-7 w-7" />
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
                  className="placeholder:text-muted-foreground w-full resize-none border-0 !bg-transparent px-4 py-3 text-sm outline-none focus:ring-0"
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
                className="bg-background border-border h-9 px-3 text-sm"
              >
                ⋯
              </Button>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Credits */}
              <div className="text-muted-foreground px-3 text-sm">
                {costCredits} Credits
              </div>

              {/* Submit Button */}
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 h-9 w-9 p-0 text-white"
                onClick={handleSubmit}
                disabled={
                  !prompt.trim() || !uploadedImage || isUploading || isCreating
                }
              >
                {isCreating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RiArrowUpLine className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Edit Modal */}
      <ImageEditModal
        isOpen={isEditModalOpen}
        imageFile={pendingImageFile}
        existingImageUrl={pendingImageFile ? undefined : imagePreviewUrlState}
        onClose={handleEditClose}
        onConfirm={handleEditConfirm}
      />

      {/* Image zoom preview modal */}
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-h-[90vh] max-w-4xl p-4">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[80vh] items-center justify-center">
            <img
              src={imagePreviewUrlState}
              alt="Image preview"
              className="max-h-full max-w-full rounded-md object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
