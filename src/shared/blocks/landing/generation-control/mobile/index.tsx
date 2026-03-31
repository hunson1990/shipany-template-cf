'use client';

import { useEffect, useState } from 'react';
import { ImageToVideoModels } from '@/lib/image-to-video/constants';
import { calculateRequiredCredits } from '@/lib/image-to-video/credits';
import type { ModelOption } from '@/types/image-to-video';
import { Loader2, Trash2, ZoomIn } from 'lucide-react';
import { RiCoinsLine, RiImageAddLine, RiMagicLine } from 'react-icons/ri';
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

const MODELS: ModelOption[] = Object.values(ImageToVideoModels);

export function GenerationControlMobile({
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
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODELS[0]);
  const [prompt, setPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreviewUrlState, setImagePreviewUrlState] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [resolution, setResolution] = useState<string>(
    selectedModel.resolution[0]
  );
  const [duration, setDuration] = useState<number>(selectedModel.duration[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [costCredits, setCostCredits] = useState<number>(0);

  // Update cost credits when model, resolution, or duration change
  useEffect(() => {
    const newCost = calculateRequiredCredits(
      selectedModel,
      resolution,
      duration
    );
    setCostCredits(newCost);
  }, [selectedModel, resolution, duration]);

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

  // Open edit modal when coming from homepage (only on mobile)
  useEffect(() => {
    if (
      shouldOpenEditModal &&
      deviceType === 'mobile' &&
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

  const handleModelChange = (model: ModelOption) => {
    setSelectedModel(model);
    setResolution(model.resolution[0]);
    setDuration(model.duration[0]);
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

  const handleCreate = async () => {
    // Check if user is logged in
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    if (!uploadedImage || !prompt.trim()) return;

    setIsCreating(true);

    const generationParams = {
      model: selectedModel,
      prompt,
      image: uploadedImage,
      imageUrl: imagePreviewUrl,
      resolution,
      duration,
    };

    console.log('Create with:', generationParams);

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
            resolution,
            duration,
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
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {/* Model Selection */}
        <div>
          <label className="mb-1 block text-sm font-medium">Model</label>
          <ModelSelector
            models={MODELS}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            dropdownDirection="down"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="mb-1 block text-sm font-medium">Image</label>
          <div
            className="border-muted-foreground/30 hover:border-primary/50 bg-muted/10 relative h-40 w-full cursor-pointer overflow-hidden rounded-lg border-2 border-dashed text-center transition-colors"
            onClick={() =>
              !isUploading &&
              !imagePreviewUrlState &&
              document.getElementById('image-input-mobile')?.click()
            }
          >
            {isUploading && (
              <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center">
                <Loader2 className="text-primary h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm">Uploading...</span>
              </div>
            )}

            {imagePreviewUrlState ? (
              <div className="group relative h-full w-full">
                <img
                  src={imagePreviewUrlState}
                  alt="Uploaded"
                  className="h-full w-full object-contain"
                />
                {/* Image operation buttons */}
                {!isUploading && (
                  <div
                    className="absolute top-1/2 left-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 transform space-x-2 opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={handleImagePreview}
                      className="z-50 h-8 w-8 border-0 bg-black/70 text-white hover:bg-black/90"
                      title="Zoom to view"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={handleImageDelete}
                      className="z-50 h-8 w-8 border-0 bg-black/70 text-white hover:bg-black/90"
                      title="Delete image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <RiImageAddLine className="text-muted-foreground mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-sm">
                  Click to upload an image
                </p>
              </div>
            )}
            <input
              id="image-input-mobile"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
              disabled={isUploading}
            />
          </div>
          <p className="text-muted-foreground/60 mt-1 text-xs">
            Upload JPG/PNG/WEBP images up to 10MB, with a minimum width/height
            of 300px.
          </p>
        </div>

        {/* Prompt */}
        <div>
          <label className="mb-1 block text-sm font-medium">Prompt</label>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What do you want to create with this image?"
              className="bg-muted/20 border-border focus:ring-primary w-full resize-none rounded-lg border p-3 text-sm focus:ring-1 focus:outline-none"
              rows={4}
            />
            <span className="text-muted-foreground/60 absolute right-3 bottom-2 text-xs">
              {prompt.length} / 2000
            </span>
          </div>
        </div>

        {/* Resolution */}
        <div>
          <label className="mb-1 block text-sm font-medium">Resolution</label>
          <div className="flex gap-2">
            {selectedModel.resolution.map((res) => (
              <Button
                key={res}
                variant={resolution === res ? 'default' : 'outline'}
                size="sm"
                onClick={() => setResolution(res)}
                className="flex-1 text-xs"
              >
                {res}
              </Button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="mb-1 block text-sm font-medium">Duration</label>
          <div className="flex gap-2">
            {selectedModel.duration.map((dur) => (
              <Button
                key={dur}
                variant={duration === dur ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDuration(dur)}
                className="flex-1 text-xs"
              >
                {dur}s
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section - Credits and Create Button (Fixed) */}
      <div className="border-border bg-background fixed right-0 bottom-0 left-0 space-y-2 border-t p-3">
        {/* Credits */}
        <div className="bg-muted/20 flex items-center justify-between rounded-lg p-3">
          <div className="flex items-center gap-2">
            <RiCoinsLine className="h-4 w-4 text-yellow-500" />
            <span className="text-muted-foreground/90 text-sm">
              Credits required:
            </span>
          </div>
          <span className="text-muted-foreground/90 text-sm font-medium">
            {costCredits} Credits
          </span>
        </div>

        {/* Create Button */}
        <Button
          onClick={handleCreate}
          disabled={
            !uploadedImage || !prompt.trim() || isUploading || isCreating
          }
          className="bg-primary hover:bg-primary/90 h-10 w-full text-white"
        >
          <RiMagicLine className="mr-2 h-4 w-4" />
          {isCreating ? 'Creating...' : 'Create'}
        </Button>
      </div>

      {/* Image Edit Modal */}
      <ImageEditModal
        isOpen={isEditModalOpen}
        imageFile={pendingImageFile}
        existingImageUrl={
          pendingImageFile ? undefined : (imagePreviewUrl ?? undefined)
        }
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
